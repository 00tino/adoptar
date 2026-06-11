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
export async function asegurarUsuario(): Promise<{ id: string; email: string; nombre: string } | null> {
  const user = await usuarioActual();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;
  const nombre =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || email.split("@")[0];

  const sb = clienteServidor();
  const { data, error } = await sb
    .from("usuarios")
    .upsert(
      { clerk_id: user.id, email, nombre },
      { onConflict: "clerk_id" }
    )
    .select("id,email,nombre")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
