"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { exigirUsuarioActivo } from "./usuarios";
import { campoTexto, limitarPorIp } from "./limites";

function clienteServidor() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function miAlertaAdopcion() {
  const yo = await exigirUsuarioActivo();
  const { data, error } = await clienteServidor().from("alertas_adopcion")
    .select("especie,provincia,activa").eq("usuario_id", yo.id).maybeSingle();
  if (error) throw new Error("No pudimos cargar tu alerta.");
  return data as { especie: string | null; provincia: string | null; activa: boolean } | null;
}

export async function guardarAlertaAdopcion(_anterior: { error?: string; mensaje?: string }, formData: FormData): Promise<{ error?: string; mensaje?: string }> {
  try {
    const yo = await exigirUsuarioActivo();
    await limitarPorIp("alerta-adopcion", 20, 60);
    const especie = campoTexto(formData.get("especie"), 20) || null;
    const provincia = campoTexto(formData.get("provincia"), 80) || null;
    if (especie && !["perro", "gato", "otro"].includes(especie)) return { error: "Elegí una especie válida." };
    if (provincia && !/^[\p{L} .'-]+$/u.test(provincia)) return { error: "Revisá el nombre de la provincia." };
    const activa = formData.get("activa") === "on";
    const { error } = await clienteServidor().from("alertas_adopcion").upsert({
      usuario_id: yo.id, especie, provincia, activa,
    }, { onConflict: "usuario_id" });
    if (error) throw error;
    revalidatePath("/animales/alertas");
    return { mensaje: activa ? "Alerta guardada. Te avisamos por email cuando se publique un animal que coincida." : "Alerta pausada. No vas a recibir nuevos avisos." };
  } catch {
    return { error: "No pudimos guardar la alerta. Revisá tu sesión e intentá de nuevo." };
  }
}
