// Helpers compartidos por las acciones de servidor que publican contenido:
// generación de slugs y subida de archivos a Supabase Storage.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Slug amigable: "Luna" en "Caballito" → "transito-perro-luna-caballito-x3k2" */
export function generarSlug(partes: string[]): string {
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
export async function subirArchivos(
  sb: SupabaseClient,
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
