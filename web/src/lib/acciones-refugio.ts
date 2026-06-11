"use server";

// Acciones del panel "Mi refugio": un refugio verificado o estrella gestiona
// sus propios animales (publicar, editar, cambiar estado, dar de baja).
// Cada acción vuelve a verificar en el servidor que el animal sea del refugio.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asegurarUsuario } from "./usuarios";
import { campoTexto, limitarPorIp } from "./limites";
import { generarSlug, subirArchivos } from "./archivos";

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
  const { data } = await sb
    .from("refugios")
    .select("id,slug,nombre,estado,ciudad,provincia,lat,lng")
    .eq("usuario_id", yo.id)
    .in("estado", ["verificado", "estrella"])
    .maybeSingle();
  return (data as MiRefugio | null) ?? null;
}

export interface AnimalDeRefugio {
  id: string;
  slug: string;
  nombre: string;
  especie: "perro" | "gato" | "otro";
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
    .select("id,slug,nombre,especie,estado,fotos,creado_el")
    .eq("refugio_id", refugio.id)
    .order("creado_el", { ascending: false });
  return (data ?? []).map((f) => ({
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    especie: f.especie,
    estado: f.estado,
    foto: Array.isArray(f.fotos) && f.fotos.length > 0 ? f.fotos[0] : null,
    creadoEl: f.creado_el,
  }));
}

async function exigirRefugio(): Promise<MiRefugio> {
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
      .select("fotos")
      .eq("id", animalId)
      .single();
    const existentes: string[] = Array.isArray(actual?.fotos) ? actual.fotos : [];
    actualizacion = { ...datos, fotos: [...existentes, ...urls].slice(0, 10) };
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
