import type { Metadata } from "next";
import {
  accionCampanaAdmin,
  editarCampanaAdmin,
  listarCampanasAdmin,
} from "@/lib/acciones-admin-gestion";
import { CAUSAS, nombreCausa } from "@/lib/causas";

export const metadata: Metadata = {
  title: "Campañas — Admin",
  robots: { index: false, follow: false },
};

const ESTADOS = ["pendiente", "activa", "cerrada"];

export default async function PaginaCampanasAdmin({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const params = await searchParams;
  const campanas = await listarCampanasAdmin(params);

  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">
        Campañas <span className="text-tinta-suave text-lg">({campanas.length})</span>
      </h2>

      <form action="/admin/campanas" method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="estado" className="block text-xs font-bold text-tinta-suave">Estado</label>
          <select
            id="estado"
            name="estado"
            defaultValue={params.estado ?? ""}
            className="mt-1 rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q" className="block text-xs font-bold text-tinta-suave">Buscar</label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={params.q}
            placeholder="Título…"
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

      <div className="mt-4 space-y-3">
        {campanas.length === 0 && (
          <div className="rounded-2xl bg-crema-2/60 p-10 text-center text-tinta-suave">
            No hay campañas con esos filtros.
          </div>
        )}
        {campanas.map((c) => (
          <details
            key={c.id}
            className="rounded-2xl bg-blanco-calido border-2 border-crema-2 px-5 py-4"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">
                    💛 {c.titulo}{" "}
                    <span className="ml-1 rounded-full bg-crema-2 px-2 py-0.5 text-xs font-bold">
                      {c.estado}
                    </span>
                  </p>
                  <p className="text-sm text-tinta-suave">
                    {nombreCausa(c.causa)} · {c.refugio} · recaudado $
                    {c.recaudado.toLocaleString("es-AR")}
                    {c.metaMonto && ` de $${c.metaMonto.toLocaleString("es-AR")}`}
                  </p>
                </div>
                <span className="text-sm font-bold text-terracota">Gestionar ▾</span>
              </div>
            </summary>

            <div className="mt-4 border-t-2 border-crema-2 pt-4 space-y-4">
              {/* Acciones de estado */}
              <form action={accionCampanaAdmin} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={c.id} />
                {c.estado === "pendiente" && (
                  <>
                    <BotonAccion accion="aprobar" texto="Aprobar ✓" estilo="bg-salvia text-blanco-calido hover:bg-salvia-oscuro" />
                    <BotonAccion accion="rechazar" texto="Rechazar ✗" estilo="bg-crema-2 text-tinta hover:bg-terracota hover:text-blanco-calido" />
                  </>
                )}
                {c.estado === "activa" && (
                  <BotonAccion accion="cerrar" texto="Cerrar campaña" estilo="bg-crema-2 text-tinta hover:bg-terracota hover:text-blanco-calido" />
                )}
                {c.estado === "cerrada" && (
                  <BotonAccion accion="reactivar" texto="Reactivar" estilo="bg-salvia text-blanco-calido hover:bg-salvia-oscuro" />
                )}
              </form>

              {/* Edición de título, descripción, meta y causa */}
              <form action={editarCampanaAdmin} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="sm:col-span-2">
                  <label htmlFor={`titulo-${c.id}`} className="block text-xs font-bold text-tinta-suave">Título</label>
                  <input
                    id={`titulo-${c.id}`}
                    name="titulo"
                    defaultValue={c.titulo}
                    required
                    className="mt-1 w-full rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`descripcion-${c.id}`} className="block text-xs font-bold text-tinta-suave">Descripción</label>
                  <textarea
                    id={`descripcion-${c.id}`}
                    name="descripcion"
                    rows={3}
                    defaultValue={c.descripcion}
                    className="mt-1 w-full rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido"
                  />
                </div>
                <div>
                  <label htmlFor={`meta-${c.id}`} className="block text-xs font-bold text-tinta-suave">Meta ($, vacío = sin meta)</label>
                  <input
                    id={`meta-${c.id}`}
                    name="meta_monto"
                    type="number"
                    min={0}
                    defaultValue={c.metaMonto ?? ""}
                    className="mt-1 w-full rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido"
                  />
                </div>
                <div>
                  <label htmlFor={`causa-${c.id}`} className="block text-xs font-bold text-tinta-suave">Causa</label>
                  <select
                    id={`causa-${c.id}`}
                    name="causa"
                    defaultValue={c.causa}
                    className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
                  >
                    {CAUSAS.map((causa) => (
                      <option key={causa.id} value={causa.id}>
                        {causa.emoji} {causa.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-full bg-tinta text-crema px-5 py-2 text-sm font-bold hover:bg-tinta/80 transition-colors"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function BotonAccion({
  accion,
  texto,
  estilo,
}: {
  accion: string;
  texto: string;
  estilo: string;
}) {
  return (
    <button
      type="submit"
      name="accion"
      value={accion}
      className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${estilo}`}
    >
      {texto}
    </button>
  );
}
