"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Link de navegación que se marca solo cuando la ruta actual está
// dentro de su sección (ej: "Donar" queda activo en /donaciones/mensual).
export default function LinkNav({
  href,
  clase,
  claseActiva,
  exacta = false,
  children,
}: {
  href: string;
  clase: string;
  claseActiva: string;
  /** Solo activo en la ruta exacta (ej: "Inicio" del admin, que es prefijo de todas) */
  exacta?: boolean;
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const activa = ruta === href || (!exacta && ruta.startsWith(`${href}/`));
  return (
    <Link href={href} aria-current={activa ? "page" : undefined} className={`${clase} ${activa ? claseActiva : ""}`}>
      {children}
    </Link>
  );
}
