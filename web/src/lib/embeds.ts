// Sanitización de URLs externas que se muestran en perfiles públicos.
// Solo se aceptan dominios conocidos; cualquier otra cosa se descarta.
// Nunca se inyecta HTML del usuario: de la URL validada se construye
// un embed propio (iframe de YouTube/Instagram o <video> del bucket).

export type EmbedVideo =
  | { tipo: "youtube"; src: string }
  | { tipo: "instagram"; src: string }
  | { tipo: "archivo"; src: string }
  | null;

/** ¿La URL es un archivo de nuestro bucket público de Supabase? */
function esVideoDelBucket(url: URL): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  return (
    url.origin === new URL(base).origin &&
    url.pathname.startsWith("/storage/v1/object/public/media/")
  );
}

/**
 * Convierte la URL de video guardada en algo embebible seguro.
 * Acepta SOLO YouTube, Instagram o archivos de nuestro propio bucket.
 */
export function resolverEmbedVideo(url: string | null | undefined): EmbedVideo {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();

  // YouTube: watch?v=ID, /shorts/ID, /embed/ID o youtu.be/ID
  if (["www.youtube.com", "youtube.com", "m.youtube.com"].includes(host)) {
    const id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{5,20})/)?.[1];
    if (id && /^[A-Za-z0-9_-]{5,20}$/.test(id)) {
      return { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    return null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (/^[A-Za-z0-9_-]{5,20}$/.test(id)) {
      return { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    return null;
  }

  // Instagram: posts, reels o IGTV
  if (["www.instagram.com", "instagram.com"].includes(host)) {
    const m = u.pathname.match(/^\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
    if (m) {
      return {
        tipo: "instagram",
        src: `https://www.instagram.com/${m[1]}/${m[2]}/embed`,
      };
    }
    return null;
  }

  // Archivo subido a nuestro Storage
  if (esVideoDelBucket(u)) return { tipo: "archivo", src: url };

  return null;
}

/**
 * Valida una URL de red social: tiene que ser https y del dominio indicado
 * (o www.<dominio>). Devuelve la URL normalizada o null si no sirve.
 * Acepta también "instagram.com/usuario" sin protocolo.
 */
export function validarUrlRed(
  valor: string,
  dominio: "instagram.com" | "facebook.com"
): string | null {
  const crudo = valor.trim();
  if (!crudo) return null;
  const conProtocolo = /^https?:\/\//i.test(crudo) ? crudo : `https://${crudo}`;
  let u: URL;
  try {
    u = new URL(conProtocolo);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host !== dominio && host !== `www.${dominio}`) return null;
  if (u.pathname === "/" || u.pathname === "") return null; // falta el usuario
  u.protocol = "https:";
  return u.toString();
}
