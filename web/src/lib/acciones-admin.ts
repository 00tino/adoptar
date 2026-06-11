"use server";

// Acciones del panel de administración: aprobar/rechazar refugios,
// animales y campañas. SOLO el admin (ADMIN_EMAIL) puede ejecutarlas —
// cada acción vuelve a verificar la sesión en el servidor.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { esAdmin } from "./auth";
import { emailRefugioAprobado, emailRefugioRechazado } from "./emails";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function exigirAdmin() {
  if (!(await esAdmin())) {
    throw new Error("Solo el administrador puede hacer esto.");
  }
}

/** Lee los pendientes de las tres tablas para mostrarlos en la cola */
export async function obtenerPendientes() {
  await exigirAdmin();
  const sb = clienteServidor();
  const [refugios, animales, campanas] = await Promise.all([
    sb.from("refugios").select("*").eq("estado", "pendiente").order("creado_el"),
    sb.from("animales").select("*").eq("estado", "pendiente").order("creado_el"),
    sb.from("campanas").select("*").eq("estado", "pendiente").order("creado_el"),
  ]);
  return {
    refugios: refugios.data ?? [],
    animales: animales.data ?? [],
    campanas: campanas.data ?? [],
  };
}

/** Estadísticas para el dashboard del admin */
export async function obtenerEstadisticas() {
  await exigirAdmin();
  const sb = clienteServidor();
  const contar = async (tabla: string, filtro?: [string, string]) => {
    let q = sb.from(tabla).select("*", { count: "exact", head: true });
    if (filtro) q = q.eq(filtro[0], filtro[1]);
    const { count } = await q;
    return count ?? 0;
  };
  const [animales, disponibles, adoptados, refugios, campanas, usuarios] =
    await Promise.all([
      contar("animales"),
      contar("animales", ["estado", "disponible"]),
      contar("animales", ["estado", "adoptado"]),
      contar("refugios", ["estado", "verificado"]),
      contar("campanas", ["estado", "activa"]),
      contar("usuarios"),
    ]);
  return { animales, disponibles, adoptados, refugios, campanas, usuarios };
}

// ---------- Decisiones de la cola ----------

export async function decidirRefugio(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")); // "aprobar" | "rechazar" | "estrella"
  const sb = clienteServidor();

  const estado =
    decision === "aprobar" ? "verificado"
    : decision === "estrella" ? "estrella"
    : "suspendido";
  const { data, error } = await sb
    .from("refugios")
    .update({ estado })
    .eq("id", id)
    .select("nombre,email")
    .single();
  if (error) throw new Error(error.message);

  // Aviso automático por email al refugio (si Resend está configurado)
  if (data?.email) {
    if (estado === "suspendido") {
      await emailRefugioRechazado(data.email, data.nombre);
    } else {
      await emailRefugioAprobado(data.email, data.nombre);
    }
  }
  revalidatePath("/admin");
  revalidatePath("/refugios");
}

export async function decidirAnimal(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")); // "aprobar" | "rechazar"
  const sb = clienteServidor();

  const estado = decision === "aprobar" ? "disponible" : "rechazado";
  const { error } = await sb.from("animales").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/animales");
  revalidatePath("/");
}

export async function decidirCampana(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")); // "aprobar" | "rechazar"
  const sb = clienteServidor();

  const estado = decision === "aprobar" ? "activa" : "cerrada";
  const { error } = await sb.from("campanas").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/donaciones");
}
