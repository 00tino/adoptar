import type { Metadata } from "next";
import { listarSuscripcionesAdmin } from "@/lib/acciones-admin-gestion";
import { nombreCausa } from "@/lib/causas";

export const metadata: Metadata = {
  title: "Suscripciones — Admin",
  robots: { index: false, follow: false },
};

export default async function PaginaSuscripcionesAdmin() {
  const { filas, totalActivas, montoMensual } = await listarSuscripcionesAdmin();

  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">Donantes mensuales</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
        <div className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-5">
          <p className="font-display text-4xl font-black text-terracota">{totalActivas}</p>
          <p className="text-sm font-bold text-tinta-suave">Suscripciones activas</p>
        </div>
        <div className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-5">
          <p className="font-display text-4xl font-black text-terracota">
            ${montoMensual.toLocaleString("es-AR")}
          </p>
          <p className="text-sm font-bold text-tinta-suave">Por mes (activas)</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border-2 border-crema-2 bg-blanco-calido">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-crema-2 text-left">
              <th className="px-4 py-3">Donante</th>
              <th className="px-4 py-3">Monto mensual</th>
              <th className="px-4 py-3">Causas</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Desde</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-tinta-suave">
                  Todavía no hay donaciones mensuales.
                </td>
              </tr>
            )}
            {filas.map((s) => (
              <tr key={s.id} className="border-b border-crema-2 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-bold">{s.donante}</p>
                  <p className="text-tinta-suave">{s.email}</p>
                </td>
                <td className="px-4 py-3 font-bold">${s.monto.toLocaleString("es-AR")}</td>
                <td className="px-4 py-3">
                  {s.causas
                    .map((c) => (c === "general" ? "🌟 Donde más se necesite" : nombreCausa(c)))
                    .join(", ")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      s.estado === "activa"
                        ? "bg-salvia/20 text-salvia-oscuro"
                        : s.estado === "cancelada"
                        ? "bg-terracota/15 text-terracota"
                        : "bg-sol/30 text-tinta"
                    }`}
                  >
                    {s.estado}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(s.creadoEl).toLocaleDateString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
