"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Menú único (hamburguesa) para todas las pantallas: un solo panel desplegable
// a lo ancho, sin menús que se solapen. El contenido (links, badges, campanita)
// llega renderizado desde el servidor como children; acá solo se maneja
// abrir/cerrar. Se cierra solo al navegar a otra página.
export default function MenuMovil({
  children,
  aviso = false,
}: {
  children: React.ReactNode;
  /** Muestra un punto en el botón (mensajes/notificaciones sin ver). */
  aviso?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const panel = useRef<HTMLDivElement>(null);

  // Al cambiar de página se cierra el menú
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  // Sin scroll de fondo mientras el menú está abierto
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <div>
      <button
        type="button"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border-2 border-crema-2 text-tinta hover:border-tinta transition-colors"
      >
        {aviso && !abierto && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-terracota-oscuro ring-2 ring-blanco-calido"
          />
        )}
        {/* Ícono hamburguesa / cruz */}
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          {abierto ? (
            <>
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </>
          ) : (
            <>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>

      {abierto && (
        <>
          {/* Fondo oscurecido: tocar afuera cierra. Se ancla al header (sticky). */}
          <div
            aria-hidden
            onClick={() => setAbierto(false)}
            className="absolute inset-x-0 top-full z-40 h-dvh bg-tinta/30"
          />
          <div
            ref={panel}
            className="absolute inset-x-0 top-full z-50 max-h-[80dvh] overflow-y-auto border-b-2 border-crema-2 bg-blanco-calido px-4 pb-6 pt-2 shadow-lg"
          >
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </>
      )}
    </div>
  );
}
