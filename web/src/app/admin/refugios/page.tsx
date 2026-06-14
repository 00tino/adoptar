import type { Metadata } from "next";
import Link from "next/link";
import {
  cambiarEstadoRefugioAdmin,
  listarRefugiosAdmin,
} from "@/lib/acciones-admin-gestion";

export const metadata: Metadata = {
  title: "Refugios — Admin",
  robots: { index: false, follow: false },
};

const ESTADOS = ["pendiente", "verificado", "estrella", "suspendido"];

export default async function PaginaRefugiosAdmin({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const params = await searchParams;
  const refugios = await listarRefugiosAdmin(params);

  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">
        Refugios <span className="text-tinta-suave text-lg">({refugios.length})</span>
      </h2>

      <form action="/admin/refugios" method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="estado" className="block text-xs font-bold text-tinta-suave">Estado</label>
          <select
            id="estado"
            name="estado"
            defaultValue={params.estado ?? ""}
            className="mt-1 rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
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
            placeholder="Nombre, ciudad o email…"
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
        {refugios.length === 0 && (
          <div className="rounded-2xl bg-crema-2/60 p-10 text-center text-tinta-suave">
            No hay refugios con esos filtros.
          </div>
        )}
        {refugios.map((r) => (
          <details
            key={r.id}
            className="rounded-2xl bg-blanco-calido border-2 border-crema-2 px-5 py-4"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">
                    🏠 {r.nombre}{" "}
                    <span className="ml-1 rounded-full bg-crema-2 px-2 py-0.5 text-xs font-bold">
                      {r.estado}
                    </span>
                  </p>
                  <p className="text-sm text-tinta-suave">
                    {r.ciudad}, {r.provincia} · {r.email ?? "sin email"} ·{" "}
                    desde {new Date(r.creadoEl).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <span className="text-sm font-bold text-terracota-oscuro">Ver ficha ▾</span>
              </div>
            </summary>

            {/* Ficha completa */}
            <div className="mt-4 border-t-2 border-crema-2 pt-4 text-sm space-y-2">
              <p>{r.descripcion || "Sin descripción."}</p>
              <p className="text-tinta-suave">
                📞 {r.telefono ?? "sin teléfono"}
                {r.redes.instagram && (
                  <> · <a className="font-bold text-terracota-oscuro hover:underline" href={r.redes.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></>
                )}
                {r.redes.facebook && (
                  <> · <a className="font-bold text-terracota-oscuro hover:underline" href={r.redes.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></>
                )}
              </p>
              {r.fotos.length > 0 && (
                <p className="flex gap-3 font-bold">
                  {r.fotos.map((f, i) => (
                    <a key={i} href={f} target="_blank" rel="noopener noreferrer" className="text-terracota-oscuro hover:underline">
                      Foto {i + 1}
                    </a>
                  ))}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <form action={cambiarEstadoRefugioAdmin} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <select
                    name="estado"
                    defaultValue={r.estado}
                    className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-2 py-1.5 text-sm"
                    aria-label={`Estado de ${r.nombre}`}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-full border-2 border-crema-2 px-3 py-1.5 text-sm font-bold hover:border-tinta transition-colors"
                  >
                    Cambiar estado
                  </button>
                </form>
                <Link
                  href={`/refugios/${r.slug}`}
                  className="rounded-full border-2 border-crema-2 px-3 py-1.5 text-sm font-bold hover:border-terracota hover:text-terracota-oscuro transition-colors"
                >
                  Perfil público →
                </Link>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
