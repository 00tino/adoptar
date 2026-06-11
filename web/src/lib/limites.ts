// Rate limiting simple en memoria, por IP y por acción.
// Suficiente para frenar spam de bots básicos sin servicios extra.
// (En Vercel cada instancia tiene su propia memoria: para tráfico grande
// se puede migrar a Upstash/Redis sin cambiar las llamadas.)

import { headers } from "next/headers";

const registros = new Map<string, { cuenta: number; desde: number }>();

/**
 * Lanza un error si la IP superó `max` intentos en `ventanaMin` minutos.
 * Llamar al inicio de cada acción pública.
 */
export async function limitarPorIp(
  accion: string,
  max: number,
  ventanaMin: number
) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local";
  const clave = `${accion}:${ip}`;
  const ahora = Date.now();
  const ventanaMs = ventanaMin * 60_000;

  const reg = registros.get(clave);
  if (!reg || ahora - reg.desde > ventanaMs) {
    registros.set(clave, { cuenta: 1, desde: ahora });
    return;
  }
  reg.cuenta++;
  if (reg.cuenta > max) {
    throw new Error("Demasiados intentos. Probá de nuevo en unos minutos.");
  }

  // Limpieza ocasional para no acumular memoria
  if (registros.size > 5000) {
    for (const [k, v] of registros) {
      if (ahora - v.desde > ventanaMs) registros.delete(k);
    }
  }
}

/** Recorta y limpia un campo de texto de formulario */
export function campoTexto(valor: unknown, maxLargo: number): string {
  return String(valor ?? "").trim().slice(0, maxLargo);
}
