import type { Metadata } from "next";
import Link from "next/link";
import { listarHogares } from "@/lib/acciones-hogares";

export const metadata: Metadata = {
  title: "Hogares de tránsito disponibles",
  description: "Encontrá personas con lugar para recibir temporalmente animales rescatados y contactalas desde AdoptAR.",
};

const nombreEspecie: Record<string, string> = { perro: "Perros", gato: "Gatos", otro: "Otros" };

export default async function PaginaHogares({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = await searchParams;
  const provincia = typeof filtros.provincia === "string" ? filtros.provincia.slice(0, 60) : "";
  const especie = typeof filtros.especie === "string" ? filtros.especie : "";
  const hogares = await listarHogares(provincia, especie);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/transito" className="text-sm font-bold text-terracota-oscuro hover:underline">← Volver a tránsito</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-display text-4xl font-black">Hogares con lugar para ayudar 💛</h1>
          <p className="mt-3 max-w-2xl text-tinta-suave">Si rescataste un animal y necesitás tránsito, buscá quién puede recibirlo. Cada persona indica su zona y su disponibilidad; coordinan los detalles en privado.</p>
        </div>
        <Link href="/transito/ofrecer" className="rounded-full bg-terracota-oscuro px-5 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro">Ofrecer mi hogar</Link>
      </div>

      <form method="get" className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-4">
        <label className="min-w-48 flex-1 text-sm font-bold">Provincia
          <input name="provincia" defaultValue={provincia} placeholder="Ej: Buenos Aires" className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2" />
        </label>
        <label className="min-w-40 text-sm font-bold">Puede recibir
          <select name="especie" defaultValue={especie} className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2">
            <option value="">Todos</option>
            <option value="perro">Perros</option>
            <option value="gato">Gatos</option>
            <option value="otro">Otros</option>
          </select>
        </label>
        <button className="rounded-full border-2 border-tinta px-5 py-2 font-bold hover:bg-crema-2">Buscar hogares</button>
      </form>

      {hogares.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-8">
          <h2 className="font-display text-2xl font-bold">Todavía no hay hogares con lugar en esta búsqueda.</h2>
          <p className="mt-2 text-tinta-suave">Probá otra provincia o pedí que te avisen cuando se publique un animal cerca tuyo.</p>
          <Link href="/transito/alertas" className="mt-4 inline-block font-bold text-terracota-oscuro underline">Ver alertas de tránsito</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hogares.map((hogar) => (
            <article key={hogar.id} className="flex flex-col rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5">
              <p className="font-display text-2xl font-bold">{hogar.nombre}</p>
              <p className="mt-1 text-sm text-tinta-suave">📍 {hogar.ciudad}, {hogar.provincia}</p>
              <p className="mt-3 text-sm font-bold text-salvia-oscuro">{hogar.cupos} {hogar.cupos === 1 ? "lugar disponible" : "lugares disponibles"}</p>
              <p className="mt-1 text-sm">{hogar.especies.map((e) => nombreEspecie[e] ?? e).join(" · ")}</p>
              {hogar.descripcion && <p className="mt-3 line-clamp-3 text-sm text-tinta-suave">{hogar.descripcion}</p>}
              <Link href={`/transito/hogares/${hogar.id}`} className="mt-auto pt-5 font-bold text-terracota-oscuro hover:underline">Pedir ayuda para un animal →</Link>
            </article>
          ))}
        </div>
      )}
      <p className="mt-8 text-sm text-tinta-suave">Los hogares informan su propia disponibilidad. Confirmá siempre plazos, cuidados y condiciones antes de trasladar un animal.</p>
    </div>
  );
}
