"use server";

// Ratings: los refugios califican a los usuarios particulares (1-5 estrellas
// + comentario). Visibles SOLO para otros refugios — los usuarios comunes
// nunca ven su propia calificación ni la de nadie. Se chequea en el servidor.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { exigirUsuarioActivo } from "./usuarios";
import { miRefugio } from "./acciones-refugio";
import { campoTexto, limitarPorIp } from "./limites";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface RatingUsuario {
  promedio: number;
  cantidad: number;
  comentarios: { estrellas: number; comentario: string | null; refugio: string }[];
  /** Estrellas que ya le puso MI refugio (para precargar el form) */
  miPuntaje: number | null;
}

/** Rating de un usuario. Devuelve null si quien consulta no es un refugio. */
export async function obtenerRatingUsuario(
  usuarioId: string
): Promise<RatingUsuario | null> {
  const refugio = await miRefugio();
  if (!refugio) return null; // solo refugios pueden ver ratings

  const sb = clienteServidor();
  const { data } = await sb
    .from("ratings")
    .select("estrellas,comentario,refugio_id,refugios(nombre)")
    .eq("usuario_id", usuarioId);
  const filas = data ?? [];
  const cantidad = filas.length;
  const promedio = cantidad
    ? filas.reduce((s, r) => s + r.estrellas, 0) / cantidad
    : 0;
  const mio = filas.find((r) => r.refugio_id === refugio.id);
  return {
    promedio,
    cantidad,
    comentarios: filas.map((r) => {
      const ref = Array.isArray(r.refugios) ? r.refugios[0] : r.refugios;
      return {
        estrellas: r.estrellas,
        comentario: r.comentario,
        refugio: (ref as { nombre?: string } | null)?.nombre ?? "Refugio",
      };
    }),
    miPuntaje: mio?.estrellas ?? null,
  };
}

/** Califica a un usuario (upsert: una calificación por refugio y usuario) */
export async function calificarUsuario(formData: FormData) {
  await limitarPorIp("calificar", 20, 60);
  await exigirUsuarioActivo();
  const refugio = await miRefugio();
  if (!refugio) throw new Error("Solo los refugios pueden calificar usuarios.");

  const usuarioId = String(formData.get("usuarioId"));
  const estrellas = Number(formData.get("estrellas"));
  if (!usuarioId || !Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    throw new Error("Calificación inválida.");
  }

  const sb = clienteServidor();
  const { error } = await sb.from("ratings").upsert(
    {
      refugio_id: refugio.id,
      usuario_id: usuarioId,
      estrellas,
      comentario: campoTexto(formData.get("comentario"), 500) || null,
    },
    { onConflict: "refugio_id,usuario_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/mensajes");
}
