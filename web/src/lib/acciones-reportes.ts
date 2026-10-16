"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { exigirUsuarioActivo } from "./usuarios";
import { esAdmin } from "./auth";
import { campoTexto, limitarPorIp } from "./limites";

function clienteServidor() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function reportarPublicacion(_anterior: { error?: string; mensaje?: string }, formData: FormData): Promise<{ error?: string; mensaje?: string }> {
  try {
    const yo = await exigirUsuarioActivo();
    await limitarPorIp("reportar-publicacion", 10, 60);
    const animalId = String(formData.get("animal_id") ?? "");
    const motivo = String(formData.get("motivo") ?? "");
    const detalle = campoTexto(formData.get("detalle"), 1500);
    if (!/^[0-9a-f-]{36}$/i.test(animalId) || !["fraude", "maltrato", "datos_incorrectos", "otro"].includes(motivo)) {
      return { error: "Elegí un motivo válido para esta publicación." };
    }
    if (detalle.length < 10) return { error: "Contanos qué pasó en al menos 10 caracteres." };
    const sb = clienteServidor();
    const { data: animal, error: lectura } = await sb.from("animales").select("id")
      .eq("id", animalId).in("estado", ["disponible", "en_proceso", "adoptado"]).maybeSingle();
    if (lectura) throw lectura;
    if (!animal) return { error: "Esta publicación ya no está disponible." };
    const { error } = await sb.from("reportes_publicaciones").upsert({
      animal_id: animalId, usuario_id: yo.id, motivo, detalle,
    }, { onConflict: "animal_id,usuario_id", ignoreDuplicates: true });
    if (error) throw error;
    revalidatePath("/admin/reportes");
    return { mensaje: "Recibimos tu reporte. El equipo de AdoptAR lo va a revisar." };
  } catch {
    return { error: "No pudimos enviar el reporte. Revisá tu sesión e intentá de nuevo." };
  }
}

export async function listarReportes(pagina = 1) {
  if (!(await esAdmin())) throw new Error("Solo el administrador puede ver los reportes.");
  const desde = (Math.max(1, Math.floor(pagina)) - 1) * 20;
  const { data, count, error } = await clienteServidor().from("reportes_publicaciones")
    .select("id,motivo,detalle,creado_el,animales(id,nombre,slug,estado),usuarios(nombre)", { count: "exact" })
    .eq("estado", "pendiente").order("creado_el").range(desde, desde + 19);
  if (error) throw new Error("No pudimos cargar los reportes.");
  return { reportes: data ?? [], total: count ?? 0 };
}

export async function resolverReporte(formData: FormData) {
  if (!(await esAdmin())) throw new Error("Solo el administrador puede resolver reportes.");
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!["resuelto", "descartado"].includes(estado)) throw new Error("Estado inválido.");
  const { error } = await clienteServidor().from("reportes_publicaciones")
    .update({ estado }).eq("id", id).eq("estado", "pendiente");
  if (error) throw new Error("No pudimos guardar la revisión.");
  revalidatePath("/admin/reportes");
}
