"use server";

// Chat in-app entre interesados y quien publica el animal.
// Los mensajes viven en Supabase; quien publica recibe además un aviso
// por email (Resend) para no perder consultas aunque no entre a la app.

import { createClient } from "@supabase/supabase-js";
import { asegurarUsuario, exigirUsuarioActivo } from "./usuarios";
import { enviarEmail, escaparHtml } from "./emails";
import { esAdmin } from "./auth";
import { limitarPorIp } from "./limites";
import { crearNotificacion } from "./notificaciones";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface MensajeChat {
  id: string;
  contenido: string;
  creadoEl: string;
  esMio: boolean;
  autor: string;
}

/** Envía un mensaje sobre un animal. Requiere sesión. */
export async function enviarMensaje(animalId: string, contenido: string) {
  await limitarPorIp("enviar-mensaje", 30, 10); // máx 30 mensajes / 10 min por IP
  const yo = await exigirUsuarioActivo(); // corta si la cuenta está suspendida
  const texto = contenido.trim().slice(0, 2000);
  if (!texto) return;

  const sb = clienteServidor();

  // Buscamos el animal y a quién pertenece (refugio con email, si tiene)
  const { data: animal } = await sb
    .from("animales")
    .select("id,nombre,slug,refugio_id,refugios(email,nombre,usuario_id)")
    .eq("id", animalId)
    .single();
  if (!animal) throw new Error("El animal no existe.");

  const refugio = Array.isArray(animal.refugios) ? animal.refugios[0] : animal.refugios;
  const soyQuienPublica = refugio?.usuario_id === yo.id;

  // Receptor: si escribe un interesado, quien publica; si responde quien
  // publica, el último interesado que escribió en la conversación.
  let receptorId: string | null = refugio?.usuario_id ?? null;
  if (soyQuienPublica) {
    const { data: ultimoAjeno } = await sb
      .from("mensajes")
      .select("sender_id")
      .eq("animal_id", animalId)
      .neq("sender_id", yo.id)
      .order("creado_el", { ascending: false })
      .limit(1)
      .maybeSingle();
    receptorId = ultimoAjeno?.sender_id ?? null;
  }

  // Throttle del aviso: si yo ya escribí en esta conversación en la última
  // hora, el receptor ya recibió un email; no lo spameamos de nuevo.
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recientes } = await sb
    .from("mensajes")
    .select("id", { count: "exact", head: true })
    .eq("animal_id", animalId)
    .eq("sender_id", yo.id)
    .gte("creado_el", haceUnaHora);

  const { error } = await sb.from("mensajes").insert({
    sender_id: yo.id,
    receiver_id: receptorId,
    animal_id: animalId,
    contenido: texto,
  });
  if (error) throw new Error(error.message);

  // Notificación in-app para el receptor (la campanita del Header)
  await crearNotificacion(
    receptorId,
    "mensaje",
    `${yo.nombre} te escribió por ${animal.nombre} 💬`
  );

  if (recientes) return;

  // Email del receptor: su fila en usuarios, o el del refugio como respaldo
  let emailReceptor: string | null = null;
  if (receptorId) {
    const { data: receptor } = await sb
      .from("usuarios")
      .select("email")
      .eq("id", receptorId)
      .maybeSingle();
    emailReceptor = receptor?.email ?? null;
  }
  if (!emailReceptor && !soyQuienPublica) emailReceptor = refugio?.email ?? null;

  if (emailReceptor) {
    const urlBase = process.env.NEXT_PUBLIC_URL_BASE ?? "http://localhost:3000";
    await enviarEmail({
      para: emailReceptor,
      asunto: `Nuevo mensaje por ${animal.nombre} 🐾`,
      html: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#faf4ea;border-radius:16px;padding:32px">
        <h1 style="color:#2e2118;font-size:24px">🐾 AdoptAR</h1>
        <h2 style="color:#d95d28">${escaparHtml(yo.nombre)} te escribió por ${escaparHtml(animal.nombre)}</h2>
        <p style="color:#5c4a3a;font-size:16px;line-height:1.6;background:#fffdf8;border-radius:8px;padding:16px">${escaparHtml(texto)}</p>
        <p style="color:#5c4a3a;font-size:14px">Respondé desde tu bandeja de mensajes:</p>
        <a href="${urlBase}/mensajes" style="color:#d95d28;font-weight:bold">Ver la conversación →</a>
      </div>`,
    });
  }
}

export interface Conversacion {
  animalId: string;
  animalNombre: string;
  animalSlug: string;
  /** Nombre del interlocutor (el otro participante) */
  interlocutor: string;
  interlocutorId: string | null;
  ultimoMensaje: string;
  ultimaFecha: string;
  noLeidos: number;
}

/** Conversaciones del usuario actual, agrupadas por animal + interlocutor */
export async function obtenerConversaciones(): Promise<Conversacion[]> {
  const yo = await asegurarUsuario();
  if (!yo) return [];
  const sb = clienteServidor();

  const { data, error } = await sb
    .from("mensajes")
    .select(
      "id,contenido,creado_el,leido,sender_id,receiver_id,animal_id,animales(nombre,slug),usuarios!mensajes_sender_id_fkey(nombre)"
    )
    .or(`sender_id.eq.${yo.id},receiver_id.eq.${yo.id}`)
    .order("creado_el", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  const mapa = new Map<string, Conversacion>();
  for (const m of data ?? []) {
    const esMio = m.sender_id === yo.id;
    const otroId = esMio ? m.receiver_id : m.sender_id;
    const clave = `${m.animal_id}|${otroId ?? "?"}`;
    const animal = Array.isArray(m.animales) ? m.animales[0] : m.animales;
    const autor = Array.isArray(m.usuarios) ? m.usuarios[0] : m.usuarios;

    let conv = mapa.get(clave);
    if (!conv) {
      conv = {
        animalId: m.animal_id,
        animalNombre: (animal as { nombre?: string } | null)?.nombre ?? "Animal",
        animalSlug: (animal as { slug?: string } | null)?.slug ?? "",
        interlocutor: esMio
          ? "Interesado/a" // el nombre real aparece apenas responde
          : ((autor as { nombre?: string } | null)?.nombre ?? "Usuario"),
        interlocutorId: otroId,
        ultimoMensaje: m.contenido,
        ultimaFecha: m.creado_el,
        noLeidos: 0,
      };
      mapa.set(clave, conv);
    } else if (!esMio && conv.interlocutor === "Interesado/a") {
      conv.interlocutor = (autor as { nombre?: string } | null)?.nombre ?? "Usuario";
    }
    if (!esMio && !m.leido) conv.noLeidos += 1;
  }
  return [...mapa.values()];
}

/** Total de mensajes sin leer (para el badge del Header). Solo lee, sin upsert. */
export async function contarNoLeidos(clerkId: string): Promise<number> {
  const sb = clienteServidor();
  const { data: usuario } = await sb
    .from("usuarios")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!usuario) return 0;
  const usuarioId = usuario.id;
  const { count } = await sb
    .from("mensajes")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", usuarioId)
    .eq("leido", false);
  return count ?? 0;
}

/** Mensajes de un animal visibles para el usuario actual (participante o admin) */
export async function obtenerMensajes(animalId: string): Promise<MensajeChat[]> {
  const yo = await asegurarUsuario();
  if (!yo) return [];
  const admin = await esAdmin();

  const sb = clienteServidor();
  const { data, error } = await sb
    .from("mensajes")
    .select("id,contenido,creado_el,sender_id,receiver_id,usuarios!mensajes_sender_id_fkey(nombre)")
    .eq("animal_id", animalId)
    .order("creado_el");
  if (error) throw new Error(error.message);

  // Abrir la conversación marca como leídos los mensajes dirigidos a mí
  await sb
    .from("mensajes")
    .update({ leido: true })
    .eq("animal_id", animalId)
    .eq("receiver_id", yo.id)
    .eq("leido", false);

  return (data ?? [])
    // Solo participantes (o admin) pueden leer la conversación
    .filter((m) => admin || m.sender_id === yo.id || m.receiver_id === yo.id)
    .map((m) => {
      const autor = Array.isArray(m.usuarios) ? m.usuarios[0] : m.usuarios;
      return {
        id: m.id,
        contenido: m.contenido,
        creadoEl: m.creado_el,
        esMio: m.sender_id === yo.id,
        autor: (autor as { nombre?: string } | null)?.nombre ?? "Usuario",
      };
    });
}
