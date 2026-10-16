import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const usuario = "10000000-0000-4000-8000-000000000001";
const refugio = "20000000-0000-4000-8000-000000000001";
const animal = "30000000-0000-4000-8000-000000000001";
const privadas = ["reportes_publicaciones", "alertas_adopcion", "envios_alertas_adopcion"];

beforeAll(async () => {
  const esquema = readFileSync("supabase/schema.sql", "utf8");
  const base = esquema.slice(esquema.indexOf("create table usuarios"), esquema.indexOf("-- ============ CAMPAÑAS"));
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;`);
  await db.exec(base);
  await db.exec(`alter table animales enable row level security;
    ${esquema.match(/create policy "animales visibles"[\s\S]*?;/)![0]}`);
  await db.exec(readFileSync("supabase/migracion-comunidad.sql", "utf8"));
  await db.query("insert into usuarios(id,email,nombre) values ($1,'local@example.invalid','Prueba local')", [usuario]);
  await db.query("insert into refugios(id,nombre,slug,ciudad,provincia) values ($1,'Prueba','prueba','Avellaneda','Buenos Aires')", [refugio]);
  for (const [indice, estado] of ["disponible", "en_proceso", "adoptado", "pendiente", "rechazado", "borrador"].entries()) {
    await db.query(`insert into animales(id,refugio_id,nombre,slug,especie,tipo,estado,ciudad,provincia,lat_aprox,lng_aprox,edad_meses,castrado)
      values ($1,$2,'Prueba',$3,$4,'adopcion',$5,'Avellaneda','Buenos Aires',$6,-58.4,24,true)`,
    [`30000000-0000-4000-8000-00000000000${indice + 1}`, refugio, `prueba-${indice}`, indice === 1 ? "gato" : "perro", estado, -34.6 + indice * 0.01]);
  }
}, 20000);

afterAll(async () => { await db.close(); });

describe("Migración de comunidad en Postgres local", () => {
  for (const tabla of privadas) {
    for (const rol of ["anon", "authenticated"]) {
      it(`${rol} no puede leer ni escribir ${tabla}`, async () => {
        await db.exec(`set role ${rol}`);
        try {
          for (const sql of [`select * from ${tabla}`, `insert into ${tabla} default values`,
            `update ${tabla} set creado_el=now()`, `delete from ${tabla}`]) {
            await expect(db.query(sql)).rejects.toMatchObject({ code: "42501" });
          }
        } finally { await db.exec("reset role"); }
      });
    }
  }

  it("service_role puede registrar reportes y deduplica por usuario y animal", async () => {
    await db.exec("set role service_role");
    try {
      const sql = "insert into reportes_publicaciones(animal_id,usuario_id,motivo,detalle) values ($1,$2,'fraude','Detalle de prueba local')";
      await db.query(sql, [animal, usuario]);
      await expect(db.query(sql, [animal, usuario])).rejects.toMatchObject({ code: "23505" });
    } finally { await db.exec("reset role"); }
  });

  it("rechaza motivos, detalles, especies y provincias inválidas", async () => {
    await expect(db.query("insert into reportes_publicaciones(animal_id,usuario_id,motivo,detalle) values ($1,$2,'invalido','Texto suficientemente largo')", [animal, usuario])).rejects.toMatchObject({ code: "23514" });
    await expect(db.query("insert into reportes_publicaciones(animal_id,usuario_id,motivo,detalle) values ($1,$2,'otro','corto')", [animal, usuario])).rejects.toMatchObject({ code: "23514" });
    await expect(db.query("insert into alertas_adopcion(usuario_id,especie) values ($1,'invalida')", [usuario])).rejects.toMatchObject({ code: "23514" });
    await expect(db.query("insert into alertas_adopcion(usuario_id,provincia) values ($1,'  ')", [usuario])).rejects.toMatchObject({ code: "23514" });
  });

  it("mantiene una alerta por usuario y un envío por animal", async () => {
    const alerta = await db.query<{ id: string }>("insert into alertas_adopcion(usuario_id,especie) values ($1,'perro') returning id", [usuario]);
    await expect(db.query("insert into alertas_adopcion(usuario_id) values ($1)", [usuario])).rejects.toMatchObject({ code: "23505" });
    await db.query("insert into envios_alertas_adopcion(alerta_id,animal_id) values ($1,$2)", [alerta.rows[0].id, animal]);
    await expect(db.query("insert into envios_alertas_adopcion(alerta_id,animal_id) values ($1,$2)", [alerta.rows[0].id, animal])).rejects.toMatchObject({ code: "23505" });
  });

  it("RLS sigue bloqueando las tablas privadas aunque alguien vuelva a otorgar permisos", async () => {
    for (const tabla of privadas) {
      await db.exec(`grant all on ${tabla} to anon; set role anon;`);
      try {
        expect((await db.query(`select * from ${tabla}`)).rows).toEqual([]);
        expect((await db.query(`update ${tabla} set creado_el=now() returning *`)).rows).toEqual([]);
        expect((await db.query(`delete from ${tabla} returning *`)).rows).toEqual([]);
        await expect(db.query(`insert into ${tabla} default values`)).rejects.toMatchObject({ code: "42501" });
      } finally { await db.exec(`reset role; revoke all on ${tabla} from anon;`); }
    }
  });

  it("el conteo público solo incluye disponibles", async () => {
    await db.exec("set role anon");
    try {
      expect((await db.query("select * from contar_animales_por_refugio()")).rows).toEqual([{ refugio_id: refugio, total: 1 }]);
    } finally { await db.exec("reset role"); }
  });

  it("cercanía excluye borradores, pendientes, bajas y adoptados; respeta radio y filtros", async () => {
    await db.exec("set role anon");
    try {
      const buscar = (radio: number, filtros = {}) => db.query<{ datos: { especie: string }; distancia_km: number }>(
        "select * from buscar_animales_cercanos(-34.6,-58.4,$1,$2)", [radio, JSON.stringify(filtros)]);
      const todos = await buscar(25);
      expect(todos.rows).toHaveLength(2);
      expect(todos.rows[0].distancia_km).toBeCloseTo(0, 3);
      expect((await buscar(0.1)).rows).toHaveLength(1);
      expect((await buscar(25, { especie: "gato", edad: "adulto", castrado: "si" })).rows).toHaveLength(1);
      expect((await buscar(25, { provincia: "Córdoba" })).rows).toHaveLength(0);
      expect((await buscar(25, { edad: "cachorro" })).rows).toHaveLength(0);
      expect((await buscar(25, { q: "Prueba" })).rows).toHaveLength(2);
      expect((await db.query("select * from buscar_animales_cercanos(200,-58.4,25)")).rows).toHaveLength(0);
    } finally { await db.exec("reset role"); }
  });

  it("las RPC respetan RLS, incluso si hay otros animales disponibles que la política oculta", async () => {
    await db.exec(`create policy "restriccion prueba" on animales as restrictive for select using (nombre <> 'Oculto');
      insert into animales(refugio_id,nombre,slug,especie,tipo,estado,ciudad,provincia,lat_aprox,lng_aprox)
        values ('${refugio}','Oculto','oculto','perro','adopcion','disponible','Avellaneda','Buenos Aires',-34.6,-58.4);
      set role anon;`);
    try {
      expect((await db.query("select * from contar_animales_por_refugio()")).rows).toEqual([{ refugio_id: refugio, total: 1 }]);
      expect((await db.query("select * from buscar_animales_cercanos(-34.6,-58.4,25)")).rows).toHaveLength(2);
    } finally {
      await db.exec("reset role; drop policy \"restriccion prueba\" on animales; delete from animales where slug='oculto';");
    }
  });

  it("limita a las 100 coincidencias más cercanas", async () => {
    await db.exec(`insert into animales(nombre,slug,especie,tipo,estado,ciudad,provincia,lat_aprox,lng_aprox)
      select 'Carga local', 'carga-' || n, 'perro','adopcion','disponible','Avellaneda','Buenos Aires',-34.6+n*0.0001,-58.4 from generate_series(1,120) n;`);
    const resultado = await db.query<{ distancia_km: number }>("select * from buscar_animales_cercanos(-34.6,-58.4,25)");
    expect(resultado.rows).toHaveLength(100);
    expect(resultado.rows.map((r) => r.distancia_km)).toEqual(resultado.rows.map((r) => r.distancia_km).sort((a,b) => a-b));
  });
});
