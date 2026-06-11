// Cliente de Supabase para el servidor.
// Se activa cuando existan las variables en .env.local — mientras tanto,
// la app usa los datos demo de src/lib/datos.ts.

import { createClient } from "@supabase/supabase-js";

export function supabaseDisponible(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function crearClienteSupabase() {
  if (!supabaseDisponible()) {
    throw new Error(
      "Supabase no está configurado: completá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
    );
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
