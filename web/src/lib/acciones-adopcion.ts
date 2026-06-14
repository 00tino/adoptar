"use server";

// Postulación de adopción: una persona completa un formulario en la ficha del
// animal. Se guarda en `postulaciones`, se avisa por email + notificación a
// quien lo publica, y el refugio la gestiona desde /mi-refugio.

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { campoTexto, limitarPorIp } from "./limites";
import { asegurarUsuario } from "./usuarios";
import { emailNuevaPostulacion, emailPostulacionRecibida } from "./emails";
import { crearNotificacion } from "./notificaciones";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function postularAdopcion(formData: FormData) {
  await limitarPorIp("postular-adopcion", 5, 60); // máx 5/h por IP
  const sb = clienteServidor();

  const animalId = String(formData.get("animal_id"));
  const nombre = campoTexto(formData.get("nombre"), 80);
  const email = campoTexto(formData.get("email"), 120);
  const telefono = campoTexto(formData.get("telefono"), 40) || null;
  const vivienda = campoTexto(formData.get("vivienda"), 200) || null;
  const mensaje = campoTexto(formData.get("mensaje"), 1500);
  if (!animalId || !nombre || !email) {
    throw new Error("Completá tu nombre y email.");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Revisá tu email.");
  }

  // El animal debe existir y estar disponible (no se postula a uno adoptado)
  const { data: animal } = await sb
    .from("animales")
    .select("id,nombre,estado,refugios(usuario_id,email,nombre)")
    .eq("id", animalId)
    .maybeSingle();
  if (!animal || animal.estado === "adoptado" || animal.estado === "rechazado") {
    throw new Error("Esta publicación ya no recibe postulaciones.");
  }

  const yo = await asegurarUsuario();
  const { error } = await sb.from("postulaciones").insert({
    animal_id: animalId,
    usuario_id: yo?.id ?? null,
    nombre,
    email,
    telefono,
    vivienda,
    mensaje,
  });
  if (error) throw new Error(`No pudimos enviar tu postulación: ${error.message}`);

  // Avisar a quien lo publica (email + notificación). No corta si el mail falla.
  const refugio = Array.isArray(animal.refugios) ? animal.refugios[0] : animal.refugios;
  const emailDestino = (refugio as { email?: string } | null)?.email;
  if (emailDestino) {
    await emailNuevaPostulacion(emailDestino, {
      animal: animal.nombre,
      nombre,
      email,
      telefono,
      vivienda,
      mensaje,
    });
  }
  await crearNotificacion(
    (refugio as { usuario_id?: string } | null)?.usuario_id ?? null,
    "adopcion",
    `Nueva postulación para adoptar a ${animal.nombre} 🐾`
  );

  // Confirmación al postulante (no corta el flujo si el email falla).
  await emailPostulacionRecibida(email, nombre, animal.nombre);

  // Reenganche con el chat: si el postulante está logueado, sembramos un
  // mensaje en la conversación del animal para que postulación y chat no
  // queden desconectados (aparece en /mensajes para ambos y pueden seguir
  // hablando ahí). No mandamos notificación/email extra: la postulación ya
  // avisó al refugio más arriba.
  const publicaId = (refugio as { usuario_id?: string } | null)?.usuario_id ?? null;
  if (yo?.id && publicaId && publicaId !== yo.id) {
    const saludo = `Hola, me postulé para adoptar a ${animal.nombre}. 🐾`;
    const cuerpo = mensaje ? `${saludo}\n\n${mensaje}` : saludo;
    await sb.from("mensajes").insert({
      sender_id: yo.id,
      receiver_id: publicaId,
      animal_id: animalId,
      contenido: cuerpo.slice(0, 2000),
    });
  }

  redirect(`/animales/${String(formData.get("slug"))}?postulado=1`);
}

export interface MiPostulacion {
  id: string;
  animalNombre: string;
  animalSlug: string;
  estado: "postulado" | "en_proceso" | "aceptada" | "rechazada";
  creadoEl: string;
}

/** Postulaciones del usuario logueado, para el seguimiento de su estado. */
export async function misPostulaciones(): Promise<MiPostulacion[]> {
  const yo = await asegurarUsuario();
  if (!yo) return [];
  const sb = clienteServidor();
  const { data } = await sb
    .from("postulaciones")
    .select("id,estado,creado_el,animales(nombre,slug)")
    .eq("usuario_id", yo.id)
    .order("creado_el", { ascending: false });
  return (data ?? []).map((p) => {
    const animal = Array.isArray(p.animales) ? p.animales[0] : p.animales;
    return {
      id: p.id,
      animalNombre: (animal as { nombre?: string } | null)?.nombre ?? "—",
      animalSlug: (animal as { slug?: string } | null)?.slug ?? "",
      estado: p.estado,
      creadoEl: p.creado_el,
    };
  });
}
