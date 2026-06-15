"use server";

// Favoritos: un usuario logueado guarda animales para verlos después en
// /favoritos. Todo server-side con service role (la tabla tiene RLS sin
// políticas públicas).

import { createClient } from "@supabase/supabase-js";
import { asegurarUsuario, exigirUsuarioActivo } from "./usuarios";
import type { Animal } from "./tipos";
import { filaAAnimal } from "./datos";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** IDs de animales que el usuario actual marcó como favoritos (set para lookup). */
export async function idsFavoritos(): Promise<Set<string>> {
  const yo = await asegurarUsuario();
  if (!yo) return new Set();
  const sb = clienteServidor();
  const { data } = await sb.from("favoritos").select("animal_id").eq("usuario_id", yo.id);
  return new Set((data ?? []).map((f) => f.animal_id as string));
}

/** Animales favoritos del usuario actual (para la vista "Mis favoritos"). */
export async function misFavoritos(): Promise<Animal[]> {
  const yo = await asegurarUsuario();
  if (!yo) return [];
  const sb = clienteServidor();
  const { data } = await sb
    .from("favoritos")
    .select("creado_el,animales(*)")
    .eq("usuario_id", yo.id)
    .order("creado_el", { ascending: false });
  return (data ?? [])
    .map((f) => {
      const a = Array.isArray(f.animales) ? f.animales[0] : f.animales;
      return a ? filaAAnimal(a) : null;
    })
    .filter((a): a is Animal => a !== null);
}

/** Guarda o quita un favorito. Si el form trae `fav` ("1"/"0") fija ese estado
 *  de forma idempotente (seguro ante clicks rápidos); si no, togglea. */
export async function alternarFavorito(formData: FormData) {
  const yo = await exigirUsuarioActivo();
  const animalId = String(formData.get("animal_id"));
  if (!animalId) throw new Error("Falta el animal.");
  const sb = clienteServidor();

  const { data: existe } = await sb
    .from("favoritos")
    .select("id")
    .eq("usuario_id", yo.id)
    .eq("animal_id", animalId)
    .maybeSingle();

  // Estado deseado explícito (idempotente) o, en su defecto, toggle.
  const deseadoCrudo = formData.get("fav");
  const deseado =
    deseadoCrudo === "1" ? true : deseadoCrudo === "0" ? false : !existe;

  if (deseado && !existe) {
    await sb.from("favoritos").insert({ usuario_id: yo.id, animal_id: animalId });
  } else if (!deseado && existe) {
    await sb.from("favoritos").delete().eq("id", existe.id);
  }
  // No revalidamos: el corazón se actualiza optimista en el cliente y las
  // páginas /favoritos y /animales son dinámicas (datos frescos por request).
  // Así el toggle responde al toque sin refrescar la lista de fondo.
}
