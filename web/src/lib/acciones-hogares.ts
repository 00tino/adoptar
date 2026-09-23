"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuarioActivo } from "./usuarios";
import { campoTexto, limitarPorIp } from "./limites";
import { crearNotificacion } from "./notificaciones";
import { enviarEmail, escaparHtml } from "./emails";

const ESPECIES = ["perro", "gato", "otro"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface HogarTransito {
  id: string;
  nombre: string;
  ciudad: string;
  provincia: string;
  especies: string[];
  cupos: number;
  descripcion: string;
  disponible: boolean;
  usuarioId: string;
}

function aHogar(fila: {
  id: string;
  nombre_publico: string;
  ciudad: string;
  provincia: string;
  especies: string[];
  cupos: number;
  descripcion: string;
  disponible: boolean;
  usuario_id: string;
}): HogarTransito {
  return {
    id: fila.id,
    nombre: fila.nombre_publico,
    ciudad: fila.ciudad,
    provincia: fila.provincia,
    especies: fila.especies,
    cupos: fila.cupos,
    descripcion: fila.descripcion,
    disponible: fila.disponible,
    usuarioId: fila.usuario_id,
  };
}

const CAMPOS = "id,nombre_publico,ciudad,provincia,especies,cupos,descripcion,disponible,usuario_id";

/** La lista pública recibe solo zona y disponibilidad, nunca contacto. */
export async function listarHogares(provincia: string, especie: string): Promise<HogarTransito[]> {
  const sb = clienteServidor();
  let consulta = sb.from("hogares_transito").select(CAMPOS).eq("disponible", true);
  const zona = provincia.trim().replace(/[%_,]/g, "").slice(0, 60);
  if (zona) consulta = consulta.ilike("provincia", `%${zona}%`);
  if (ESPECIES.includes(especie)) consulta = consulta.contains("especies", [especie]);
  const { data, error } = await consulta.order("actualizado_el", { ascending: false }).limit(60);
  if (error) throw new Error("No pudimos cargar los hogares disponibles.");
  return (data ?? []).map(aHogar);
}

export async function obtenerHogar(id: string): Promise<HogarTransito | null> {
  if (!UUID.test(id)) return null;
  const sb = clienteServidor();
  const { data, error } = await sb
    .from("hogares_transito")
    .select(CAMPOS)
    .eq("id", id)
    .eq("disponible", true)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar este hogar.");
  return data ? aHogar(data) : null;
}

export async function miHogar(): Promise<HogarTransito | null> {
  const yo = await exigirUsuarioActivo();
  const sb = clienteServidor();
  const { data, error } = await sb
    .from("hogares_transito")
    .select(CAMPOS)
    .eq("usuario_id", yo.id)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar tu disponibilidad.");
  return data ? aHogar(data) : null;
}

export async function guardarHogar(formData: FormData) {
  await limitarPorIp("guardar-hogar-transito", 10, 60);
  const yo = await exigirUsuarioActivo();
  const nombre = campoTexto(formData.get("nombre"), 80);
  const ciudad = campoTexto(formData.get("ciudad"), 80);
  const provincia = campoTexto(formData.get("provincia"), 80);
  const descripcion = campoTexto(formData.get("descripcion"), 600);
  const cupos = Number(formData.get("cupos"));
  const especies = [...new Set(formData.getAll("especies").map(String))]
    .filter((valor) => ESPECIES.includes(valor));
  if (!nombre || !ciudad || !provincia || especies.length === 0) {
    throw new Error("Completá tu nombre, ciudad, provincia y los animales que podés recibir.");
  }
  if (!Number.isInteger(cupos) || cupos < 1 || cupos > 10) {
    throw new Error("Indicá entre 1 y 10 lugares disponibles.");
  }
  const sb = clienteServidor();
  const { error } = await sb.from("hogares_transito").upsert({
    usuario_id: yo.id,
    nombre_publico: nombre,
    ciudad,
    provincia,
    especies,
    cupos,
    descripcion,
    disponible: formData.get("disponible") === "on",
    actualizado_el: new Date().toISOString(),
  }, { onConflict: "usuario_id" });
  if (error) throw new Error("No pudimos guardar tu disponibilidad.");
  revalidatePath("/transito/hogares");
  revalidatePath("/transito/ofrecer");
  redirect("/transito/ofrecer?guardado=1");
}

export async function solicitarHogar(formData: FormData) {
  await limitarPorIp("solicitar-hogar-transito", 5, 60);
  const yo = await exigirUsuarioActivo();
  const hogarId = campoTexto(formData.get("hogar_id"), 36);
  const mensaje = campoTexto(formData.get("mensaje"), 1500);
  if (!UUID.test(hogarId) || mensaje.length < 20) {
    throw new Error("Contá qué animal necesita tránsito, dónde está y por cuánto tiempo.");
  }
  const sb = clienteServidor();
  const { data: hogar } = await sb
    .from("hogares_transito")
    .select("id,usuario_id,nombre_publico,disponible")
    .eq("id", hogarId)
    .maybeSingle();
  if (!hogar?.disponible || hogar.usuario_id === yo.id) {
    throw new Error("Este hogar ya no está disponible.");
  }
  const { error } = await sb.from("solicitudes_hogar_transito").insert({
    hogar_id: hogarId,
    solicitante_id: yo.id,
    mensaje,
  });
  if (error) throw new Error("No pudimos enviar la solicitud.");

  await crearNotificacion(hogar.usuario_id, "mensaje", `${yo.nombre} te pidió ayuda para un tránsito 💛`);
  const { data: destinatario } = await sb
    .from("usuarios")
    .select("email")
    .eq("id", hogar.usuario_id)
    .maybeSingle();
  if (destinatario?.email) {
    await enviarEmail({
      para: destinatario.email,
      asunto: "Nueva solicitud para tu hogar de tránsito 💛",
      html: `<p>${escaparHtml(yo.nombre)} te envió una solicitud de tránsito en AdoptAR.</p><p>Leé el mensaje y respondé desde <a href="https://adoptar.dpdns.org/transito/ofrecer">tu espacio de tránsito</a>.</p>`,
    });
  }
  revalidatePath("/transito/ofrecer");
  redirect(`/transito/hogares/${hogarId}?enviado=1`);
}

export interface SolicitudRecibida {
  id: string;
  nombre: string;
  email: string;
  mensaje: string;
  creadoEl: string;
}

export async function solicitudesRecibidas(): Promise<SolicitudRecibida[]> {
  const yo = await exigirUsuarioActivo();
  const sb = clienteServidor();
  const { data: hogar } = await sb
    .from("hogares_transito")
    .select("id")
    .eq("usuario_id", yo.id)
    .maybeSingle();
  if (!hogar) return [];
  const { data, error } = await sb
    .from("solicitudes_hogar_transito")
    .select("id,mensaje,creado_el,usuarios!solicitudes_hogar_transito_solicitante_id_fkey(nombre,email)")
    .eq("hogar_id", hogar.id)
    .order("creado_el", { ascending: false })
    .limit(50);
  if (error) throw new Error("No pudimos cargar tus solicitudes.");
  return (data ?? []).map((fila) => {
    const usuario = Array.isArray(fila.usuarios) ? fila.usuarios[0] : fila.usuarios;
    return {
      id: fila.id,
      nombre: usuario?.nombre ?? "Rescatista",
      email: usuario?.email ?? "",
      mensaje: fila.mensaje,
      creadoEl: fila.creado_el,
    };
  });
}
