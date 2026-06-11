import type { Metadata } from "next";
import Link from "next/link";
import {
  ANIMALES_POR_PAGINA,
  obtenerAnimalesPaginados,
  obtenerProvincias,
} from "@/lib/datos";
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
  searchParams: Promise<{
    especie?: string;
    tipo?: string;
    provincia?: string;
    tamano?: string;
    sexo?: string;
    edad?: string;
    castrado?: string;
    q?: string;
    pagina?: string;
  }>;
}) {
  const { pagina: paginaCruda, ...filtros } = await searchParams;
  const pagina = Math.max(1, Number(paginaCruda) || 1);
  const [{ animales, total }, provincias] = await Promise.all([
    obtenerAnimalesPaginados(filtros, pagina),
    obtenerProvincias(),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / ANIMALES_POR_PAGINA));

  // Link de paginación que conserva todos los filtros activos
  const urlPagina = (n: number) => {
    const params = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v) as [string, string][]
    );
    if (n > 1) params.set("pagina", String(n));
    const qs = params.toString();
    return qs ? `/animales?${qs}` : "/animales";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Animales que buscan hogar</h1>
      <p className="mt-2 text-tinta-suave">
        {total} {total === 1 ? "animal encontrado" : "animales encontrados"}
        {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
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
        <select
          name="tamano"
          aria-label="Tamaño"
          defaultValue={filtros.tamano ?? ""}
          className="rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold"
        >
          <option value="">Cualquier tamaño</option>
          <option value="chico">Chico</option>
          <option value="mediano">Mediano</option>
          <option value="grande">Grande</option>
        </select>
        <select
          name="edad"
          aria-label="Edad"
          defaultValue={filtros.edad ?? ""}
          className="rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold"
        >
          <option value="">Cualquier edad</option>
          <option value="cachorro">Cachorros (menos de 1 año)</option>
          <option value="adulto">Adultos (1 a 7 años)</option>
          <option value="mayor">Mayores (7+ años)</option>
        </select>
        <select
          name="sexo"
          aria-label="Sexo"
          defaultValue={filtros.sexo ?? ""}
          className="rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold"
        >
          <option value="">Cualquier sexo</option>
          <option value="hembra">Hembras</option>
          <option value="macho">Machos</option>
        </select>
        <select
          name="castrado"
          aria-label="Castrado o esterilizado"
          defaultValue={filtros.castrado ?? ""}
          className="rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold"
        >
          <option value="">Castrado: indistinto</option>
          <option value="si">Castrado/esterilizado</option>
          <option value="no">Sin castrar</option>
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

      {/* Paginación */}
      {totalPaginas > 1 && (
        <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-2">
          {pagina > 1 && (
            <Link
              href={urlPagina(pagina - 1)}
              className="rounded-full border-2 border-crema-2 bg-blanco-calido px-4 py-2 text-sm font-bold hover:border-tinta transition-colors"
            >
              ← Anterior
            </Link>
          )}
          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
            .map((n, i, arr) => (
              <span key={n} className="flex items-center gap-2">
                {i > 0 && arr[i - 1] !== n - 1 && (
                  <span className="text-tinta-suave">…</span>
                )}
                <Link
                  href={urlPagina(n)}
                  aria-current={n === pagina ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-colors ${
                    n === pagina
                      ? "bg-tinta text-crema border-tinta"
                      : "border-crema-2 bg-blanco-calido hover:border-tinta"
                  }`}
                >
                  {n}
                </Link>
              </span>
            ))}
          {pagina < totalPaginas && (
            <Link
              href={urlPagina(pagina + 1)}
              className="rounded-full border-2 border-crema-2 bg-blanco-calido px-4 py-2 text-sm font-bold hover:border-tinta transition-colors"
            >
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
