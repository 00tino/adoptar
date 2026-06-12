import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { esAdmin } from "@/lib/auth";
import { editarAnimalAdmin } from "@/lib/acciones-admin-gestion";
import FormularioAnimal from "@/app/mi-refugio/FormularioAnimal";

export const metadata: Metadata = {
  title: "Editar animal — Admin",
  robots: { index: false, follow: false },
};

export default async function PaginaEditarAnimalAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await esAdmin())) notFound();

  const { id } = await params;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await sb
    .from("animales")
    .select("id,nombre,especie,sexo,tamano,raza,edad_meses,castrado,vacunas,descripcion")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="mt-8 max-w-2xl">
      <h2 className="font-display text-2xl font-black">Editar a {data.nombre}</h2>
      <FormularioAnimal
        accion={editarAnimalAdmin}
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
        }}
      />
    </div>
  );
}
