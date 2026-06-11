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

// ---------- Gestión de usuarios ----------

export interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string;
  tipo: string;
  suspendido: boolean;
  creadoEl: string;
}

/** Busca usuarios por email o nombre (o lista los últimos si no hay búsqueda) */
export async function buscarUsuarios(q: string): Promise<UsuarioAdmin[]> {
  await exigirAdmin();
  const sb = clienteServidor();
  let consulta = sb
    .from("usuarios")
    .select("id,email,nombre,tipo,suspendido,creado_el")
    .order("creado_el", { ascending: false })
    .limit(30);
  const limpio = q.replace(/[^\p{L}\p{N}@. \-_]/gu, "").trim().slice(0, 80);
  if (limpio) {
    consulta = consulta.or(`email.ilike.%${limpio}%,nombre.ilike.%${limpio}%`);
  }
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    tipo: u.tipo,
    suspendido: u.suspendido,
    creadoEl: u.creado_el,
  }));
}

/** Suspende o reactiva una cuenta. Las acciones del server respetan el flag. */
export async function alternarSuspension(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const suspender = String(formData.get("accion")) === "suspender";
  const sb = clienteServidor();
  const { error } = await sb
    .from("usuarios")
    .update({ suspendido: suspender })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ---------- Evolución mensual ----------

export interface MesEvolucion {
  mes: string; // "2026-06"
  publicados: number;
  adoptados: number;
}

/** Animales publicados y adoptados por mes (últimos 12), con lo que hay en la base */
export async function obtenerEvolucionMensual(): Promise<MesEvolucion[]> {
  await exigirAdmin();
  const sb = clienteServidor();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - 11);
  desde.setDate(1);
  const { data, error } = await sb
    .from("animales")
    .select("creado_el,estado")
    .gte("creado_el", desde.toISOString());
  if (error) throw new Error(error.message);

  const meses = new Map<string, MesEvolucion>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(desde.getFullYear(), desde.getMonth() + i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.set(clave, { mes: clave, publicados: 0, adoptados: 0 });
  }
  for (const a of data ?? []) {
    const clave = String(a.creado_el).slice(0, 7);
    const mes = meses.get(clave);
    if (!mes) continue;
    mes.publicados += 1;
    if (a.estado === "adoptado") mes.adoptados += 1;
  }
  return [...meses.values()];
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
