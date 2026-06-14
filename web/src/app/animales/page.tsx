import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FOTOS } from "@/lib/fotos";
import {
  ANIMALES_POR_PAGINA,
  obtenerAnimalesPaginados,
  obtenerAnimalesCercanos,
  obtenerProvincias,
} from "@/lib/datos";
import CardAnimal from "@/components/CardAnimal";
import BotonCercania from "@/components/BotonCercania";
import { usuarioActual } from "@/lib/auth";
import { idsFavoritos } from "@/lib/acciones-favoritos";

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
    lat?: string;
    lng?: string;
    radio?: string;
  }>;
}) {
  const { pagina: paginaCruda, lat: latCruda, lng: lngCruda, radio: radioCruda, ...filtros } =
    await searchParams;
  const pagina = Math.max(1, Number(paginaCruda) || 1);

  // Modo "cerca mío": activo cuando hay lat/lng válidas en la URL.
  const lat = Number(latCruda);
  const lng = Number(lngCruda);
  const cercania =
    Number.isFinite(lat) && Number.isFinite(lng) && latCruda != null && lngCruda != null;
  const radio = Number(radioCruda) || 0;

  const [cercanos, { animales, total }, provincias] = await Promise.all([
    cercania ? obtenerAnimalesCercanos(filtros, lat, lng, radio) : Promise.resolve([]),
    cercania ? Promise.resolve({ animales: [], total: 0 }) : obtenerAnimalesPaginados(filtros, pagina),
    obtenerProvincias(),
  ]);
  const logueado = !!(await usuarioActual());
  const favs = logueado ? await idsFavoritos() : new Set<string>();

  const cercaniaParams = cercania
    ? { lat: latCruda!, lng: lngCruda!, radio: String(radio) }
    : null;
  const totalMostrado = cercania ? cercanos.length : total;
  const totalPaginas = cercania ? 1 : Math.max(1, Math.ceil(total / ANIMALES_POR_PAGINA));
  // Cuántos filtros activos hay (sin contar la pestaña tipo): abre el panel en mobile
  const cantidadFiltros = Object.entries(filtros).filter(
    ([k, v]) => v && k !== "tipo"
  ).length;

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
        {totalMostrado} {totalMostrado === 1 ? "animal encontrado" : "animales encontrados"}
        {cercania
          ? radio > 0
            ? ` · a menos de ${radio} km tuyo`
            : " · ordenados por cercanía"
          : totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
      </p>

      {/* Pestañas adopción / tránsito */}
      <div className="mt-6 flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { href: "/animales", texto: "Todos", activo: !filtros.tipo },
          { href: "/animales?tipo=adopcion", texto: "En adopción", activo: filtros.tipo === "adopcion" },
          { href: "/animales?tipo=transito", texto: "Solo tránsito 💛", activo: filtros.tipo === "transito" },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold border-2 transition-colors ${
              t.activo
                ? "bg-tinta text-crema border-tinta"
                : "border-crema-2 bg-blanco-calido hover:border-tinta"
            }`}
          >
            {t.texto}
          </Link>
        ))}
      </div>

      {/* Filtros: inline en desktop, panel desplegable en mobile */}
      <details
        className="group mt-4 sm:hidden"
        open={cantidadFiltros > 0}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2.5 text-sm font-bold">
          <span>
            Filtros 🔍
            {cantidadFiltros > 0 && (
              <span className="ml-2 rounded-full bg-salvia px-2 py-0.5 text-xs text-blanco-calido">
                {cantidadFiltros}
              </span>
            )}
          </span>
          <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <FormFiltros filtros={filtros} provincias={provincias} cercania={cercaniaParams} columna />
      </details>
      <div className="hidden sm:block">
        <FormFiltros filtros={filtros} provincias={provincias} cercania={cercaniaParams} />
      </div>

      {/* Sector "cerca mío" */}
      <BotonCercania activo={cercania} />

      {/* Resultados */}
      {cercania ? (
        cercanos.length === 0 ? (
          <div className="mt-12 text-center py-16 rounded-2xl bg-crema-2/60">
            <p className="font-display text-2xl font-bold">
              No hay animales {radio > 0 ? `a menos de ${radio} km tuyo` : "con ubicación cargada"}
            </p>
            <p className="mt-2 text-tinta-suave">
              Probá con un radio mayor o quitá el filtro de cercanía.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cercanos.map(({ animal, distanciaKm }) => (
              <CardAnimal
                key={animal.id}
                animal={animal}
                distanciaKm={distanciaKm}
                logueado={logueado}
                favorito={favs.has(animal.id)}
              />
            ))}
          </div>
        )
      ) : animales.length === 0 ? (
        <div className="mt-12 text-center py-16 rounded-2xl bg-crema-2/60">
          <Image
            src={FOTOS.vacio.src}
            alt={FOTOS.vacio.alt}
            width={200}
            height={200}
            sizes="160px"
            className="mx-auto aspect-square w-40 rounded-3xl object-cover"
          />
          <p className="mt-4 font-display text-2xl font-bold">No encontramos animales con esos filtros</p>
          <Link href="/animales" className="mt-2 inline-block text-terracota font-bold hover:underline">
            Ver todos los animales →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {animales.map((a) => (
            <CardAnimal
              key={a.id}
              animal={a}
              logueado={logueado}
              favorito={favs.has(a.id)}
            />
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

// Formulario de filtros. En desktop va en fila (flex-wrap); en mobile
// (columna=true) apila los campos a lo ancho para usarlo con el pulgar.
function FormFiltros({
  filtros,
  provincias,
  cercania,
  columna = false,
}: {
  filtros: Record<string, string | undefined>;
  provincias: string[];
  cercania: { lat: string; lng: string; radio: string } | null;
  columna?: boolean;
}) {
  const claseCampo = `rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 text-sm font-bold ${
    columna ? "w-full py-3" : "py-2"
  }`;
  return (
    <form
      method="get"
      className={columna ? "mt-3 flex flex-col gap-3" : "mt-4 flex flex-wrap gap-3"}
    >
      {filtros.tipo && <input type="hidden" name="tipo" value={filtros.tipo} />}
      {cercania && (
        <>
          <input type="hidden" name="lat" value={cercania.lat} />
          <input type="hidden" name="lng" value={cercania.lng} />
          <input type="hidden" name="radio" value={cercania.radio} />
        </>
      )}
      <select name="especie" aria-label="Especie" defaultValue={filtros.especie ?? ""} className={claseCampo}>
        <option value="">Todas las especies</option>
        <option value="perro">Perros</option>
        <option value="gato">Gatos</option>
        <option value="otro">Otros</option>
      </select>
      <select name="provincia" aria-label="Provincia" defaultValue={filtros.provincia ?? ""} className={claseCampo}>
        <option value="">Todas las provincias</option>
        {provincias.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <select name="tamano" aria-label="Tamaño" defaultValue={filtros.tamano ?? ""} className={claseCampo}>
        <option value="">Cualquier tamaño</option>
        <option value="chico">Chico</option>
        <option value="mediano">Mediano</option>
        <option value="grande">Grande</option>
      </select>
      <select name="edad" aria-label="Edad" defaultValue={filtros.edad ?? ""} className={claseCampo}>
        <option value="">Cualquier edad</option>
        <option value="cachorro">Cachorros (menos de 1 año)</option>
        <option value="adulto">Adultos (1 a 7 años)</option>
        <option value="mayor">Mayores (7+ años)</option>
      </select>
      <select name="sexo" aria-label="Sexo" defaultValue={filtros.sexo ?? ""} className={claseCampo}>
        <option value="">Cualquier sexo</option>
        <option value="hembra">Hembras</option>
        <option value="macho">Machos</option>
      </select>
      <select name="castrado" aria-label="Castrado o esterilizado" defaultValue={filtros.castrado ?? ""} className={claseCampo}>
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
        className={`rounded-xl bg-blanco-calido border-2 border-crema-2 px-4 text-sm ${
          columna ? "w-full py-3" : "flex-1 min-w-40 py-2"
        }`}
      />
      <button
        type="submit"
        className={`rounded-xl bg-salvia text-blanco-calido px-5 text-sm font-bold hover:bg-salvia-oscuro transition-colors ${
          columna ? "w-full py-3" : "py-2"
        }`}
      >
        Filtrar
      </button>
    </form>
  );
}
