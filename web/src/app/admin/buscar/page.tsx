import type { Metadata } from "next";
import Link from "next/link";
import { busquedaGlobal, type ResultadoBusqueda } from "@/lib/acciones-admin-gestion";

export const metadata: Metadata = {
  title: "Búsqueda — Admin",
  robots: { index: false, follow: false },
};

const GRUPOS: { tipo: ResultadoBusqueda["tipo"]; titulo: string }[] = [
  { tipo: "animal", titulo: "Animales" },
  { tipo: "refugio", titulo: "Refugios" },
  { tipo: "campana", titulo: "Campañas" },
  { tipo: "usuario", titulo: "Usuarios" },
  { tipo: "donacion", titulo: "Donaciones" },
];

export default async function PaginaBusquedaAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const resultados = await busquedaGlobal(q);

  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">
        Resultados para “{q}”
      </h2>
      {resultados.length === 0 && (
        <div className="mt-4 rounded-2xl bg-crema-2/60 p-10 text-center text-tinta-suave">
          No encontramos nada con esa búsqueda.
        </div>
      )}
      {GRUPOS.map((grupo) => {
        const filas = resultados.filter((r) => r.tipo === grupo.tipo);
        if (filas.length === 0) return null;
        return (
          <section key={grupo.tipo} className="mt-6">
            <h3 className="font-display text-lg font-bold text-tinta-suave">
              {grupo.titulo}
            </h3>
            <ul className="mt-2 space-y-2">
              {filas.map((r, i) => (
                <li key={`${grupo.tipo}-${i}`}>
                  <Link
                    href={r.href}
                    className="block rounded-2xl bg-blanco-calido border-2 border-crema-2 px-5 py-3 hover:border-terracota transition-colors"
                  >
                    <p className="font-bold">{r.titulo}</p>
                    <p className="text-sm text-tinta-suave">{r.detalle}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
