// Utilidades de autenticación.
// Clerk se activa solo cuando hay claves en .env.local — sin claves, la app
// funciona en "modo demo" sin login.

import { currentUser } from "@clerk/nextjs/server";

export function clerkDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/** Devuelve el usuario logueado, o null si no hay sesión o Clerk no está configurado */
export async function usuarioActual() {
  if (!clerkDisponible()) return null;
  return currentUser();
}

/** El admin es el dueño de la plataforma: se define por email en .env.local */
export async function esAdmin(): Promise<boolean> {
  const user = await usuarioActual();
  if (!user || !process.env.ADMIN_EMAIL) return false;
  return user.emailAddresses.some(
    (e) => e.emailAddress.toLowerCase() === process.env.ADMIN_EMAIL!.toLowerCase()
  );
}
