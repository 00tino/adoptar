"use server";

// Notificaciones in-app: se crean en los mismos eventos que ya mandan email
// (aprobaciones, rechazos, mensajes) y se muestran en la campanita del Header.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { asegurarUsuario } from "./usuarios";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface Notificacion {
  id: string;
  tipo: string;
  contenido: string;
  creadaEl: string;
}

/** Crea una notificación. No corta el flujo si falla (es secundaria al email). */
export async function crearNotificacion(
  usuarioId: string | null,
  tipo: string,
  contenido: string
) {
  if (!usuarioId) return;
  const sb = clienteServidor();
  const { error } = await sb
    .from("notificaciones")
    .insert({ usuario_id: usuarioId, tipo, contenido });
  if (error) console.error("No se pudo crear la notificación:", error.message);
}

/** No leídas del usuario logueado (para la campanita). Solo lee, sin upsert. */
export async function obtenerNoLeidas(clerkId: string): Promise<Notificacion[]> {
  const sb = clienteServidor();
  const { data: usuario } = await sb
    .from("usuarios")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!usuario) return [];
  const { data } = await sb
    .from("notificaciones")
    .select("id,tipo,contenido,creado_el")
    .eq("usuario_id", usuario.id)
    .eq("leida", false)
    .order("creado_el", { ascending: false })
    .limit(10);
  return (data ?? []).map((n) => ({
    id: n.id,
    tipo: n.tipo,
    contenido: n.contenido,
    creadaEl: n.creado_el,
  }));
}

/** Marca todas las notificaciones del usuario actual como leídas */
export async function marcarNotificacionesLeidas() {
  const yo = await asegurarUsuario();
  if (!yo) return;
  const sb = clienteServidor();
  await sb
    .from("notificaciones")
    .update({ leida: true })
    .eq("usuario_id", yo.id)
    .eq("leida", false);
  revalidatePath("/", "layout");
}
