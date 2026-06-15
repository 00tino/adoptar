"use server";

// Acciones del panel "Mi refugio": un refugio verificado o estrella gestiona
// sus propios animales (publicar, editar, cambiar estado, dar de baja).
// Cada acción vuelve a verificar en el servidor que el animal sea del refugio.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asegurarUsuario, exigirUsuarioActivo } from "./usuarios";
import { campoTexto, limitarPorIp } from "./limites";
import { generarSlug, subirArchivos } from "./archivos";
import { resolverEmbedVideo, validarUrlRed } from "./embeds";
import { esCausa } from "./causas";
import { emailEstadoPostulacion } from "./emails";
import { crearNotificacion } from "./notificaciones";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface MiRefugio {
  id: string;
  slug: string;
  nombre: string;
  estado: "verificado" | "estrella";
  ciudad: string;
  provincia: string;
  lat: number | null;
  lng: number | null;
  descripcion: string;
  historia: string;
  fotos: string[];
  video_url: string | null;
  redes: { instagram?: string; facebook?: string };
}

/** Versión liviana para el Header: ¿el usuario logueado tiene refugio aprobado?
 *  Solo lee (no hace upsert), así no carga cada render de página. */
export async function tieneRefugio(clerkId: string): Promise<boolean> {
  const sb = clienteServidor();
  const { data: usuario } = await sb
    .from("usuarios")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!usuario) return false;
  const { count } = await sb
    .from("refugios")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuario.id)
    .in("estado", ["verificado", "estrella"]);
  return (count ?? 0) > 0;
}

/** Refugio (verificado/estrella) del usuario logueado, o null */
export async function miRefugio(): Promise<MiRefugio | null> {
  const yo = await asegurarUsuario();
  if (!yo) return null;
  const sb = clienteServidor();
  // select("*"): tolera columnas nuevas que todavía no migraron en la base
  const { data } = await sb
    .from("refugios")
    .select("*")
    .eq("usuario_id", yo.id)
    .in("estado", ["verificado", "estrella"])
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    nombre: data.nombre,
    estado: data.estado,
    ciudad: data.ciudad,
    provincia: data.provincia,
    lat: data.lat,
    lng: data.lng,
    descripcion: data.descripcion ?? "",
    historia: data.historia ?? "",
    fotos: Array.isArray(data.fotos) ? data.fotos : [],
    video_url: data.video_url ?? null,
    redes: data.redes && typeof data.redes === "object" ? data.redes : {},
  };
}

export interface AnimalDeRefugio {
  id: string;
  slug: string;
  nombre: string;
  especie: "perro" | "gato" | "otro";
  sexo: string | null;
  tamano: string | null;
  raza: string | null;
  edadMeses: number | null;
  castrado: boolean;
  vacunas: string[];
  descripcion: string;
  estado: string;
  foto: string | null;
  creadoEl: string;
}

/** Todos los animales del refugio del usuario, incluso pendientes y dados de baja */
export async function misAnimales(): Promise<AnimalDeRefugio[]> {
  const refugio = await miRefugio();
  if (!refugio) return [];
  const sb = clienteServidor();
  const { data } = await sb
    .from("animales")
    .select("id,slug,nombre,especie,sexo,tamano,raza,edad_meses,castrado,vacunas,descripcion,estado,fotos,creado_el")
    .eq("refugio_id", refugio.id)
    .order("creado_el", { ascending: false });
  return (data ?? []).map((f) => ({
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    especie: f.especie,
    sexo: f.sexo,
    tamano: f.tamano,
    raza: f.raza,
    edadMeses: f.edad_meses,
    castrado: Boolean(f.castrado),
    vacunas: Array.isArray(f.vacunas) ? f.vacunas : [],
    descripcion: f.descripcion ?? "",
    estado: f.estado,
    foto: Array.isArray(f.fotos) && f.fotos.length > 0 ? f.fotos[0] : null,
    creadoEl: f.creado_el,
  }));
}

export async function exigirRefugio(): Promise<MiRefugio> {
  await exigirUsuarioActivo(); // corta si la cuenta está suspendida
  const refugio = await miRefugio();
  if (!refugio) {
    throw new Error("Esta acción es solo para refugios verificados.");
  }
  return refugio;
}

/** Verifica que el animal pertenezca al refugio antes de tocarlo */
async function exigirAnimalPropio(
  sb: ReturnType<typeof clienteServidor>,
  refugioId: string,
  animalId: string
) {
  const { data } = await sb
    .from("animales")
    .select("id")
    .eq("id", animalId)
    .eq("refugio_id", refugioId)
    .maybeSingle();
  if (!data) throw new Error("Ese animal no es de tu refugio.");
}

/** Lee los datos del formulario comunes a publicar y editar */
function datosAnimalDeFormulario(formData: FormData) {
  const nombre = campoTexto(formData.get("nombre"), 80);
  if (!nombre) throw new Error("El nombre es obligatorio.");
  const especieCruda = String(formData.get("especie") ?? "otro");
  const tamanoCrudo = String(formData.get("tamano") ?? "mediano");
  const edadMeses = Math.min(Math.max(Number(formData.get("edad_meses")) || 0, 0), 600);
  return {
    nombre,
    especie: ["perro", "gato", "otro"].includes(especieCruda) ? especieCruda : "otro",
    sexo: String(formData.get("sexo")) === "hembra" ? "hembra" : "macho",
    tamano: ["chico", "mediano", "grande"].includes(tamanoCrudo) ? tamanoCrudo : "mediano",
    raza: campoTexto(formData.get("raza"), 80) || null,
    edad_meses: edadMeses,
    castrado: formData.get("castrado") === "on",
    vacunas: campoTexto(formData.get("vacunas"), 300)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    descripcion: campoTexto(formData.get("descripcion"), 3000),
    historia: campoTexto(formData.get("historia"), 3000),
  };
}

/** Publica un animal del refugio. Estrella → disponible directo; verificado → cola del admin */
export async function publicarAnimalRefugio(formData: FormData) {
  await limitarPorIp("publicar-refugio", 20, 60); // máx 20 publicaciones/hora por IP
  const refugio = await exigirRefugio();
  const sb = clienteServidor();

  const datos = datosAnimalDeFormulario(formData);
  const fotos = (formData.getAll("fotos") as File[]).filter((f) => f.size > 0);
  if (fotos.length < 1) throw new Error("Subí al menos 1 foto.");
  const video = formData.get("video") as File | null;

  const urlsFotos = await subirArchivos(sb, fotos.slice(0, 6), "animales");
  const urlVideo =
    video && video.size > 0 ? (await subirArchivos(sb, [video], "videos"))[0] : null;

  const { error } = await sb.from("animales").insert({
    ...datos,
    slug: generarSlug(["adoptar", datos.especie, datos.nombre, refugio.ciudad]),
    ciudad: refugio.ciudad,
    provincia: refugio.provincia,
    lat_aprox: refugio.lat,
    lng_aprox: refugio.lng,
    tipo: "adopcion",
    // El privilegio "estrella" publica sin pasar por la cola de aprobación
    estado: refugio.estado === "estrella" ? "disponible" : "pendiente",
    fotos: urlsFotos,
    video_url: urlVideo,
    refugio_id: refugio.id,
  });
  if (error) throw new Error(`No pudimos publicar: ${error.message}`);

  revalidatePath("/animales");
  revalidatePath("/");
  redirect("/mi-refugio?publicado=1");
}

/** Edita los datos de un animal del refugio (las fotos nuevas se agregan al final) */
export async function editarAnimalRefugio(formData: FormData) {
  const refugio = await exigirRefugio();
  const sb = clienteServidor();
  const animalId = String(formData.get("id"));
  await exigirAnimalPropio(sb, refugio.id, animalId);

  const datos = datosAnimalDeFormulario(formData);
  const fotosNuevas = (formData.getAll("fotos") as File[]).filter((f) => f.size > 0);

  let actualizacion: Record<string, unknown> = datos;
  if (fotosNuevas.length > 0) {
    const urls = await subirArchivos(sb, fotosNuevas.slice(0, 6), "animales");
    const { data: actual } = await sb
      .from("animales")
      .select("fotos,estado")
      .eq("id", animalId)
      .single();
    const existentes: string[] = Array.isArray(actual?.fotos) ? actual.fotos : [];
    actualizacion = { ...datos, fotos: [...existentes, ...urls].slice(0, 10) };
    // Animal importado en 'borrador' (esperando foto): al sumar su 1ra foto ya
    // puede publicarse. Estrella → directo; verificado → cola del admin.
    if (actual?.estado === "borrador" && existentes.length === 0) {
      actualizacion.estado = refugio.estado === "estrella" ? "disponible" : "pendiente";
    }
  }

  const { error } = await sb.from("animales").update(actualizacion).eq("id", animalId);
  if (error) throw new Error(`No pudimos guardar: ${error.message}`);

  revalidatePath("/animales");
  revalidatePath("/mi-refugio");
  redirect("/mi-refugio?editado=1");
}

/** Cambia el estado: disponible → en_proceso → adoptado (y vuelta) */
export async function cambiarEstadoAnimal(formData: FormData) {
  const refugio = await exigirRefugio();
  const sb = clienteServidor();
  const animalId = String(formData.get("id"));
  const estado = String(formData.get("estado"));
  if (!["disponible", "en_proceso", "adoptado"].includes(estado)) {
    throw new Error("Estado inválido.");
  }
  await exigirAnimalPropio(sb, refugio.id, animalId);

  // Solo se puede mover entre estados públicos (no saltear la aprobación)
  const { data: animal } = await sb
    .from("animales")
    .select("estado")
    .eq("id", animalId)
    .single();
  if (!animal || !["disponible", "en_proceso", "adoptado"].includes(animal.estado)) {
    throw new Error("Ese animal todavía no está aprobado.");
  }

  const { error } = await sb.from("animales").update({ estado }).eq("id", animalId);
  if (error) throw new Error(error.message);

  revalidatePath("/animales");
  revalidatePath("/mi-refugio");
}

export interface PostulacionRefugio {
  id: string;
  animalNombre: string;
  animalSlug: string;
  nombre: string;
  email: string;
  telefono: string | null;
  vivienda: string | null;
  mensaje: string;
  estado: "postulado" | "en_proceso" | "aceptada" | "rechazada";
  creadoEl: string;
}

/** Postulaciones de adopción recibidas por los animales del refugio. */
export async function postulacionesDeRefugio(): Promise<PostulacionRefugio[]> {
  const refugio = await miRefugio();
  if (!refugio) return [];
  const sb = clienteServidor();
  // Animales del refugio → sus postulaciones
  const { data: animales } = await sb
    .from("animales")
    .select("id")
    .eq("refugio_id", refugio.id);
  const ids = (animales ?? []).map((a) => a.id);
  if (ids.length === 0) return [];
  const { data } = await sb
    .from("postulaciones")
    .select("id,nombre,email,telefono,vivienda,mensaje,estado,creado_el,animales(nombre,slug)")
    .in("animal_id", ids)
    .order("creado_el", { ascending: false });
  return (data ?? []).map((p) => {
    const animal = Array.isArray(p.animales) ? p.animales[0] : p.animales;
    return {
      id: p.id,
      animalNombre: (animal as { nombre?: string } | null)?.nombre ?? "—",
      animalSlug: (animal as { slug?: string } | null)?.slug ?? "",
      nombre: p.nombre,
      email: p.email,
      telefono: p.telefono,
      vivienda: p.vivienda,
      mensaje: p.mensaje,
      estado: p.estado,
      creadoEl: p.creado_el,
    };
  });
}

/** El refugio mueve el estado de una postulación (verifica ownership). */
export async function cambiarEstadoPostulacion(formData: FormData) {
  const refugio = await exigirRefugio();
  const sb = clienteServidor();
  const id = String(formData.get("id"));
  const estado = String(formData.get("estado"));
  if (!["postulado", "en_proceso", "aceptada", "rechazada"].includes(estado)) {
    throw new Error("Estado inválido.");
  }
  // Ownership: la postulación debe ser de un animal de este refugio
  const { data: post } = await sb
    .from("postulaciones")
    .select("animal_id,nombre,email,usuario_id,animales(refugio_id,nombre)")
    .eq("id", id)
    .maybeSingle();
  const animal = Array.isArray(post?.animales) ? post?.animales[0] : post?.animales;
  if (!post || (animal as { refugio_id?: string } | null)?.refugio_id !== refugio.id) {
    throw new Error("Esa postulación no es de tu refugio.");
  }
  const { error } = await sb.from("postulaciones").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);

  // Avisamos al postulante cuando el refugio mueve el estado (salvo volver a
  // "postulado", que es el inicial). Email + notificación in-app; ni el email
  // ni la notificación cortan el flujo si fallan.
  if (estado === "en_proceso" || estado === "aceptada" || estado === "rechazada") {
    const nombreAnimal = (animal as { nombre?: string } | null)?.nombre ?? "el animal";
    if (post.email) {
      await emailEstadoPostulacion(post.email, post.nombre, nombreAnimal, estado);
    }
    if (post.usuario_id) {
      const copy =
        estado === "aceptada"
          ? `¡Tu postulación para adoptar a ${nombreAnimal} fue aceptada! 🎉`
          : estado === "rechazada"
            ? `Tu postulación para adoptar a ${nombreAnimal} no avanzó esta vez`
            : `Tu postulación para adoptar a ${nombreAnimal} está en proceso 🐾`;
      await crearNotificacion(post.usuario_id, "adopcion", copy);
    }
  }

  revalidatePath("/mi-refugio");
}

/** Edita el perfil público del refugio: historia, fotos, video y redes.
 *  No pasa por el admin (el refugio ya está verificado). */
export async function actualizarPerfilRefugio(formData: FormData) {
  await limitarPorIp("perfil-refugio", 20, 60);
  const refugio = await exigirRefugio();
  const sb = clienteServidor();

  const descripcion = campoTexto(formData.get("descripcion"), 500);
  const historia = campoTexto(formData.get("historia"), 8000);

  // Redes: solo URLs de instagram.com / facebook.com (o vacío para borrar)
  const redes: { instagram?: string; facebook?: string } = {};
  const instagramCrudo = campoTexto(formData.get("instagram"), 200);
  const facebookCrudo = campoTexto(formData.get("facebook"), 200);
  if (instagramCrudo) {
    const url = validarUrlRed(instagramCrudo, "instagram.com");
    if (!url) throw new Error("El Instagram tiene que ser un link de instagram.com.");
    redes.instagram = url;
  }
  if (facebookCrudo) {
    const url = validarUrlRed(facebookCrudo, "facebook.com");
    if (!url) throw new Error("El Facebook tiene que ser un link de facebook.com.");
    redes.facebook = url;
  }

  // Video: archivo subido (prioridad) o link de YouTube/Instagram
  const archivoVideo = formData.get("video_archivo") as File | null;
  const linkVideo = campoTexto(formData.get("video_url"), 300);
  let videoUrl: string | null = refugio.video_url;
  if (archivoVideo && archivoVideo.size > 0) {
    videoUrl = (await subirArchivos(sb, [archivoVideo], "videos"))[0];
  } else if (linkVideo) {
    if (!resolverEmbedVideo(linkVideo)) {
      throw new Error("El video tiene que ser un link de YouTube o Instagram.");
    }
    videoUrl = linkVideo;
  } else if (formData.get("quitar_video") === "on") {
    videoUrl = null;
  }

  // Fotos: las marcadas se quitan, las nuevas se agregan al final (máx 12)
  const quitar = new Set(formData.getAll("fotos_quitar").map(String));
  let fotos = refugio.fotos.filter((f) => !quitar.has(f));
  const fotosNuevas = (formData.getAll("fotos") as File[]).filter((f) => f.size > 0);
  if (fotosNuevas.length > 0) {
    const urls = await subirArchivos(sb, fotosNuevas.slice(0, 8), "refugios");
    fotos = [...fotos, ...urls].slice(0, 12);
  }

  const { error } = await sb
    .from("refugios")
    .update({ descripcion, historia, redes, video_url: videoUrl, fotos })
    .eq("id", refugio.id);
  if (error) throw new Error(`No pudimos guardar el perfil: ${error.message}`);

  revalidatePath(`/refugios/${refugio.slug}`);
  revalidatePath("/refugios");
  redirect("/mi-refugio/perfil?guardado=1");
}

// ---------- Campañas de donación del refugio ----------

export interface CampanaDeRefugio {
  id: string;
  titulo: string;
  causa: string;
  estado: string;
  metaMonto: number | null;
  creadoEl: string;
}

/** Todas las campañas del refugio del usuario, incluso pendientes y cerradas */
export async function misCampanas(): Promise<CampanaDeRefugio[]> {
  const refugio = await miRefugio();
  if (!refugio) return [];
  const sb = clienteServidor();
  const { data } = await sb
    .from("campanas")
    .select("*")
    .eq("refugio_id", refugio.id)
    .order("creado_el", { ascending: false });
  return (data ?? []).map((f) => ({
    id: f.id,
    titulo: f.titulo,
    causa: f.causa ?? "plataforma",
    estado: f.estado,
    metaMonto: f.meta_monto ? Number(f.meta_monto) : null,
    creadoEl: f.creado_el,
  }));
}

/** Crea una campaña de donación etiquetada con su causa (entra a la cola del admin) */
export async function crearCampanaRefugio(formData: FormData) {
  await limitarPorIp("crear-campana", 10, 60);
  const refugio = await exigirRefugio();
  const sb = clienteServidor();

  const titulo = campoTexto(formData.get("titulo"), 120);
  if (!titulo) throw new Error("El título es obligatorio.");
  const descripcion = campoTexto(formData.get("descripcion"), 2000);
  const causa = String(formData.get("causa"));
  if (!esCausa(causa) || causa === "plataforma") {
    throw new Error("Elegí una causa válida para la campaña.");
  }
  const metaCruda = Math.round(Number(formData.get("meta_monto")));
  const metaMonto =
    Number.isFinite(metaCruda) && metaCruda >= 1000 && metaCruda <= 100_000_000
      ? metaCruda
      : null;

  const { error } = await sb.from("campanas").insert({
    refugio_id: refugio.id,
    titulo,
    descripcion,
    causa,
    meta_monto: metaMonto,
    tipo: "refugio",
    estado: "pendiente",
  });
  if (error) throw new Error(`No pudimos crear la campaña: ${error.message}`);

  redirect("/mi-refugio/campanas?creada=1");
}

/** Da de baja una publicación: deja de verse en el sitio (estado "rechazado") */
export async function darDeBajaAnimal(formData: FormData) {
  const refugio = await exigirRefugio();
  const sb = clienteServidor();
  const animalId = String(formData.get("id"));
  await exigirAnimalPropio(sb, refugio.id, animalId);

  const { error } = await sb
    .from("animales")
    .update({ estado: "rechazado" })
    .eq("id", animalId);
  if (error) throw new Error(error.message);

  revalidatePath("/animales");
  revalidatePath("/mi-refugio");
}
