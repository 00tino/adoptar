import type { Metadata } from "next";
import Link from "next/link";
import {
  cambiarEstadoAnimalAdmin,
  listarAnimalesAdmin,
} from "@/lib/acciones-admin-gestion";
import { FILAS_POR_PAGINA } from "@/lib/constantes-admin";

export const metadata: Metadata = {
  title: "Animales — Admin",
  robots: { index: false, follow: false },
};

const ESTADOS = ["pendiente", "disponible", "en_proceso", "adoptado", "rechazado"];
const ESPECIES = ["perro", "gato", "otro"];
const TIPOS = ["adopcion", "transito"];

export default async function PaginaAnimalesAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    especie?: string;
    tipo?: string;
    q?: string;
    pagina?: string;
    editado?: string;
  }>;
}) {
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const { filas, total } = await listarAnimalesAdmin({
    estado: params.estado,
    especie: params.especie,
    tipo: params.tipo,
    q: params.q,
    pagina,
  });
  const paginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));

  const linkPagina = (p: number) => {
    const url = new URLSearchParams();
    for (const clave of ["estado", "especie", "tipo", "q"] as const) {
      if (params[clave]) url.set(clave, params[clave]!);
    }
    url.set("pagina", String(p));
    return `/admin/animales?${url.toString()}`;
  };

  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">
        Animales <span className="text-tinta-suave text-lg">({total})</span>
      </h2>

      {params.editado && (
        <p className="mt-3 rounded-xl bg-salvia/20 px-4 py-2 text-sm font-bold text-salvia-oscuro">
          ✓ Cambios guardados.
        </p>
      )}

      {/* Filtros */}
      <form action="/admin/animales" method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <Selector nombre="estado" etiqueta="Estado" opciones={ESTADOS} valor={params.estado} />
        <Selector nombre="especie" etiqueta="Especie" opciones={ESPECIES} valor={params.especie} />
        <Selector nombre="tipo" etiqueta="Tipo" opciones={TIPOS} valor={params.tipo} />
        <div>
          <label htmlFor="q" className="block text-xs font-bold text-tinta-suave">Buscar</label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={params.q}
            placeholder="Nombre, slug o ciudad…"
            className="mt-1 rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-tinta text-crema px-5 py-2 text-sm font-bold hover:bg-tinta/80 transition-colors"
        >
          Filtrar
        </button>
      </form>

      {/* Listado */}
      <div className="mt-4 space-y-3">
        {filas.length === 0 && (
          <div className="rounded-2xl bg-crema-2/60 p-10 text-center text-tinta-suave">
            No hay animales con esos filtros.
          </div>
        )}
        {filas.map((a) => (
          <div
            key={a.id}
            className="rounded-2xl bg-blanco-calido border-2 border-crema-2 px-5 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">
                  🐾 {a.nombre}{" "}
                  <Etiqueta estado={a.estado} />
                </p>
                <p className="text-sm text-tinta-suave">
                  {a.especie} · {a.tipo === "transito" ? "tránsito" : "adopción"} ·{" "}
                  {a.ciudad}, {a.provincia} · publica {a.publica} ·{" "}
                  {new Date(a.creadoEl).toLocaleDateString("es-AR")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={cambiarEstadoAnimalAdmin} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <select
                    name="estado"
                    defaultValue={a.estado}
                    className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-2 py-1.5 text-sm"
                    aria-label={`Estado de ${a.nombre}`}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>{e.replace("_", " ")}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-full border-2 border-crema-2 px-3 py-1.5 text-sm font-bold hover:border-tinta transition-colors"
                  >
                    Cambiar
                  </button>
                </form>
                <Link
                  href={`/admin/animales/${a.id}/editar`}
                  className="rounded-full border-2 border-crema-2 px-3 py-1.5 text-sm font-bold hover:border-terracota hover:text-terracota-oscuro transition-colors"
                >
                  Editar
                </Link>
                <Link
                  href={`/animales/${a.slug}`}
                  className="rounded-full border-2 border-crema-2 px-3 py-1.5 text-sm font-bold hover:border-terracota hover:text-terracota-oscuro transition-colors"
                >
                  Ver ficha →
                </Link>
                <form action={cambiarEstadoAnimalAdmin}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="estado" value="rechazado" />
                  <button
                    type="submit"
                    className="rounded-full border-2 border-terracota text-terracota-oscuro px-3 py-1.5 text-sm font-bold hover:bg-terracota-mas-oscuro hover:text-blanco-calido transition-colors"
                  >
                    Dar de baja
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginado */}
      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center gap-2">
          {pagina > 1 && (
            <Link href={linkPagina(pagina - 1)} className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold hover:border-tinta">
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-tinta-suave">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={linkPagina(pagina + 1)} className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold hover:border-tinta">
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Selector({
  nombre,
  etiqueta,
  opciones,
  valor,
}: {
  nombre: string;
  etiqueta: string;
  opciones: string[];
  valor?: string;
}) {
  return (
    <div>
      <label htmlFor={nombre} className="block text-xs font-bold text-tinta-suave">
        {etiqueta}
      </label>
      <select
        id={nombre}
        name={nombre}
        defaultValue={valor ?? ""}
        className="mt-1 rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
      >
        <option value="">Todos</option>
        {opciones.map((o) => (
          <option key={o} value={o}>{o.replace("_", " ")}</option>
        ))}
      </select>
    </div>
  );
}

function Etiqueta({ estado }: { estado: string }) {
  const color =
    estado === "disponible" ? "bg-salvia/20 text-salvia-oscuro"
    : estado === "pendiente" ? "bg-sol/30 text-tinta"
    : estado === "adoptado" ? "bg-crema-2 text-tinta-suave"
    : estado === "rechazado" ? "bg-terracota-oscuro/15 text-terracota-oscuro"
    : "bg-crema-2 text-tinta";
  return (
    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>
      {estado.replace("_", " ")}
    </span>
  );
}
