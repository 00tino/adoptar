import type { Metadata } from "next";
import Link from "next/link";
import { obtenerAnimales, obtenerProvincias } from "@/lib/datos";
import CardAnimal from "@/components/CardAnimal";

export const metadata: Metadata = {
  title: "Animales en adopción y tránsito en Argentina",
  description:
    "Encontrá perros, gatos y otros animales en adopción o que necesitan hogar de tránsito en toda Argentina. Filtrá por especie, zona y tipo.",
};

// CATÁLOGO: los filtros viajan por la URL (?especie=perro&tipo=adopcion),
// así cada combinación de filtros es una página indexable y compartible.
export default async function PaginaAnimales({
  searchParams,
}: {
  searchParams: Promise<{ especie?: string; tipo?: string; provincia?: string; q?: string }>;
}) {
  const filtros = await searchParams;
  const [animales, provincias] = await Promise.all([
    obtenerAnimales(filtros),
    obtenerProvincias(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Animales que buscan hogar</h1>
      <p className="mt-2 text-tinta-suave">
        {animales.length} {animales.length === 1 ? "animal encontrado" : "animales encontrados"}
      </p>

      {/* Pestañas adopción / tránsito */}
      <div className="mt-6 flex gap-2">
        {[
          { href: "/animales", texto: "Todos", activo: !filtros.tipo },
          { href: "/animales?tipo=adopcion", texto: "En adopción", activo: filtros.tipo === "adopcion" },
          { href: "/animales?tipo=transito", texto: "Solo tránsito 💛", activo: filtros.tipo === "transito" },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-5 py-2 text-sm font-bold border-2 transition-colors ${
              t.activo
                ? "bg-tinta text-crema border-tinta"
                : "border-crema-2 bg-blanco-calido hover:border-tinta"
            }`}
          >
            {t.texto}
          </Link>
        ))}
      </div>

      {/* Filtros */}
      <form className="mt-4 flex flex-wrap gap-3" method="get">
        {filtros.tipo && <input type="hidden" name="tipo" value={filtros.tipo} />}
        <select
          name="especie"
          aria-label="Especie"
          defaultValue={filtros.especie ?? ""}
          className="rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold"
        >
          <option value="">Todas las especies</option>
          <option value="perro">Perros</option>
          <option value="gato">Gatos</option>
          <option value="otro">Otros</option>
        </select>
        <select
          name="provincia"
          aria-label="Provincia"
          defaultValue={filtros.provincia ?? ""}
          className="rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold"
        >
          <option value="">Todas las provincias</option>
          {provincias.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="text"
          name="q"
          defaultValue={filtros.q ?? ""}
          placeholder="Buscar por nombre o zona…"
          aria-label="Búsqueda libre"
          className="flex-1 min-w-40 rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-salvia text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-salvia-oscuro transition-colors"
        >
          Filtrar
        </button>
      </form>

      {/* Resultados */}
      {animales.length === 0 ? (
        <div className="mt-12 text-center py-16 rounded-2xl bg-crema-2/60">
          <p className="text-5xl">🐾</p>
          <p className="mt-3 font-display text-2xl font-bold">No encontramos animales con esos filtros</p>
          <Link href="/animales" className="mt-2 inline-block text-terracota font-bold hover:underline">
            Ver todos los animales →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {animales.map((a) => (
            <CardAnimal key={a.id} animal={a} />
          ))}
        </div>
      )}
    </div>
  );
}
