"use client";

// Formulario para crear/actualizar la alerta de tránsito por cercanía.
// Mantiene lat/lng/radio en estado y los manda a la server action por inputs
// ocultos. El mapa se carga solo en el navegador (dynamic ssr:false).

import { useState } from "react";
import dynamic from "next/dynamic";
import { guardarAlerta } from "@/lib/acciones-alertas";

const MapaSelector = dynamic(() => import("./MapaSelectorInterno"), {
  ssr: false,
  loading: () => (
    <div className="h-80 rounded-2xl bg-crema-2/60 flex items-center justify-center text-tinta-suave font-bold">
      Cargando mapa… 🗺️
    </div>
  ),
});

const RADIOS = [5, 10, 25, 50];

export default function FormularioAlerta({
  latInicial,
  lngInicial,
  radioInicial,
}: {
  latInicial: number;
  lngInicial: number;
  radioInicial: number;
}) {
  const [lat, setLat] = useState(latInicial);
  const [lng, setLng] = useState(lngInicial);
  const [radio, setRadio] = useState(radioInicial);

  return (
    <form action={guardarAlerta} className="space-y-4">
      <p className="text-sm text-tinta-suave">
        Tocá el mapa (o arrastrá el 💛) para elegir el centro de tu zona, o usá
        el botón <strong>📍 Usar mi ubicación</strong>. Te vamos a avisar por
        email cada vez que se publique un animal que necesita tránsito dentro de
        tu radio.
      </p>

      <MapaSelector
        lat={lat}
        lng={lng}
        radioKm={radio}
        onElegir={(la, ln) => {
          setLat(la);
          setLng(ln);
        }}
      />

      <div>
        <span className="block text-sm font-bold mb-2">Radio de la alerta</span>
        <div className="flex items-center gap-2 flex-wrap">
          {RADIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadio(r)}
              className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-colors ${
                radio === r
                  ? "bg-tinta text-crema border-tinta"
                  : "border-crema-2 bg-blanco-calido hover:border-tinta"
              }`}
            >
              {r} km
            </button>
          ))}
          <label className="flex items-center gap-1.5 rounded-full border-2 border-crema-2 bg-blanco-calido px-3 py-1.5">
            <span className="text-sm font-bold text-tinta-suave">u otro:</span>
            <input
              type="number"
              min={1}
              max={500}
              value={radio}
              aria-label="Radio personalizado en kilómetros"
              onChange={(e) => {
                const v = Math.min(500, Math.max(1, Math.round(Number(e.target.value) || 0)));
                setRadio(v);
              }}
              className="w-16 rounded-lg border-2 border-crema-2 bg-crema/40 px-2 py-1 text-sm font-bold text-center"
            />
            <span className="text-sm font-bold text-tinta-suave">km</span>
          </label>
        </div>
      </div>

      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="radio_km" value={radio} />

      <button
        type="submit"
        className="w-full rounded-xl bg-terracota text-blanco-calido py-3 font-bold hover:bg-terracota-oscuro transition-colors"
      >
        Guardar mi alerta 💛
      </button>
    </form>
  );
}
