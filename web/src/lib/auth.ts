// Utilidades de autenticación.
// Clerk se activa solo cuando hay claves en .env.local — sin claves, la app
// funciona en "modo demo" sin login.

import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

export function clerkDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/** Comparte la consulta entre header y página solo durante este render, nunca entre sesiones. */
export const usuarioActual = cache(async () => {
  if (!clerkDisponible()) return null;
  return currentUser();
});

/** El admin es el dueño de la plataforma: se define por email en .env.local */
export async function esAdmin(): Promise<boolean> {
  const user = await usuarioActual();
  if (!user || !process.env.ADMIN_EMAIL) return false;
  return user.emailAddresses.some(
    (e) => e.emailAddress.toLowerCase() === process.env.ADMIN_EMAIL!.toLowerCase()
  );
}
