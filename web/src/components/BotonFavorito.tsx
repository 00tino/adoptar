"use client";

// Corazón para guardar/quitar un animal de favoritos. Para usuarios sin sesión
// abre el modal de ingreso. Con sesión, togglea con feedback optimista y, al
// guardar, el corazón rebota y suelta una pequeña explosión de corazoncitos
// (CSS puro; se respeta prefers-reduced-motion en globals.css).

import { useState, useTransition } from "react";
import { SignInButton } from "@clerk/nextjs";
import { alternarFavorito } from "@/lib/acciones-favoritos";

const CORAZON =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z";

// 6 corazoncitos en abanico radial, con colores de la paleta (determinístico)
const COLORES = ["#d95d28", "#f2b734", "#b34719", "#5f7d56"];
const PARTICULAS = Array.from({ length: 6 }, (_, i) => {
  const ang = (Math.PI * 2 * i) / 6 - Math.PI / 2;
  const dist = 24;
  return {
    dx: `${(Math.cos(ang) * dist).toFixed(1)}px`,
    dy: `${(Math.sin(ang) * dist).toFixed(1)}px`,
    color: COLORES[i % COLORES.length],
    tam: 11 + (i % 3) * 2,
  };
});

export default function BotonFavorito({
  animalId,
  inicial,
  logueado,
  variante = "card",
}: {
  animalId: string;
  inicial: boolean;
  logueado: boolean;
  variante?: "card" | "detalle";
}) {
  const [fav, setFav] = useState(inicial);
  const [pendiente, startTransition] = useTransition();
  // Cuenta de "guardados" en esta sesión: dispara el rebote + explosión.
  const [latidos, setLatidos] = useState(0);

  const claseBase =
    variante === "detalle"
      ? "inline-flex items-center gap-2 rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors"
      : "absolute top-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full text-lg shadow transition-colors";

  if (!logueado) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          aria-label="Guardar en favoritos (iniciá sesión)"
          title="Iniciá sesión para guardar favoritos"
          className={`${claseBase} ${
            variante === "detalle"
              ? "border-crema-2 bg-blanco-calido hover:border-terracota"
              : "bg-blanco-calido/90 hover:bg-blanco-calido"
          }`}
        >
          🤍{variante === "detalle" && " Guardar"}
        </button>
      </SignInButton>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
      disabled={pendiente}
      onClick={() => {
        const nuevo = !fav;
        setFav(nuevo); // optimista
        if (nuevo) setLatidos((n) => n + 1); // rebote + explosión solo al guardar
        startTransition(async () => {
          const fd = new FormData();
          fd.set("animal_id", animalId);
          try {
            await alternarFavorito(fd);
          } catch {
            setFav(!nuevo); // revertir si falla
          }
        });
      }}
      className={`${claseBase} ${
        variante === "detalle"
          ? fav
            ? "border-terracota bg-terracota-oscuro/10 text-terracota-oscuro"
            : "border-crema-2 bg-blanco-calido hover:border-terracota"
          : "bg-blanco-calido/90 hover:bg-blanco-calido"
      } disabled:opacity-60`}
    >
      <span className="relative grid place-items-center">
        {/* El corazón: rebota en cada "guardado" (key fuerza el replay) */}
        <span key={latidos} className={fav && latidos > 0 ? "animar-latido" : ""}>
          {fav ? "❤️" : "🤍"}
        </span>
        {/* Explosión de corazoncitos al guardar */}
        {fav && latidos > 0 && (
          <span
            key={`b${latidos}`}
            aria-hidden
            className="pointer-events-none absolute inset-0"
          >
            {PARTICULAS.map((p, i) => (
              <svg
                key={i}
                viewBox="0 0 24 24"
                width={p.tam}
                height={p.tam}
                className="latido-particula"
                style={{ "--dx": p.dx, "--dy": p.dy } as React.CSSProperties}
              >
                <path d={CORAZON} fill={p.color} />
              </svg>
            ))}
          </span>
        )}
      </span>
      {variante === "detalle" && (fav ? " En favoritos" : " Guardar")}
    </button>
  );
}
