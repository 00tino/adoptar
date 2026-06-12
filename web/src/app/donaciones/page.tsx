import type { Metadata } from "next";
import { obtenerCampanasActivas, obtenerRefugioPorId } from "@/lib/datos";
import {
  campanasActivasPorCausa,
  donarConMercadoPago,
  mercadoPagoDisponible,
} from "@/lib/acciones-donaciones";
import FormDonarCausas from "@/components/FormDonarCausas";

export const metadata: Metadata = {
  title: "Donaciones a refugios de animales",
  description:
    "Ayudá a refugios argentinos con donaciones por Mercado Pago o transferencia bancaria. El 100% va a la causa que elijas.",
};

export default async function PaginaDonaciones({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { resultado } = await searchParams;
  const mpActivo = await mercadoPagoDisponible();
  const campanas = await obtenerCampanasActivas();
  const conteoPorCausa = mpActivo ? await campanasActivasPorCausa() : {};
  const conRefugio = await Promise.all(
    campanas.map(async (c) => ({
      ...c,
      refugio: c.refugioId ? await obtenerRefugioPorId(c.refugioId) : null,
    }))
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {resultado === "gracias" && (
        <div className="mb-6 rounded-2xl bg-salvia text-blanco-calido p-6 text-center font-bold">
          💚 ¡Gracias por tu donación! Se acredita automáticamente en unos minutos.
        </div>
      )}
      {resultado === "error" && (
        <div className="mb-6 rounded-2xl bg-terracota text-blanco-calido p-6 text-center font-bold">
          El pago no se completó. Podés intentarlo de nuevo cuando quieras.
        </div>
      )}
      <h1 className="font-display text-4xl font-black">Donaciones 💛</h1>
      <p className="mt-2 text-tinta-suave max-w-2xl">
        Cada campaña fue revisada y aprobada por el equipo de AdoptAR. Podés
        donar con nombre o de forma anónima. El 100% de lo donado va a la causa.
      </p>

      {/* Donación por causa: elegí una o varias y un solo checkout */}
      {mpActivo && (
        <section className="mt-10">
          <h2 className="font-display text-3xl font-black">Doná por causa 🎯</h2>
          <p className="mt-2 text-tinta-suave max-w-2xl">
            Elegí una o varias causas. Lo donado a cada causa se reparte entre
            sus campañas activas; si una causa no tiene campañas activas, tu
            aporte sostiene la plataforma.
          </p>
          <FormDonarCausas conteoPorCausa={conteoPorCausa} />
        </section>
      )}

      <h2 className="mt-12 font-display text-3xl font-black">
        O elegí una campaña puntual
      </h2>
      <div className="mt-6 space-y-6">
        {conRefugio.map((c) => (
          <div key={c.id} className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold">{c.titulo}</h2>
              <span className="rounded-full bg-crema-2 px-3 py-1 text-xs font-bold text-tinta-suave">
                {c.refugio ? c.refugio.nombre : "Causa de la plataforma"}
              </span>
            </div>
            <p className="mt-3 text-tinta-suave">{c.descripcion}</p>

            {c.metaMonto ? (
              <div className="mt-5">
                <div className="h-4 rounded-full bg-crema-2 overflow-hidden">
                  <div
                    className="h-full bg-salvia"
                    style={{ width: `${Math.min(100, (c.recaudado / c.metaMonto) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-sm font-bold text-salvia-oscuro">
                  ${c.recaudado.toLocaleString("es-AR")} recaudados de ${c.metaMonto.toLocaleString("es-AR")}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm font-bold text-salvia-oscuro">
                ${c.recaudado.toLocaleString("es-AR")} recaudados — sin meta fija
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-start gap-3">
              {mpActivo ? (
                <form action={donarConMercadoPago} className="flex flex-wrap gap-2">
                  <input type="hidden" name="campana_id" value={c.id} />
                  <input
                    type="number"
                    name="monto"
                    min={100}
                    step={100}
                    required
                    placeholder="Monto $"
                    aria-label="Monto a donar en pesos"
                    className="w-28 rounded-full border-2 border-crema-2 px-4 py-2 text-sm"
                  />
                  <input
                    type="text"
                    name="donor_nombre"
                    placeholder="Tu nombre (opcional)"
                    aria-label="Tu nombre, dejalo vacío para donar anónimamente"
                    className="w-44 rounded-full border-2 border-crema-2 px-4 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-terracota text-blanco-calido px-6 py-2 font-bold text-sm hover:bg-terracota-oscuro transition-colors"
                  >
                    Donar con Mercado Pago 💙
                  </button>
                </form>
              ) : (
                <button
                  disabled
                  title="Falta configurar la credencial de Mercado Pago"
                  className="rounded-full bg-terracota/50 text-blanco-calido px-6 py-3 font-bold text-sm cursor-not-allowed"
                >
                  Donar con Mercado Pago (próximamente)
                </button>
              )}
              <details className="rounded-2xl">
                <summary className="rounded-full border-2 border-salvia text-salvia-oscuro px-6 py-3 font-bold text-sm cursor-pointer hover:bg-salvia hover:text-blanco-calido transition-colors inline-block">
                  Donar por transferencia 🏦
                </summary>
                <p className="mt-3 text-sm bg-crema-2/60 rounded-xl p-4">
                  Alias: <strong>ADOPTAR.AYUDA</strong> — Mandanos el comprobante a{" "}
                  <a href="mailto:donaciones@adoptaar.com" className="font-bold underline">donaciones@adoptaar.com</a>{" "}
                  indicando la campaña, y lo acreditamos en la barra de progreso.
                </p>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
