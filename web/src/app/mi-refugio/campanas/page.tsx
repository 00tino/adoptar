import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  crearCampanaRefugio,
  miRefugio,
  misCampanas,
} from "@/lib/acciones-refugio";
import { CAUSAS, nombreCausa } from "@/lib/causas";
import Pestanas from "../Pestanas";

export const metadata: Metadata = {
  title: "Campañas de mi refugio",
  robots: { index: false },
};

const etiquetaEstado: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente de aprobación", clase: "bg-sol text-tinta" },
  activa: { texto: "Activa 💛", clase: "bg-salvia text-blanco-calido" },
  cerrada: { texto: "Cerrada", clase: "bg-crema-2 text-tinta-suave" },
};

// Pestaña "Campañas": el refugio crea campañas de donación etiquetadas
// por causa; el admin las aprueba (y puede corregir la causa).
export default async function PaginaCampanasRefugio({
  searchParams,
}: {
  searchParams: Promise<{ creada?: string }>;
}) {
  const refugio = await miRefugio();
  if (!refugio) redirect("/registrar-refugio");
  const { creada } = await searchParams;
  const campanas = await misCampanas();

  const claseCampo =
    "mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">{refugio.nombre}</h1>
      <Pestanas activa="/mi-refugio/campanas" />

      {creada && (
        <p className="mt-6 rounded-2xl bg-salvia/20 border-2 border-salvia px-5 py-3 font-bold text-salvia-oscuro">
          ¡Campaña enviada! Entra a la cola de aprobación del admin.
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold">
          Tus campañas ({campanas.length})
        </h2>
        {campanas.length === 0 ? (
          <p className="mt-4 text-tinta-suave">
            Todavía no creaste ninguna campaña. ¡Armá la primera acá abajo!
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {campanas.map((c) => {
              const etiqueta = etiquetaEstado[c.estado] ?? etiquetaEstado.pendiente;
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold">{c.titulo}</p>
                    <p className="text-sm text-tinta-suave">
                      {nombreCausa(c.causa)}
                      {c.metaMonto &&
                        ` · meta $${c.metaMonto.toLocaleString("es-AR")}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${etiqueta.clase}`}
                  >
                    {etiqueta.texto}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Nueva campaña</h2>
        <form action={crearCampanaRefugio} className="mt-4 space-y-4">
          <div>
            <label htmlFor="titulo" className="font-bold text-sm">
              Título *
            </label>
            <input
              id="titulo"
              type="text"
              name="titulo"
              required
              maxLength={120}
              placeholder="Ej: Cirugía de cadera para Tobías"
              className={claseCampo}
            />
          </div>
          <div>
            <label htmlFor="causa" className="font-bold text-sm">
              Causa *
            </label>
            <select id="causa" name="causa" required className={claseCampo}>
              {CAUSAS.filter((c) => c.id !== "plataforma").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nombre} — {c.descripcion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="descripcion" className="font-bold text-sm">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={4}
              maxLength={2000}
              placeholder="Contá para qué es la plata y cómo ayuda."
              className={claseCampo}
            />
          </div>
          <div>
            <label htmlFor="meta_monto" className="font-bold text-sm">
              Meta en pesos (opcional, desde $1.000)
            </label>
            <input
              id="meta_monto"
              type="number"
              name="meta_monto"
              min={1000}
              step={1000}
              placeholder="$ 500.000"
              className={claseCampo}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors sm:w-auto"
          >
            Enviar campaña
          </button>
        </form>
      </section>
    </div>
  );
}
