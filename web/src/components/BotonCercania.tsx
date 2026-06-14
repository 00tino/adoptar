"use client";

// Sector "cerca mío" del catálogo: el usuario elige un radio y le pedimos su
// ubicación al navegador; con eso navegamos agregando lat/lng/radio a la URL
// (conservando los demás filtros) para que el catálogo ordene por cercanía.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const RADIOS: { valor: number; texto: string }[] = [
  { valor: 5, texto: "5 km" },
  { valor: 10, texto: "10 km" },
  { valor: 25, texto: "25 km" },
  { valor: 50, texto: "50 km" },
  { valor: 100, texto: "100 km" },
  { valor: 0, texto: "Sin límite" },
];

export default function BotonCercania({ activo }: { activo: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [radio, setRadio] = useState(Number(params.get("radio")) || 25);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aplicar = () => {
    setBuscando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = new URLSearchParams(params.toString());
        p.set("lat", pos.coords.latitude.toFixed(5));
        p.set("lng", pos.coords.longitude.toFixed(5));
        p.set("radio", String(radio));
        p.delete("pagina");
        router.push(`/animales?${p.toString()}`);
        setBuscando(false);
      },
      () => {
        setError("No pudimos obtener tu ubicación. Revisá los permisos del navegador.");
        setBuscando(false);
      },
      { timeout: 8000 }
    );
  };

  const quitar = () => {
    const p = new URLSearchParams(params.toString());
    p.delete("lat");
    p.delete("lng");
    p.delete("radio");
    p.delete("pagina");
    const qs = p.toString();
    router.push(qs ? `/animales?${qs}` : "/animales");
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold">📍 Animales cerca mío</span>
        <select
          aria-label="Radio de cercanía"
          value={radio}
          onChange={(e) => setRadio(Number(e.target.value))}
          className="rounded-xl bg-blanco-calido border-2 border-crema-2 px-3 py-2 text-sm font-bold"
        >
          {RADIOS.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.texto}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={aplicar}
          disabled={buscando}
          className="rounded-xl bg-salvia text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-salvia-oscuro transition-colors disabled:opacity-60"
        >
          {buscando ? "Buscando…" : activo ? "Actualizar ubicación" : "Usar mi ubicación"}
        </button>
        {activo && (
          <button
            type="button"
            onClick={quitar}
            className="rounded-xl border-2 border-crema-2 px-4 py-2 text-sm font-bold hover:border-tinta transition-colors"
          >
            Quitar
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-terracota">{error}</p>}
      {!error && (
        <p className="mt-2 text-xs text-tinta-suave">
          Usamos tu ubicación solo en tu navegador para ordenar los animales por
          distancia. Las ubicaciones de particulares son aproximadas (~500 m).
        </p>
      )}
    </div>
  );
}
