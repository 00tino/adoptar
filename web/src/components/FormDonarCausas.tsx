"use client";

import { useState } from "react";
import { CAUSAS, type CausaId } from "@/lib/causas";
import { donarPorCausas } from "@/lib/acciones-donaciones";

// Donación multi-causa: tarjetas con checkbox, reparto en partes iguales
// o monto por causa, y un solo checkout de Mercado Pago al final.
export default function FormDonarCausas({
  conteoPorCausa,
}: {
  conteoPorCausa: Record<string, number>;
}) {
  const [elegidas, setElegidas] = useState<CausaId[]>([]);
  const [modo, setModo] = useState<"iguales" | "montos">("iguales");

  const alternar = (id: CausaId) =>
    setElegidas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  return (
    <form action={donarPorCausas} className="mt-6">
      {/* Tarjetas de causas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CAUSAS.map((c) => {
          const activa = elegidas.includes(c.id);
          const sinCampanas = (conteoPorCausa[c.id] ?? 0) === 0 && c.id !== "plataforma";
          return (
            <label
              key={c.id}
              className={`cursor-pointer rounded-2xl border-2 p-4 transition-colors ${
                activa
                  ? "border-terracota bg-terracota/10"
                  : "border-crema-2 bg-blanco-calido hover:border-tinta-suave"
              }`}
            >
              <input
                type="checkbox"
                name="causas"
                value={c.id}
                checked={activa}
                onChange={() => alternar(c.id)}
                className="sr-only"
              />
              <span className="text-3xl" aria-hidden>{c.emoji}</span>
              <span className="mt-1 block font-display text-lg font-bold">
                {c.nombre}
              </span>
              <span className="mt-1 block text-xs text-tinta-suave">
                {c.descripcion}
              </span>
              {sinCampanas && (
                <span className="mt-2 block text-xs font-bold text-sol">
                  Sin campañas activas por ahora: tu aporte queda en una caja
                  para las próximas campañas
                </span>
              )}
            </label>
          );
        })}
      </div>

      {elegidas.length > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5">
          {/* Modo de reparto (solo con 2+ causas) */}
          {elegidas.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "iguales", texto: "Partes iguales" },
                  { id: "montos", texto: "Asignar monto por causa" },
                ] as const
              ).map((m) => (
                <label
                  key={m.id}
                  className={`cursor-pointer rounded-full border-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                    modo === m.id
                      ? "border-tinta bg-tinta text-crema"
                      : "border-crema-2 hover:border-tinta"
                  }`}
                >
                  <input
                    type="radio"
                    name="modo"
                    value={m.id}
                    checked={modo === m.id}
                    onChange={() => setModo(m.id)}
                    className="sr-only"
                  />
                  {m.texto}
                </label>
              ))}
            </div>
          )}
          {/* Con una sola causa el modo no importa: viaja "iguales" */}
          {elegidas.length === 1 && (
            <input type="hidden" name="modo" value="iguales" />
          )}

          {modo === "iguales" || elegidas.length === 1 ? (
            <div className="mt-4">
              <label htmlFor="monto-total" className="block text-sm font-bold">
                Monto total {elegidas.length > 1 && "(se reparte en partes iguales)"}
              </label>
              <input
                id="monto-total"
                type="number"
                name="monto"
                min={100}
                step={100}
                required
                placeholder="$ 5.000"
                className="mt-1 w-full max-w-xs rounded-xl border-2 border-crema-2 px-4 py-3 text-sm"
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {elegidas.map((id) => {
                const causa = CAUSAS.find((c) => c.id === id)!;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="w-40 text-sm font-bold">
                      {causa.emoji} {causa.nombre}
                    </span>
                    <input
                      type="number"
                      name={`monto_${id}`}
                      min={100}
                      step={100}
                      required
                      placeholder="$ 1.000"
                      aria-label={`Monto para ${causa.nombre}`}
                      className="w-36 rounded-xl border-2 border-crema-2 px-4 py-3 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="donor-nombre" className="block text-sm font-bold">
              Tu nombre (opcional, dejalo vacío para donar anónimamente)
            </label>
            <input
              id="donor-nombre"
              type="text"
              name="donor_nombre"
              className="mt-1 w-full max-w-xs rounded-xl border-2 border-crema-2 px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-full bg-terracota px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-oscuro transition-colors sm:w-auto"
          >
            Donar con Mercado Pago 💙
          </button>
        </div>
      )}
    </form>
  );
}
