"use server";

// Acciones de servidor: reciben los formularios y guardan en Supabase
// con estado "pendiente" para que el admin los apruebe.
// Requieren Supabase configurado; si además hay Clerk, exigen sesión.

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { supabaseDisponible } from "./supabase";
import { clerkDisponible, usuarioActual } from "./auth";
import { campoTexto, limitarPorIp } from "./limites";

// Cliente con service role: solo vive en el servidor y saltea RLS
// (necesario para insertar filas "pendientes" que el público no puede leer).
function clienteServidor() {
  if (!supabaseDisponible() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase no está configurado todavía.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** Slug amigable: "Luna" en "Caballito" → "transito-perro-luna-caballito-x3k2" */
function generarSlug(partes: string[]): string {
  const base = partes
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  // Sufijo aleatorio corto para evitar colisiones
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// Tipos y tamaños permitidos por carpeta. Nada de SVG ni HTML:
// el bucket es público y un SVG puede ejecutar scripts en el navegador.
const REGLAS_ARCHIVOS: Record<string, { tipos: string[]; maxMB: number }> = {
  animales: { tipos: ["image/jpeg", "image/png", "image/webp"], maxMB: 8 },
  videos: { tipos: ["video/mp4", "video/webm", "video/quicktime"], maxMB: 60 },
};

/** Sube archivos al bucket "media" validando tipo y tamaño. Devuelve URLs públicas */
async function subirArchivos(
  sb: ReturnType<typeof clienteServidor>,
  archivos: File[],
  carpeta: keyof typeof REGLAS_ARCHIVOS
): Promise<string[]> {
  const reglas = REGLAS_ARCHIVOS[carpeta];
  const urls: string[] = [];
  for (const archivo of archivos) {
    if (!archivo || archivo.size === 0) continue;
    if (!reglas.tipos.includes(archivo.type)) {
      throw new Error(
        carpeta === "videos"
          ? "El video tiene que ser MP4, WebM o MOV."
          : "Las fotos tienen que ser JPG, PNG o WebP."
      );
    }
    if (archivo.size > reglas.maxMB * 1024 * 1024) {
      throw new Error(`Cada archivo puede pesar hasta ${reglas.maxMB} MB.`);
    }
    const ruta = `${carpeta}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await sb.storage
      .from("media")
      .upload(ruta, archivo, { contentType: archivo.type });
    if (error) throw new Error(`Error subiendo ${archivo.name}: ${error.message}`);
    urls.push(sb.storage.from("media").getPublicUrl(ruta).data.publicUrl);
  }
  return urls;
}

export async function publicarTransito(formData: FormData) {
  await limitarPorIp("publicar-transito", 5, 60); // máx 5 publicaciones/hora por IP
  const sb = clienteServidor();

  // Si Clerk está activo, exigimos sesión (los particulares deben registrarse)
  let nombreParticular = "Particular";
  if (clerkDisponible()) {
    const user = await usuarioActual();
    if (!user) throw new Error("Tenés que iniciar sesión para publicar.");
    nombreParticular = `${user.firstName ?? "Particular"} ${(user.lastName ?? "").charAt(0)}.`.trim();
  }

  const nombre = campoTexto(formData.get("nombre"), 80);
  const especieCruda = String(formData.get("especie") ?? "otro");
  const especie = ["perro", "gato", "otro"].includes(especieCruda) ? especieCruda : "otro";
  const zona = campoTexto(formData.get("zona"), 120);
  if (!nombre || !zona) throw new Error("Faltan datos obligatorios.");

  // Separar "Ciudad, Provincia" lo mejor posible
  const [ciudad, provincia = "Argentina"] = zona.split(",").map((s) => s.trim());

  const fotos = (formData.getAll("fotos") as File[]).filter((f) => f.size > 0);
  const video = formData.get("video") as File | null;
  if (fotos.length < 2) throw new Error("Subí al menos 2 fotos.");
  if (!video || video.size === 0) throw new Error("El video es obligatorio.");

  const urlsFotos = await subirArchivos(sb, fotos.slice(0, 6), "animales");
  const [urlVideo] = await subirArchivos(sb, [video], "videos");

  const { error } = await sb.from("animales").insert({
    slug: generarSlug(["transito", especie, nombre, ciudad]),
    nombre,
    especie,
    raza: campoTexto(formData.get("raza"), 80) || null,
    sexo: String(formData.get("sexo")) === "hembra" ? "hembra" : "macho",
    descripcion: campoTexto(formData.get("descripcion"), 3000),
    ciudad,
    provincia,
    tipo: "transito",
    estado: "pendiente", // ← entra a la cola de aprobación del admin
    fotos: urlsFotos,
    video_url: urlVideo,
    particular_nombre: nombreParticular,
    // particular_id se completa cuando sincronicemos usuarios de Clerk
  });
  if (error) throw new Error(`No pudimos guardar la publicación: ${error.message}`);

  redirect("/publicar-transito?enviado=1");
}

export async function registrarRefugio(formData: FormData) {
  await limitarPorIp("registrar-refugio", 3, 60); // máx 3 solicitudes/hora por IP
  const sb = clienteServidor();

  const nombre = campoTexto(formData.get("nombre"), 80);
  const ciudadProvincia = campoTexto(formData.get("ciudad"), 120);
  if (!nombre || !ciudadProvincia) throw new Error("Faltan datos obligatorios.");
  const [ciudad, provincia = "Argentina"] = ciudadProvincia.split(",").map((s) => s.trim());

  const { error } = await sb.from("refugios").insert({
    slug: generarSlug([nombre, ciudad]),
    nombre,
    descripcion: campoTexto(formData.get("descripcion"), 3000),
    direccion: campoTexto(formData.get("direccion"), 200),
    ciudad,
    provincia,
    telefono: campoTexto(formData.get("telefono"), 40) || null,
    email: campoTexto(formData.get("email"), 120) || null,
    whatsapp: campoTexto(formData.get("whatsapp"), 40) || null,
    redes: { texto: campoTexto(formData.get("redes"), 300) },
    video_url: campoTexto(formData.get("video"), 300) || null,
    estado: "pendiente", // ← revisión manual del admin
  });
  if (error) throw new Error(`No pudimos guardar la solicitud: ${error.message}`);

  redirect("/registrar-refugio?enviado=1");
}
