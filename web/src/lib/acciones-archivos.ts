"use server";

// Fase 10 — Vault privado de archivos por refugio + importador de animales.
// Cada acción reverifica en el servidor que el refugio sea del usuario logueado
// y que el archivo le pertenezca (ownership por refugio_id / carpeta).

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { exigirRefugio } from "./acciones-refugio";
import { campoTexto, limitarPorIp } from "./limites";
import { generarSlug } from "./archivos";
import {
  detectarMapeo,
  normalizarFila,
  EXT_IMPORTABLES,
  type Mapeo,
  type FilaImportada,
} from "./importador";
import { parsearPlanilla } from "./planilla";

const BUCKET = "archivos-refugio";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB por archivo
const CUOTA_BYTES = 200 * 1024 * 1024; // 200 MB acumulados por refugio (free tier)
const MAX_FILAS = 500;

// Extensiones permitidas en el vault (cualquier formato razonable de oficina).
const EXT_OK = [
  "pdf", "doc", "docx", "odt", "rtf", "txt",
  "csv", "tsv", "xls", "xlsx", "ods",
  "jpg", "jpeg", "png", "webp", "gif", "heic",
  "zip",
];
function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extension(nombre: string): string {
  return (nombre.split(".").pop() ?? "").toLowerCase();
}

function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(0, 120) || "archivo";
}

export interface ArchivoVault {
  id: string;
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
  importable: boolean;
  creadoEl: string;
}

/** Lista los archivos del refugio del usuario logueado (más nuevos primero). */
export async function listarArchivos(): Promise<ArchivoVault[]> {
  const refugio = await exigirRefugio();
  const sb = clienteServidor();
  const { data } = await sb
    .from("archivos_refugio")
    .select("id,nombre,tipo_mime,tamano_bytes,creado_el")
    .eq("refugio_id", refugio.id)
    .order("creado_el", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    tipoMime: a.tipo_mime,
    tamanoBytes: Number(a.tamano_bytes),
    importable: EXT_IMPORTABLES.includes(extension(a.nombre)),
    creadoEl: a.creado_el,
  }));
}

/** Sube un archivo al bucket privado y guarda sus metadatos. */
export async function subirArchivoVault(formData: FormData) {
  await limitarPorIp("vault-subir", 30, 60);
  const refugio = await exigirRefugio();
  const sb = clienteServidor();

  const archivo = formData.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) throw new Error("Elegí un archivo para subir.");
  if (!EXT_OK.includes(extension(archivo.name))) {
    throw new Error("Formato no permitido. Subí PDF, Word, Excel, CSV, imágenes o ZIP.");
  }
  if (archivo.size > MAX_BYTES) {
    throw new Error("Cada archivo puede pesar hasta 20 MB.");
  }

  // Cuota acumulada por refugio (free tier de Storage)
  const { data: usados } = await sb
    .from("archivos_refugio")
    .select("tamano_bytes")
    .eq("refugio_id", refugio.id);
  const total = (usados ?? []).reduce((s, a) => s + Number(a.tamano_bytes), 0);
  if (total + archivo.size > CUOTA_BYTES) {
    throw new Error("Te quedaste sin espacio (200 MB por refugio). Borrá algún archivo viejo.");
  }

  const nombre = nombreSeguro(archivo.name);
  const ruta = `${refugio.id}/${Date.now()}-${nombre}`;
  const { error: errSubida } = await sb.storage
    .from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream" });
  if (errSubida) throw new Error(`No pudimos subir el archivo: ${errSubida.message}`);

  const { error } = await sb.from("archivos_refugio").insert({
    refugio_id: refugio.id,
    nombre,
    ruta,
    tipo_mime: archivo.type || "application/octet-stream",
    tamano_bytes: archivo.size,
  });
  if (error) {
    await sb.storage.from(BUCKET).remove([ruta]); // no dejar huérfano
    throw new Error(`No pudimos guardar el archivo: ${error.message}`);
  }

  revalidatePath("/mi-refugio/archivos");
}

/** Devuelve una signed URL de corta duración para descargar un archivo propio. */
export async function urlDescarga(id: string): Promise<string> {
  const refugio = await exigirRefugio();
  const sb = clienteServidor();
  const { data: fila } = await sb
    .from("archivos_refugio")
    .select("ruta")
    .eq("id", id)
    .eq("refugio_id", refugio.id)
    .maybeSingle();
  if (!fila) throw new Error("Ese archivo no es de tu refugio.");
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(fila.ruta, 60);
  if (error || !data) throw new Error("No pudimos generar el link de descarga.");
  return data.signedUrl;
}

/** Borra un archivo propio (Storage + fila de metadatos). */
export async function borrarArchivo(formData: FormData) {
  const refugio = await exigirRefugio();
  const sb = clienteServidor();
  const id = String(formData.get("id"));
  const { data: fila } = await sb
    .from("archivos_refugio")
    .select("ruta")
    .eq("id", id)
    .eq("refugio_id", refugio.id)
    .maybeSingle();
  if (!fila) throw new Error("Ese archivo no es de tu refugio.");
  await sb.storage.from(BUCKET).remove([fila.ruta]);
  await sb.from("archivos_refugio").delete().eq("id", id);
  revalidatePath("/mi-refugio/archivos");
}

export interface PrevisualizacionImport {
  encabezados: string[];
  mapeo: Mapeo;
  filasRaw: string[][]; // crudas, para re-mapear columnas en el cliente
  filas: FilaImportada[];
  listas: number;
  conProblemas: number;
}

/** Lee una planilla (archivo subido o uno del vault) y devuelve el preview. */
export async function previsualizarImport(
  formData: FormData
): Promise<PrevisualizacionImport> {
  await limitarPorIp("vault-preview", 30, 60);
  const refugio = await exigirRefugio();
  const sb = clienteServidor();

  let buffer: Buffer;
  let nombre: string;
  const archivoId = campoTexto(formData.get("archivoId"), 64);
  if (archivoId) {
    const { data: fila } = await sb
      .from("archivos_refugio")
      .select("ruta,nombre")
      .eq("id", archivoId)
      .eq("refugio_id", refugio.id)
      .maybeSingle();
    if (!fila) throw new Error("Ese archivo no es de tu refugio.");
    nombre = fila.nombre;
    const { data, error } = await sb.storage.from(BUCKET).download(fila.ruta);
    if (error || !data) throw new Error("No pudimos leer el archivo.");
    buffer = Buffer.from(await data.arrayBuffer());
  } else {
    const archivo = formData.get("archivo") as File | null;
    if (!archivo || archivo.size === 0) throw new Error("Elegí una planilla.");
    if (archivo.size > MAX_BYTES) throw new Error("La planilla puede pesar hasta 20 MB.");
    nombre = archivo.name;
    buffer = Buffer.from(await archivo.arrayBuffer());
  }
  if (!EXT_IMPORTABLES.includes(extension(nombre))) {
    throw new Error("Solo se pueden importar archivos CSV o Excel.");
  }

  const { encabezados, filas: crudas } = parsearPlanilla(buffer);
  if (encabezados.length === 0 || crudas.length === 0) {
    throw new Error("La planilla está vacía o no tiene encabezados.");
  }
  if (crudas.length > MAX_FILAS) {
    throw new Error(`Máximo ${MAX_FILAS} filas por importación. Dividí el archivo.`);
  }
  const mapeo = detectarMapeo(encabezados);
  const filas = crudas.map((f) => normalizarFila(f, mapeo));
  const conProblemas = filas.filter((f) => f.faltantes.length > 0).length;
  return {
    encabezados,
    mapeo,
    filasRaw: crudas,
    filas,
    listas: filas.length - conProblemas,
    conProblemas,
  };
}

// Whitelists para revalidar lo que llega del cliente (no confiar en el JSON).
const ESPECIES = ["perro", "gato", "otro"];
const SEXOS = ["macho", "hembra"];
const TAMANOS = ["chico", "mediano", "grande"];
const TIPOS = ["adopcion", "transito"];

/**
 * Crea los animales importados (estado 'borrador': no se ven en público hasta
 * tener ≥1 foto). Recibe las filas ya editadas por el refugio como JSON.
 */
export async function confirmarImport(
  formData: FormData
): Promise<{ creados: number; salteados: number }> {
  await limitarPorIp("vault-import", 10, 60);
  const refugio = await exigirRefugio();
  const sb = clienteServidor();

  let crudas: unknown[];
  try {
    crudas = JSON.parse(String(formData.get("filas") ?? "[]"));
  } catch {
    throw new Error("Datos inválidos.");
  }
  if (!Array.isArray(crudas) || crudas.length === 0) {
    throw new Error("No hay filas para importar.");
  }
  if (crudas.length > MAX_FILAS) {
    throw new Error(`Máximo ${MAX_FILAS} filas por importación.`);
  }

  const registros: Record<string, unknown>[] = [];
  let salteados = 0;
  for (const cruda of crudas) {
    const f = (cruda ?? {}) as Record<string, unknown>;
    const nombre = campoTexto(f.nombre, 80);
    const especie = ESPECIES.includes(String(f.especie)) ? String(f.especie) : "otro";
    // Mínimo requerido: nombre + especie reconocida. Si falta, se saltea.
    if (!nombre || !f.especie || String(f.especie).trim() === "") {
      salteados++;
      continue;
    }
    const edad = Math.min(Math.max(Math.round(Number(f.edad_meses) || 0), 0), 600);
    registros.push({
      nombre,
      especie,
      raza: campoTexto(f.raza, 80) || null,
      edad_meses: edad,
      sexo: SEXOS.includes(String(f.sexo)) ? String(f.sexo) : "macho",
      tamano: TAMANOS.includes(String(f.tamano)) ? String(f.tamano) : "mediano",
      castrado: f.castrado === true,
      vacunas: [],
      descripcion: campoTexto(f.descripcion, 3000),
      historia: "",
      slug: generarSlug(["adoptar", especie, nombre, refugio.ciudad]),
      ciudad: campoTexto(f.ciudad, 120) || refugio.ciudad,
      provincia: campoTexto(f.provincia, 120) || refugio.provincia,
      lat_aprox: refugio.lat,
      lng_aprox: refugio.lng,
      tipo: TIPOS.includes(String(f.tipo)) ? String(f.tipo) : "adopcion",
      estado: "borrador", // esperando foto: invisible en público
      fotos: [],
      video_url: null,
      refugio_id: refugio.id,
    });
  }
  if (registros.length === 0) {
    throw new Error("Ninguna fila tenía nombre y especie. Completá esos datos.");
  }

  const { error } = await sb.from("animales").insert(registros);
  if (error) throw new Error(`No pudimos importar: ${error.message}`);

  revalidatePath("/mi-refugio");
  revalidatePath("/mi-refugio/archivos");
  return { creados: registros.length, salteados };
}
