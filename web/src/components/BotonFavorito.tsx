"use client";

// Corazón para guardar/quitar un animal de favoritos. Para usuarios sin sesión
// abre el modal de ingreso. Con sesión togglea con feedback optimista (siempre
// clickeable, se puede quitar al instante) y, al guardar, el corazón rebota y
// suelta una explosión de corazoncitos (CSS puro; respeta prefers-reduced-motion).

import { useRef, useState, useTransition } from "react";
import { SignInButton } from "@clerk/nextjs";
import { alternarFavorito } from "@/lib/acciones-favoritos";

const CORAZON =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z";

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

function Corazon({ lleno, tam }: { lleno: boolean; tam: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} className="block" aria-hidden>
      <path
        d={CORAZON}
        fill={lleno ? "#d95d28" : "none"}
        stroke={lleno ? "none" : "#b34719"}
        strokeWidth={lleno ? 0 : 2.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [latidos, setLatidos] = useState(0); // cada "guardado" dispara rebote + explosión
  const [, startTransition] = useTransition();
  const favRef = useRef(inicial); // última intención del usuario
  const enVuelo = useRef(false); // evita acciones solapadas (carreras)
  const tam = variante === "detalle" ? 18 : 22;

  const claseBase =
    variante === "detalle"
      ? "inline-flex items-center gap-2 rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors"
      : "absolute top-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full shadow transition-colors";

  if (!logueado) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          aria-label="Guardar en favoritos (iniciá sesión)"
          title="Iniciá sesión para guardar favoritos"
          className={`${claseBase} ${
            variante === "detalle"
              ? "border-crema-2 bg-blanco-calido hover:border-terracota text-terracota-oscuro"
              : "bg-blanco-calido/90 hover:bg-blanco-calido"
          }`}
        >
          <Corazon lleno={false} tam={tam} />
          {variante === "detalle" && <span>Guardar</span>}
        </button>
      </SignInButton>
    );
  }

  function fijar(deseado: boolean) {
    const fd = new FormData();
    fd.set("animal_id", animalId);
    fd.set("fav", deseado ? "1" : "0");
    return alternarFavorito(fd);
  }

  // Serializa las llamadas y reconcilia con la última intención del usuario:
  // así el botón queda siempre clickeable y el estado final siempre es correcto.
  function sincronizar() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    startTransition(async () => {
      try {
        let enviado = favRef.current;
        await fijar(enviado);
        while (favRef.current !== enviado) {
          enviado = favRef.current;
          await fijar(enviado);
        }
      } catch {
        // la próxima carga del listado corrige el estado
      } finally {
        enVuelo.current = false;
      }
    });
  }

  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
      onClick={() => {
        const nuevo = !fav;
        setFav(nuevo); // optimista, instantáneo
        favRef.current = nuevo;
        if (nuevo) setLatidos((n) => n + 1); // rebote + explosión solo al guardar
        sincronizar();
      }}
      className={`${claseBase} ${
        variante === "detalle"
          ? fav
            ? "border-terracota bg-terracota-oscuro/10 text-terracota-oscuro"
            : "border-crema-2 bg-blanco-calido hover:border-terracota text-terracota-oscuro"
          : "bg-blanco-calido/90 hover:bg-blanco-calido"
      }`}
    >
      <span className="relative grid place-items-center">
        <span key={latidos} className={fav && latidos > 0 ? "animar-latido" : ""}>
          <Corazon lleno={fav} tam={tam} />
        </span>
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
      {variante === "detalle" && <span>{fav ? "En favoritos" : "Guardar"}</span>}
    </button>
  );
}
