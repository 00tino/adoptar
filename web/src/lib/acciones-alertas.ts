"use server";

// Alertas de tránsito por cercanía.
// El usuario define una zona (lat/lng) y un radio; cuando se aprueba/publica
// un animal en tránsito dentro de ese radio, le mandamos un email con la ficha.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { exigirUsuarioActivo } from "./usuarios";
import { enRadio } from "./geo";
import { emailAlertaTransito } from "./emails";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface AlertaTransito {
  id: string;
  lat: number;
  lng: number;
  radioKm: number;
  activa: boolean;
}

/** Alertas del usuario logueado (para mostrarlas en /transito/alertas). */
export async function misAlertas(): Promise<AlertaTransito[]> {
  const yo = await exigirUsuarioActivo();
  const sb = clienteServidor();
  const { data } = await sb
    .from("alertas_transito")
    .select("id,lat,lng,radio_km,activa")
    .eq("usuario_id", yo.id)
    .order("creado_el", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id,
    lat: a.lat,
    lng: a.lng,
    radioKm: a.radio_km,
    activa: a.activa,
  }));
}

const RADIOS_VALIDOS = [5, 10, 25, 50];

/** Crea (o reemplaza) la alerta del usuario. Mantenemos una sola alerta activa. */
export async function guardarAlerta(formData: FormData) {
  const yo = await exigirUsuarioActivo();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const radioKm = Number(formData.get("radio_km"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("Elegí una ubicación válida en el mapa.");
  }
  if (!RADIOS_VALIDOS.includes(radioKm)) throw new Error("Radio inválido.");

  const sb = clienteServidor();
  // Una sola alerta por usuario: borramos las anteriores y dejamos esta.
  await sb.from("alertas_transito").delete().eq("usuario_id", yo.id);
  const { error } = await sb
    .from("alertas_transito")
    .insert({ usuario_id: yo.id, lat, lng, radio_km: radioKm, activa: true });
  if (error) throw new Error(error.message);
  revalidatePath("/transito/alertas");
}

/** Activa o desactiva la alerta del usuario sin borrarla. */
export async function alternarAlerta(formData: FormData) {
  const yo = await exigirUsuarioActivo();
  const id = String(formData.get("id"));
  const activa = String(formData.get("activa")) === "true";
  const sb = clienteServidor();
  const { error } = await sb
    .from("alertas_transito")
    .update({ activa })
    .eq("id", id)
    .eq("usuario_id", yo.id); // ownership
  if (error) throw new Error(error.message);
  revalidatePath("/transito/alertas");
}

/** Borra la alerta del usuario. */
export async function borrarAlerta(formData: FormData) {
  const yo = await exigirUsuarioActivo();
  const id = String(formData.get("id"));
  const sb = clienteServidor();
  await sb.from("alertas_transito").delete().eq("id", id).eq("usuario_id", yo.id);
  revalidatePath("/transito/alertas");
}

/** Animal recién disponible para tránsito. Sin lat/lng no hay a quién avisar. */
interface AnimalParaAlerta {
  nombre: string;
  especie: string;
  ciudad: string;
  provincia: string;
  descripcion: string;
  fotos: unknown;
  slug: string;
  lat_aprox: number | null;
  lng_aprox: number | null;
  tipo: string;
}

/** Recorre las alertas activas y manda email a las que cubren al animal.
 *  Nunca tira: un fallo de email/consulta no debe cortar la aprobación. */
export async function notificarAlertasTransito(animal: AnimalParaAlerta) {
  try {
    if (animal.tipo !== "transito") return;
    if (animal.lat_aprox == null || animal.lng_aprox == null) return;

    const sb = clienteServidor();
    const { data: alertas } = await sb
      .from("alertas_transito")
      .select("lat,lng,radio_km,usuarios(email)")
      .eq("activa", true);
    if (!alertas?.length) return;

    const foto = Array.isArray(animal.fotos) ? (animal.fotos[0] as string) ?? null : null;
    const datos = {
      nombre: animal.nombre,
      especie: animal.especie,
      ciudad: animal.ciudad,
      provincia: animal.provincia,
      descripcion: animal.descripcion,
      foto,
      slug: animal.slug,
    };

    for (const a of alertas) {
      const usuario = Array.isArray(a.usuarios) ? a.usuarios[0] : a.usuarios;
      const email = (usuario as { email?: string } | null)?.email;
      if (!email) continue;
      if (enRadio(a.lat, a.lng, animal.lat_aprox, animal.lng_aprox, a.radio_km)) {
        await emailAlertaTransito(email, datos);
      }
    }
  } catch (e) {
    console.error("Error notificando alertas de tránsito:", e);
  }
}
