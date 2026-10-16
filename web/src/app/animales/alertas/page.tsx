import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { supabaseDisponible } from "@/lib/supabase";
import { obtenerProvincias } from "@/lib/datos";
import { miAlertaAdopcion } from "@/lib/acciones-alertas-adopcion";
import FormularioAlertaAdopcion from "@/components/FormularioAlertaAdopcion";

export const metadata: Metadata = { title: "Mis alertas de adopción", robots: { index: false } };

export default async function PaginaAlertasAdopcion() {
  const user = await usuarioActual();
  const disponible = clerkDisponible() && supabaseDisponible();
  const [actual, provincias] = user && disponible
    ? await Promise.all([miAlertaAdopcion(), obtenerProvincias()]) : [null, []];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/animales" className="py-3 font-bold text-terracota-oscuro underline">Volver al catálogo</Link>
      <h1 className="mt-5 font-display text-4xl font-black">Avisame cuando llegue un compañero</h1>
      <p className="mt-3 text-tinta-suave">Elegí una especie y una provincia. Te llega un email cuando se publica un nuevo animal en adopción que coincida con tu búsqueda.</p>
      {user && disponible ? <FormularioAlertaAdopcion actual={actual} provincias={provincias} /> : disponible ? (
        <div className="mt-6"><SignInButton mode="modal"><button className="min-h-11 rounded-xl bg-tinta px-5 py-3 font-bold text-crema">Iniciar sesión para crear mi alerta</button></SignInButton></div>
      ) : <p className="mt-6 rounded-xl bg-crema-2 p-4">Las alertas necesitan la conexión con Supabase y el inicio de sesión.</p>}
    </div>
  );
}
