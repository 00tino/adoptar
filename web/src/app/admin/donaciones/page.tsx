import type { Metadata } from "next";
import Link from "next/link";
import {
  campanasActivasAdmin,
  listarDonacionesAdmin,
  reasignarDonacionCaja,
  registrarTransferencia,
} from "@/lib/acciones-admin-gestion";
import { FILAS_POR_PAGINA } from "@/lib/constantes-admin";
import { CAUSAS, nombreCausa } from "@/lib/causas";

export const metadata: Metadata = {
  title: "Donaciones — Admin",
  robots: { index: false, follow: false },
};

export default async function PaginaDonacionesAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    metodo?: string;
    causa?: string;
    campana?: string;
    desde?: string;
    hasta?: string;
    q?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const [{ filas, total, montoTotal }, campanas] = await Promise.all([
    listarDonacionesAdmin({ ...params, pagina }),
    campanasActivasAdmin(),
  ]);
  const paginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));

  const linkPagina = (p: number) => {
    const url = new URLSearchParams();
    for (const clave of ["estado", "metodo", "causa", "campana", "desde", "hasta", "q"] as const) {
      if (params[clave]) url.set(clave, params[clave]!);
    }
    url.set("pagina", String(p));
    return `/admin/donaciones?${url.toString()}`;
  };

  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">
        Donaciones <span className="text-tinta-suave text-lg">({total})</span>
      </h2>

      {/* Registrar transferencia recibida en el alias adoptar.ayuda */}
      <details className="mt-4 rounded-2xl bg-sol/15 border-2 border-sol/40 px-5 py-4">
        <summary className="cursor-pointer font-bold">
          🏦 Registrar una transferencia recibida
        </summary>
        <form action={registrarTransferencia} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3 text-sm text-tinta-suave">
            Para donaciones que llegaron por transferencia al alias{" "}
            <strong>adoptar.ayuda</strong>: elegí la campaña, el monto y el
            nombre del donante (si lo dejó en la referencia). Queda acreditada al instante.
          </div>
          <div>
            <label htmlFor="t-campana" className="block text-xs font-bold text-tinta-suave">Campaña *</label>
            <select
              id="t-campana"
              name="campana_id"
              required
              className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
            >
              <option value="">Elegí una campaña…</option>
              {campanas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo} ({nombreCausa(c.causa)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="t-monto" className="block text-xs font-bold text-tinta-suave">Monto ($) *</label>
            <input
              id="t-monto"
              name="monto"
              type="number"
              min={1}
              required
              className="mt-1 w-full rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido"
            />
          </div>
          <div>
            <label htmlFor="t-nombre" className="block text-xs font-bold text-tinta-suave">Nombre del donante</label>
            <input
              id="t-nombre"
              name="donor_nombre"
              placeholder="Vacío = anónima"
              className="mt-1 w-full rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-terracota text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-oscuro transition-colors"
            >
              Registrar donación
            </button>
          </div>
        </form>
      </details>

      {/* Filtros */}
      <form action="/admin/donaciones" method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <Selector nombre="estado" etiqueta="Estado" valor={params.estado} opciones={[["pendiente", "pendiente"], ["acreditada", "acreditada"]]} />
        <Selector nombre="metodo" etiqueta="Método" valor={params.metodo} opciones={[["mercadopago", "Mercado Pago"], ["transferencia", "transferencia"]]} />
        <Selector
          nombre="causa"
          etiqueta="Causa"
          valor={params.causa}
          opciones={CAUSAS.map((c) => [c.id, `${c.emoji} ${c.nombre}`])}
        />
        <div>
          <label htmlFor="desde" className="block text-xs font-bold text-tinta-suave">Desde</label>
          <input id="desde" type="date" name="desde" defaultValue={params.desde} className="mt-1 rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido" />
        </div>
        <div>
          <label htmlFor="hasta" className="block text-xs font-bold text-tinta-suave">Hasta</label>
          <input id="hasta" type="date" name="hasta" defaultValue={params.hasta} className="mt-1 rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido" />
        </div>
        <div>
          <label htmlFor="q" className="block text-xs font-bold text-tinta-suave">Donante</label>
          <input id="q" type="search" name="q" defaultValue={params.q} placeholder="Nombre…" className="mt-1 rounded-xl border-2 border-crema-2 px-3 py-1.5 text-sm bg-blanco-calido" />
        </div>
        <button
          type="submit"
          className="rounded-full bg-tinta text-crema px-5 py-2 text-sm font-bold hover:bg-tinta/80 transition-colors"
        >
          Filtrar
        </button>
      </form>

      {/* Total del filtro aplicado */}
      <p className="mt-4 rounded-2xl bg-salvia/15 px-5 py-3 font-bold text-salvia-oscuro">
        Total filtrado: ${montoTotal.toLocaleString("es-AR")} en {total} donaci{total === 1 ? "ón" : "ones"}
      </p>

      {/* Listado */}
      <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-crema-2 bg-blanco-calido">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-crema-2 text-left">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Donante</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Causa</th>
              <th className="px-4 py-3">Campaña</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-tinta-suave">
                  No hay donaciones con esos filtros.
                </td>
              </tr>
            )}
            {filas.map((d) => (
              <tr key={d.id} className="border-b border-crema-2 last:border-0">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(d.creadoEl).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3">{d.donante}</td>
                <td className="px-4 py-3 font-bold">${d.monto.toLocaleString("es-AR")}</td>
                <td className="px-4 py-3">{d.metodo === "mercadopago" ? "MP" : "transf."}</td>
                <td className="px-4 py-3">{d.causa ? nombreCausa(d.causa) : "—"}</td>
                <td className="px-4 py-3">
                  {d.campana ?? (
                    <div>
                      <p className="font-bold text-tinta-suave">📥 En caja</p>
                      {/* Reasignar a una campaña activa de la misma causa */}
                      <form action={reasignarDonacionCaja} className="mt-1 flex items-center gap-1">
                        <input type="hidden" name="id" value={d.id} />
                        <select
                          name="campana_id"
                          required
                          className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-2 py-1 text-xs max-w-[180px]"
                          aria-label="Campaña destino"
                        >
                          <option value="">Reasignar a…</option>
                          {campanas
                            .filter((c) => !d.causa || c.causa === d.causa)
                            .map((c) => (
                              <option key={c.id} value={c.id}>{c.titulo}</option>
                            ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-full border-2 border-crema-2 px-2 py-1 text-xs font-bold hover:border-tinta transition-colors"
                        >
                          OK
                        </button>
                      </form>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      d.estado === "acreditada"
                        ? "bg-salvia/20 text-salvia-oscuro"
                        : "bg-sol/30 text-tinta"
                    }`}
                  >
                    {d.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center gap-2">
          {pagina > 1 && (
            <Link href={linkPagina(pagina - 1)} className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold hover:border-tinta">
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-tinta-suave">Página {pagina} de {paginas}</span>
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
  opciones: [string, string][];
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
        <option value="">Todas</option>
        {opciones.map(([v, t]) => (
          <option key={v} value={v}>{t}</option>
        ))}
      </select>
    </div>
  );
}
