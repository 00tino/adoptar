import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usuario: vi.fn(), activo: vi.fn(), admin: vi.fn(), limite: vi.fn(), from: vi.fn(),
  revalidar: vi.fn(), revalidarTag: vi.fn(), notificar: vi.fn(), email: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mocks.from }) }));
vi.mock("../usuarios", () => ({ asegurarUsuario: mocks.usuario, exigirUsuarioActivo: mocks.activo }));
vi.mock("../auth", () => ({ esAdmin: mocks.admin }));
vi.mock("../limites", () => ({ limitarPorIp: mocks.limite, campoTexto: (v: unknown, max: number) => String(v ?? "").trim().slice(0, max) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidar, revalidateTag: mocks.revalidarTag }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../alertas-adopcion", () => ({ notificarAlertasAdopcion: vi.fn() }));
vi.mock("../emails", () => ({ emailEstadoPostulacion: mocks.email, emailNuevaPostulacion: mocks.email, emailPostulacionRecibida: mocks.email }));
vi.mock("../notificaciones", () => ({ crearNotificacion: mocks.notificar }));
vi.mock("../datos", () => ({ filaAAnimal: (f: unknown) => f }));

import { reportarPublicacion, listarReportes, resolverReporte } from "../acciones-reportes";
import { guardarAlertaAdopcion, miAlertaAdopcion } from "../acciones-alertas-adopcion";
import { alternarFavorito } from "../acciones-favoritos";
import { misPostulaciones, postularAdopcion } from "../acciones-adopcion";
import { actualizarPerfilRefugio, cambiarEstadoPostulacion } from "../acciones-refugio";
import { decidirRefugio } from "../acciones-admin";
import { cambiarEstadoRefugioAdmin } from "../acciones-admin-gestion";

const usuario = { id: "usuario-a", nombre: "Prueba", email: "test@example.invalid", suspendido: false };
const animalId = "30000000-0000-4000-8000-000000000001";
const consultas: { tabla: string; cadena: ReturnType<typeof cadena> }[] = [];
const respuestas: { data?: unknown; error?: unknown; count?: number }[] = [];
function cadena(respuesta: object) {
  const c = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    then: (ok: (valor: object) => unknown, mal: (error: unknown) => unknown) => Promise.resolve(respuesta).then(ok, mal),
  };
  return c;
}
const formulario = (campos: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => fd.set(clave, valor));
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  consultas.length = 0; respuestas.length = 0;
  mocks.usuario.mockResolvedValue(usuario); mocks.activo.mockResolvedValue(usuario); mocks.admin.mockResolvedValue(true);
  mocks.from.mockImplementation((tabla: string) => {
    const c = cadena(respuestas.shift() ?? { data: null, error: null });
    consultas.push({ tabla, cadena: c });
    return c;
  });
});

describe("Reportes y alertas con autorización en servidor", () => {
  it("no permite reportar sin sesión ni desde una cuenta suspendida", async () => {
    mocks.activo.mockRejectedValue(new Error("Sin sesión"));
    expect(await reportarPublicacion({}, formulario({ animal_id: animalId, motivo: "fraude", detalle: "Detalle suficientemente largo" }))).toHaveProperty("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rechaza motivos falsos y detalles vacíos", async () => {
    expect(await reportarPublicacion({}, formulario({ animal_id: animalId, motivo: "falso" }))).toHaveProperty("error");
    expect(await reportarPublicacion({}, formulario({ animal_id: animalId, motivo: "fraude", detalle: "corto" }))).toHaveProperty("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("no admite reportar borradores ni publicaciones inexistentes", async () => {
    respuestas.push({ data: null });
    expect(await reportarPublicacion({}, formulario({ animal_id: animalId, motivo: "fraude", detalle: "Detalle suficientemente largo" }))).toHaveProperty("error");
    expect(consultas[0].cadena.in).toHaveBeenCalledWith("estado", ["disponible", "en_proceso", "adoptado"]);
    expect(consultas).toHaveLength(1);
  });
  it("usa el usuario autenticado y deduplica el reporte", async () => {
    respuestas.push({ data: { id: animalId } }, { error: null });
    expect(await reportarPublicacion({}, formulario({ animal_id: animalId, usuario_id: "otro", motivo: "fraude", detalle: "Detalle suficientemente largo" }))).toHaveProperty("mensaje");
    expect(consultas[1].cadena.upsert).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: usuario.id }), { onConflict: "animal_id,usuario_id", ignoreDuplicates: true });
  });
  it("no muestra éxito si Supabase rechaza el reporte", async () => {
    respuestas.push({ data: { id: animalId } }, { error: new Error("Sin tabla") });
    expect(await reportarPublicacion({}, formulario({ animal_id: animalId, motivo: "fraude", detalle: "Detalle suficientemente largo" }))).toHaveProperty("error");
    expect(mocks.revalidar).not.toHaveBeenCalled();
  });
  it("protege lectura y resolución de reportes con admin", async () => {
    mocks.admin.mockResolvedValue(false);
    await expect(listarReportes()).rejects.toThrow("administrador");
    await expect(resolverReporte(formulario({ id: "reporte", estado: "resuelto" }))).rejects.toThrow("administrador");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rechaza estados de revisión no permitidos", async () => {
    await expect(resolverReporte(formulario({ id: "reporte", estado: "disponible" }))).rejects.toThrow("Estado inválido");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("limita los reportes a la página solicitada", async () => {
    respuestas.push({ data: [], count: 0 });
    await listarReportes(2);
    expect(consultas[0].cadena.range).toHaveBeenCalledWith(20, 39);
    expect(consultas[0].cadena.eq).toHaveBeenCalledWith("estado", "pendiente");
  });
  it("la alerta pertenece siempre al usuario autenticado y se puede pausar", async () => {
    expect(await guardarAlertaAdopcion({}, formulario({ usuario_id: "otro", especie: "gato", provincia: "Buenos Aires" }))).toHaveProperty("mensaje", expect.stringContaining("pausada"));
    expect(consultas[0].cadena.upsert).toHaveBeenCalledWith({ usuario_id: usuario.id, especie: "gato", provincia: "Buenos Aires", activa: false }, { onConflict: "usuario_id" });
  });
  it("valida especies y evita operadores en la provincia", async () => {
    expect(await guardarAlertaAdopcion({}, formulario({ especie: "falso" }))).toHaveProperty("error");
    expect(await guardarAlertaAdopcion({}, formulario({ provincia: "%,estado.eq.pendiente" }))).toHaveProperty("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("solo consulta la alerta propia y muestra errores de base", async () => {
    respuestas.push({ error: new Error("Falla") });
    await expect(miAlertaAdopcion()).rejects.toThrow("cargar");
    expect(consultas[0].cadena.eq).toHaveBeenCalledWith("usuario_id", usuario.id);
  });
});

describe("Actualización de la caché pública de refugios", () => {
  it("invalida el listado y las fichas después de aprobar o suspender desde la cola", async () => {
    respuestas.push({ data: { nombre: "Refugio", email: null, usuario_id: null } });
    await decidirRefugio(formulario({ id: "refugio", decision: "aprobar" }));
    expect(mocks.revalidarTag).toHaveBeenCalledWith("refugios-publicos", { expire: 0 });
  });
  it("invalida los datos públicos después de cambiar el estado desde gestión", async () => {
    respuestas.push({ data: { nombre: "Refugio", usuario_id: null } });
    await cambiarEstadoRefugioAdmin(formulario({ id: "refugio", estado: "suspendido" }));
    expect(mocks.revalidarTag).toHaveBeenCalledWith("refugios-publicos", { expire: 0 });
  });
  it("muestra el perfil editado por su propietario sin esperar el TTL", async () => {
    respuestas.push({ data: { id: "refugio", slug: "refugio", nombre: "Refugio", estado: "verificado", fotos: [] } }, { error: null });
    await actualizarPerfilRefugio(formulario({ descripcion: "Nueva descripción" }));
    expect(mocks.revalidarTag).toHaveBeenCalledWith("refugios-publicos", { expire: 0 });
    expect(consultas[1].cadena.eq).toHaveBeenCalledWith("id", "refugio");
  });
  it("no invalida ni modifica nada si falta permiso de administrador", async () => {
    mocks.admin.mockResolvedValue(false);
    await expect(decidirRefugio(formulario({ id: "refugio", decision: "aprobar" }))).rejects.toThrow("administrador");
    await expect(cambiarEstadoRefugioAdmin(formulario({ id: "refugio", estado: "suspendido" }))).rejects.toThrow("administrador");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidarTag).not.toHaveBeenCalled();
  });
  it("no confirma actualización de caché si falla la escritura", async () => {
    respuestas.push({ error: { message: "Sin conexión" } });
    await expect(cambiarEstadoRefugioAdmin(formulario({ id: "refugio", estado: "suspendido" }))).rejects.toThrow("Sin conexión");
    expect(mocks.revalidarTag).not.toHaveBeenCalled();
  });
});

describe("Favoritos y postulaciones", () => {
  it("guardar dos veces usa la misma clave idempotente sin leer antes", async () => {
    const fd = formulario({ animal_id: animalId, fav: "1" });
    await alternarFavorito(fd); await alternarFavorito(fd);
    for (const c of consultas) {
      expect(c.cadena.upsert).toHaveBeenCalledWith({ usuario_id: usuario.id, animal_id: animalId }, { onConflict: "usuario_id,animal_id", ignoreDuplicates: true });
      expect(c.cadena.select).not.toHaveBeenCalled();
    }
  });
  it("quitar dos veces solo elimina el favorito propio", async () => {
    const fd = formulario({ animal_id: animalId, fav: "0" });
    await alternarFavorito(fd); await alternarFavorito(fd);
    for (const c of consultas) {
      expect(c.cadena.eq).toHaveBeenCalledWith("usuario_id", usuario.id);
      expect(c.cadena.eq).toHaveBeenCalledWith("animal_id", animalId);
    }
  });
  it("propaga un error al guardar favoritos para revertir el optimismo", async () => {
    respuestas.push({ error: new Error("Sin conexión") });
    await expect(alternarFavorito(formulario({ animal_id: animalId, fav: "1" }))).rejects.toThrow("actualizar");
  });
  it("sin sesión no consulta postulaciones", async () => {
    mocks.usuario.mockResolvedValue(null);
    expect(await misPostulaciones()).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("mapea todos los estados y consulta solo las postulaciones propias", async () => {
    respuestas.push({ data: ["postulado", "en_proceso", "aceptada", "rechazada"].map((estado) => ({ id: estado, estado, creado_el: "2026-10-16", animales: [{ nombre: "Luna", slug: "luna" }] })) });
    const filas = await misPostulaciones();
    expect(filas.map((p) => p.estado)).toEqual(["postulado", "en_proceso", "aceptada", "rechazada"]);
    expect(filas[0].animalSlug).toBe("luna");
    expect(consultas[0].cadena.eq).toHaveBeenCalledWith("usuario_id", usuario.id);
  });
  for (const estado of ["borrador", "pendiente", "rechazado", "adoptado"]) {
    it(`no permite postularse a un animal ${estado}`, async () => {
      respuestas.push({ data: { id: animalId, estado } });
      await expect(postularAdopcion(formulario({ animal_id: animalId, nombre: "Prueba", email: usuario.email }))).rejects.toThrow("no recibe");
      expect(consultas).toHaveLength(1);
      expect(mocks.email).not.toHaveBeenCalled();
    });
  }
  it("no permite gestionar postulaciones de otro refugio", async () => {
    respuestas.push({ data: { id: "refugio-propio", estado: "verificado" } },
      { data: { animal_id: animalId, animales: { refugio_id: "otro-refugio" } } });
    await expect(cambiarEstadoPostulacion(formulario({ id: "postulacion-ajena", estado: "aceptada" }))).rejects.toThrow("no es de tu refugio");
    expect(consultas.every((c) => c.cadena.update.mock.calls.length === 0)).toBe(true);
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("no admite inventar estados de postulación", async () => {
    respuestas.push({ data: { id: "refugio-propio", estado: "verificado" } });
    await expect(cambiarEstadoPostulacion(formulario({ id: "postulacion", estado: "falso" }))).rejects.toThrow("Estado inválido");
    expect(consultas).toHaveLength(1);
  });
  for (const estado of ["postulado", "en_proceso", "aceptada", "rechazada"]) {
    it(`el refugio puede guardar ${estado} en su propia postulación`, async () => {
      respuestas.push({ data: { id: "refugio-propio", estado: "verificado" } },
        { data: { animal_id: animalId, nombre: "Prueba", email: usuario.email, usuario_id: usuario.id, animales: { refugio_id: "refugio-propio", nombre: "Luna" } } },
        { error: null });
      await cambiarEstadoPostulacion(formulario({ id: "postulacion", estado }));
      expect(consultas[2].cadena.update).toHaveBeenCalledWith({ estado });
      if (estado === "postulado") expect(mocks.email).not.toHaveBeenCalled();
      else expect(mocks.email).toHaveBeenCalledWith(usuario.email, "Prueba", "Luna", estado);
    });
  }
  it("usa el slug guardado en la base al confirmar una postulación", async () => {
    respuestas.push({ data: { id: animalId, nombre: "Luna", slug: "luna-real", estado: "disponible", refugios: { usuario_id: "publicador", email: "refugio@example.invalid" } } },
      { error: null }, { error: null });
    await postularAdopcion(formulario({ animal_id: animalId, nombre: "Prueba", email: usuario.email, slug: "otro-sitio" }));
    expect(mocks.redirect).toHaveBeenCalledWith("/animales/luna-real?postulado=1");
    expect(consultas[1].cadena.insert).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: usuario.id, animal_id: animalId }));
  });
});
