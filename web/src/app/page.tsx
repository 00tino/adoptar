import Link from "next/link";
import { obtenerAnimales, obtenerCampanasActivas, obtenerRefugios } from "@/lib/datos";
import CardAnimal from "@/components/CardAnimal";

// HOME: hero emocional + buscador + animales destacados + refugios + donaciones.
export default async function Home() {
  const [animales, refugios, campanas] = await Promise.all([
    obtenerAnimales(),
    obtenerRefugios(),
    obtenerCampanasActivas(),
  ]);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-salvia-oscuro text-crema">
        <div
          aria-hidden
          className="absolute inset-0 opacity-10 text-[10rem] leading-none select-none"
        >
          🐾 🐾 🐾 🐾 🐾 🐾 🐾 🐾 🐾 🐾 🐾 🐾
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="font-display text-4xl sm:text-6xl font-black max-w-2xl leading-tight">
            Hay un amigo esperándote en algún rincón de Argentina.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-crema-2">
            AdoptAR conecta perros, gatos y otros animales que necesitan un
            hogar con personas como vos. Gratis, sin vueltas y con refugios
            verificados.
          </p>

          {/* Buscador rápido */}
          <form action="/animales" className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
            <select
              name="especie"
              aria-label="Especie"
              className="rounded-xl bg-blanco-calido text-tinta px-4 py-3 font-bold"
              defaultValue=""
            >
              <option value="">Todas las especies</option>
              <option value="perro">Perros</option>
              <option value="gato">Gatos</option>
              <option value="otro">Otros</option>
            </select>
            <input
              type="text"
              name="q"
              placeholder="¿En qué zona buscás?"
              aria-label="Zona"
              className="flex-1 rounded-xl bg-blanco-calido text-tinta px-4 py-3"
            />
            <button
              type="submit"
              className="rounded-xl bg-terracota px-6 py-3 font-bold hover:bg-terracota-oscuro transition-colors"
            >
              Buscar 🔍
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
            <Link href="/animales" className="rounded-full bg-sol text-tinta px-5 py-2 hover:brightness-105">Quiero adoptar</Link>
            <Link href="/publicar-transito" className="rounded-full border-2 border-crema px-5 py-2 hover:bg-crema hover:text-tinta transition-colors">Publicá un animal en tránsito</Link>
            <Link href="/registrar-refugio" className="rounded-full border-2 border-crema px-5 py-2 hover:bg-crema hover:text-tinta transition-colors">Creá tu refugio</Link>
          </div>
        </div>
      </section>

      {/* ANIMALES DESTACADOS */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-black">Te están esperando</h2>
          <Link href="/animales" className="text-sm font-bold text-terracota hover:underline shrink-0">
            Ver todos →
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {animales.slice(0, 6).map((a) => (
            <CardAnimal key={a.id} animal={a} />
          ))}
        </div>
      </section>

      {/* REFUGIOS */}
      <section className="bg-crema-2/60">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-black">Refugios que confían en AdoptAR</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {refugios.map((r) => (
              <Link
                key={r.id}
                href={`/refugios/${r.slug}`}
                className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-5 hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <h3 className="font-display text-xl font-bold">🏠 {r.nombre}</h3>
                <p className="text-sm text-tinta-suave">{r.ciudad}, {r.provincia}</p>
                <p className="mt-2 text-sm line-clamp-2">{r.descripcion}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DONACIONES */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-3xl font-black">Causas que necesitan tu ayuda</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {campanas.map((c) => (
            <div key={c.id} className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6">
              <h3 className="font-display text-xl font-bold">{c.titulo}</h3>
              <p className="mt-2 text-sm text-tinta-suave">{c.descripcion}</p>
              {c.metaMonto && (
                <div className="mt-4">
                  <div className="h-3 rounded-full bg-crema-2 overflow-hidden">
                    <div
                      className="h-full bg-salvia"
                      style={{ width: `${Math.min(100, (c.recaudado / c.metaMonto) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-bold text-salvia-oscuro">
                    ${c.recaudado.toLocaleString("es-AR")} de ${c.metaMonto.toLocaleString("es-AR")}
                  </p>
                </div>
              )}
              <Link href="/donaciones" className="mt-4 inline-block rounded-full bg-terracota text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-oscuro transition-colors">
                Donar 💛
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
