import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { miRefugio, publicarAnimalRefugio } from "@/lib/acciones-refugio";
import FormularioAnimal from "../FormularioAnimal";

export const metadata: Metadata = {
  title: "Publicar animal — Mi refugio",
  robots: { index: false },
};

export default async function PaginaPublicarAnimal() {
  const refugio = await miRefugio();
  if (!refugio) redirect("/registrar-refugio");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Publicar animal</h1>
      <p className="mt-2 text-tinta-suave">
        {refugio.estado === "estrella"
          ? "⭐ Tu refugio es estrella: la publicación sale al catálogo al instante."
          : "✅ La publicación entra a la cola de aprobación y te avisamos al aprobarla."}
        {" "}Se publica con la ubicación de {refugio.ciudad}, {refugio.provincia}.
      </p>
      <FormularioAnimal accion={publicarAnimalRefugio} />
    </div>
  );
}
