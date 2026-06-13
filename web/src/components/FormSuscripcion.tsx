"use client";

import { useState } from "react";
import { CAUSAS } from "@/lib/causas";
import {
  cambiarSuscripcion,
  crearSuscripcion,
} from "@/lib/acciones-suscripciones";
import BotonEnvio from "@/components/BotonEnvio";

const NIVELES = [2000, 5000, 10000];

// Formulario de donación mensual: niveles sugeridos + monto libre,
// y destino (una o varias causas, o "donde más se necesite").
export default function FormSuscripcion({
  editar = false,
  montoInicial,
  causasIniciales = ["general"],
}: {
  editar?: boolean;
  montoInicial?: number;
  causasIniciales?: string[];
}) {
  const [monto, setMonto] = useState<number | "">(montoInicial ?? 5000);
  const [causas, setCausas] = useState<string[]>(causasIniciales);
  const general = causas.includes("general");

  const alternarCausa = (id: string) =>
    setCausas((prev) => {
      if (id === "general") return prev.includes("general") ? [] : ["general"];
      const sinGeneral = prev.filter((c) => c !== "general");
      return sinGeneral.includes(id)
        ? sinGeneral.filter((c) => c !== id)
        : [...sinGeneral, id];
    });

  return (
    <form action={editar ? cambiarSuscripcion : crearSuscripcion}>
      <h3 className="font-display text-xl font-bold">¿Cuánto por mes?</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {NIVELES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setMonto(n)}
            className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-colors ${
              monto === n
                ? "border-tinta bg-tinta text-crema"
                : "border-crema-2 bg-blanco-calido hover:border-tinta"
            }`}
          >
            ${n.toLocaleString("es-AR")}
          </button>
        ))}
        <input
          type="number"
          name="monto"
          min={500}
          step={100}
          required
          value={monto}
          onChange={(e) =>
            setMonto(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder="Otro monto"
          aria-label="Monto mensual en pesos"
          className="w-36 rounded-full border-2 border-crema-2 bg-blanco-calido px-4 py-2.5 text-sm font-bold"
        />
      </div>

      <h3 className="mt-8 font-display text-xl font-bold">¿A qué causa?</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label
          className={`cursor-pointer rounded-2xl border-2 p-4 transition-colors sm:col-span-3 ${
            general
              ? "border-terracota bg-terracota/10"
              : "border-crema-2 bg-blanco-calido hover:border-tinta-suave"
          }`}
        >
          <input
            type="checkbox"
            name="causas"
            value="general"
            checked={general}
            onChange={() => alternarCausa("general")}
            className="sr-only"
          />
          <span className="font-display text-lg font-bold">
            💛 Donde más se necesite
          </span>
          <span className="mt-1 block text-xs text-tinta-suave">
            El equipo de AdoptAR asigna tu aporte a las causas más urgentes de
            cada mes.
          </span>
        </label>
        {CAUSAS.map((c) => {
          const activa = causas.includes(c.id);
          return (
            <label
              key={c.id}
              className={`cursor-pointer rounded-2xl border-2 p-4 transition-colors ${
                activa
                  ? "border-terracota bg-terracota/10"
                  : general
                    ? "border-crema-2 bg-blanco-calido opacity-50"
                    : "border-crema-2 bg-blanco-calido hover:border-tinta-suave"
              }`}
            >
              <input
                type="checkbox"
                name="causas"
                value={c.id}
                checked={activa}
                onChange={() => alternarCausa(c.id)}
                className="sr-only"
              />
              <span className="text-2xl" aria-hidden>{c.emoji}</span>
              <span className="mt-1 block font-display font-bold">{c.nombre}</span>
            </label>
          );
        })}
      </div>

      <BotonEnvio
        deshabilitado={causas.length === 0}
        textoEnviando={editar ? "Guardando…" : "Redirigiendo a Mercado Pago…"}
        className="mt-8 w-full rounded-full bg-terracota px-6 py-3 font-bold text-blanco-calido transition-colors hover:bg-terracota-oscuro sm:w-auto"
      >
        {editar ? "Guardar cambios" : "Empezar mi donación mensual 💙"}
      </BotonEnvio>
      {!editar && (
        <p className="mt-3 text-xs text-tinta-suave">
          Te lleva al checkout seguro de Mercado Pago para autorizar el débito.
          Podés cambiar el monto o cancelar cuando quieras desde esta página.
        </p>
      )}
    </form>
  );
}
