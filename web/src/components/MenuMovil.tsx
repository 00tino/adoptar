"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Menú hamburguesa para mobile. El contenido (links, badges, campanita)
// llega renderizado desde el servidor como children; acá solo se maneja
// abrir/cerrar. Se cierra solo al navegar a otra página.
export default function MenuMovil({ children }: { children: React.ReactNode }) {
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
    <div className="md:hidden">
      <button
        type="button"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-crema-2 text-tinta hover:border-tinta transition-colors"
      >
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
            {children}
          </div>
        </>
      )}
    </div>
  );
}
