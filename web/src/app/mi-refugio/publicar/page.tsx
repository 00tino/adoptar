import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { miRefugio, publicarAnimalRefugio } from "@/lib/acciones-refugio";
import FormularioAnimal from "../FormularioAnimal";

export const metadata: Metadata = {
  title: "Publicar animal — Mi refugio",
  robots: { index: false },
};

export default async function PaginaPublicarAnimal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const refugio = await miRefugio();
  if (!refugio) redirect("/registrar-refugio");

  // Prellenado opcional (ej: "cargar a mano" un animal salteado en una importación).
  const sp = await searchParams;
  const t = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };
  const prellenado = sp.nombre || sp.especie || sp.descripcion;
  const prefill = prellenado
    ? {
        nombre: t("nombre") ?? "",
        especie: t("especie"),
        sexo: t("sexo"),
        tamano: t("tamano"),
        raza: t("raza") ?? null,
        edadMeses: Number(t("edad_meses")) || 0,
        castrado: t("castrado") === "true",
        descripcion: t("descripcion") ?? "",
      }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Publicar animal</h1>
      <p className="mt-2 text-tinta-suave">
        {refugio.estado === "estrella"
          ? "⭐ Tu refugio es estrella: la publicación sale al catálogo al instante."
          : "✅ La publicación entra a la cola de aprobación y te avisamos al aprobarla."}
        {" "}Se publica con la ubicación de {refugio.ciudad}, {refugio.provincia}.
      </p>
      {prefill && (
        <p className="mt-4 rounded-2xl bg-sol/30 border-2 border-sol px-5 py-3 text-sm text-tinta">
          Prellenamos los datos que venían en tu planilla. Completá lo que falte
          (al menos 1 foto) y publicá. 🐾
        </p>
      )}
      <FormularioAnimal accion={publicarAnimalRefugio} prefill={prefill} />
    </div>
  );
}
