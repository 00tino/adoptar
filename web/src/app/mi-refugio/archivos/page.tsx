import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { miRefugio } from "@/lib/acciones-refugio";
import { listarArchivos } from "@/lib/acciones-archivos";
import Pestanas from "../Pestanas";
import Vault from "./Vault";
import Importador from "./Importador";

export const metadata: Metadata = {
  title: "Cargar animales — Mi refugio",
  robots: { index: false },
};

// Fase 10: repositorio privado de archivos del refugio + importador de animales.
export default async function PaginaArchivosRefugio() {
  const refugio = await miRefugio();
  if (!refugio) redirect("/registrar-refugio");

  const archivos = await listarArchivos();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">{refugio.nombre}</h1>

      <Pestanas activa="/mi-refugio/archivos" />

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold">Importar animales desde una planilla</h2>
        <p className="mt-1 text-tinta-suave">
          Subí una planilla CSV o Excel con tus animales. Detectamos las columnas
          automáticamente y te mostramos una vista previa antes de confirmar. Los
          animales se crean <strong>esperando foto</strong> (no se publican hasta
          que les agregues al menos una).
        </p>
        <Importador archivos={archivos.filter((a) => a.importable)} />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold">Tus archivos guardados</h2>
        <p className="mt-1 text-tinta-suave">
          Guardá acá tus bases de datos, planillas, PDFs o lo que necesites.
          Solo vos los ves (hasta 20 MB cada uno, 200 MB en total).
        </p>
        <Vault archivos={archivos} />
      </section>
    </div>
  );
}
