"use server";

// Sincronización Clerk → tabla usuarios.
// La primera vez que un usuario logueado interactúa (ej: manda un mensaje),
// lo damos de alta en nuestra tabla para poder referenciarlo.

import { createClient } from "@supabase/supabase-js";
import { usuarioActual } from "./auth";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Devuelve la fila de `usuarios` del usuario logueado, creándola si no existe */
export async function asegurarUsuario(): Promise<{
  id: string;
  email: string;
  nombre: string;
  suspendido: boolean;
} | null> {
  const user = await usuarioActual();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;
  const nombre =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || email.split("@")[0];

  const sb = clienteServidor();
  const seleccion = "id,email,nombre,suspendido";

  // 1. Caso normal: la cuenta ya está vinculada por clerk_id.
  const { data: porClerk } = await sb
    .from("usuarios")
    .select(seleccion)
    .eq("clerk_id", user.id)
    .maybeSingle();
  if (porClerk) return porClerk;

  // 2. No está por clerk_id, pero puede existir una fila con el mismo email
  //    (datos demo o una sincronización vieja sin clerk_id). La reclamamos
  //    vinculándola a esta cuenta, así no chocamos con el unique de email.
  //    (No se puede usar upsert onConflict clerk_id: cuando el email ya existe
  //    en otra fila, intenta insertar y viola usuarios_email_key.)
  const { data: porEmail } = await sb
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (porEmail) {
    const { data, error } = await sb
      .from("usuarios")
      .update({ clerk_id: user.id, nombre })
      .eq("id", porEmail.id)
      .select(seleccion)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // 3. Usuario nuevo: alta normal.
  const { data, error } = await sb
    .from("usuarios")
    .insert({ clerk_id: user.id, email, nombre })
    .select(seleccion)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Como asegurarUsuario, pero corta si la cuenta está suspendida.
 *  Usar en toda acción que publica contenido o manda mensajes. */
export async function exigirUsuarioActivo() {
  const yo = await asegurarUsuario();
  if (!yo) throw new Error("Tenés que iniciar sesión.");
  if (yo.suspendido) {
    throw new Error("Tu cuenta está suspendida. Escribinos si creés que es un error.");
  }
  return yo;
}
