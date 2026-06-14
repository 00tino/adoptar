import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { miRefugio, editarAnimalRefugio } from "@/lib/acciones-refugio";
import FormularioAnimal from "../../FormularioAnimal";

export const metadata: Metadata = {
  title: "Editar animal — Mi refugio",
  robots: { index: false },
};

export default async function PaginaEditarAnimal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const refugio = await miRefugio();
  if (!refugio) redirect("/registrar-refugio");

  const { id } = await params;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // Solo animales del propio refugio
  const { data } = await sb
    .from("animales")
    .select("id,nombre,especie,sexo,tamano,raza,edad_meses,castrado,vacunas,descripcion,historia")
    .eq("id", id)
    .eq("refugio_id", refugio.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Editar a {data.nombre}</h1>
      <FormularioAnimal
        accion={editarAnimalRefugio}
        animal={{
          id: data.id,
          nombre: data.nombre,
          especie: data.especie,
          sexo: data.sexo ?? "macho",
          tamano: data.tamano ?? "mediano",
          raza: data.raza,
          edadMeses: data.edad_meses ?? 0,
          castrado: data.castrado,
          vacunas: Array.isArray(data.vacunas) ? data.vacunas : [],
          descripcion: data.descripcion,
          historia: data.historia ?? "",
        }}
      />
    </div>
  );
}
