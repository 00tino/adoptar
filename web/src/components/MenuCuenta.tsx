"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Desplegable "Mi cuenta" (desktop). A diferencia de un <details> nativo:
//  - se cierra al hacer clic fuera o con Escape,
//  - se anima al abrir y cerrar (fade + scale + leve desplazamiento).
// El contenido (links, notificaciones, cerrar sesión) llega como children
// renderizado desde el servidor.
export default function MenuCuenta({
  inicial,
  pendientes,
  className = "",
  children,
}: {
  inicial: string;
  pendientes: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const ruta = usePathname();

  // Al navegar a otra página, se cierra
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  // Clic afuera o Escape cierra
  useEffect(() => {
    if (!abierto) return;
    function alClicAfuera(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    function alPresionar(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", alClicAfuera);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("mousedown", alClicAfuera);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Mi cuenta${pendientes > 0 ? ` (${pendientes} sin ver)` : ""}`}
        className="group flex cursor-pointer items-center gap-1"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-salvia text-sm font-bold text-blanco-calido ring-2 ring-transparent transition group-hover:ring-crema-2">
          {inicial}
          {pendientes > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-terracota-oscuro ring-2 ring-blanco-calido"
            />
          )}
        </span>
        <span
          aria-hidden
          className={`text-xs text-tinta-suave transition-transform duration-200 ${
            abierto ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      <div
        role="menu"
        aria-hidden={!abierto}
        className={`absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl border-2 border-crema-2 bg-blanco-calido p-2 shadow-lg transition duration-150 ease-out ${
          abierto
            ? "scale-100 translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
