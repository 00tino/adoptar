import Link from "next/link";
import Image from "next/image";
import { obtenerAnimales, obtenerCampanasActivas, obtenerRefugios } from "@/lib/datos";
import { FOTOS } from "@/lib/fotos";
import CardAnimal from "@/components/CardAnimal";
import { formatearZona } from "@/lib/vitrina";

export default async function Home() {
  const [animales, refugios, campanas] = await Promise.all([
    obtenerAnimales(),
    obtenerRefugios(),
    obtenerCampanasActivas(),
  ]);

  const vitrina = animales.filter((a) => a.estado === "disponible").slice(0, 3);

  return (
    <div>
      <section className="relative overflow-hidden bg-salvia-oscuro text-crema">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_minmax(0,420px)] lg:py-20">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl font-black max-w-2xl leading-tight">
              Hay un amigo esperándote en algún rincón de Argentina.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-crema-2">
              AdoptAR conecta perros, gatos y otros animales que necesitan un
              hogar con personas como vos. Gratis, sin vueltas. Estamos
              sumando refugios de a poco.
            </p>

            <form action="/animales" className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
              <select name="especie" aria-label="Especie" className="rounded-xl bg-blanco-calido text-tinta px-4 py-3 font-bold" defaultValue="">
                <option value="">Todas las especies</option>
                <option value="perro">Perros</option>
                <option value="gato">Gatos</option>
                <option value="otro">Otros</option>
              </select>
              <select name="provincia" aria-label="Provincia" className="flex-1 rounded-xl bg-blanco-calido text-tinta px-4 py-3" defaultValue="">
                <option value="">Toda Argentina</option>
                <option value="Buenos Aires">Buenos Aires</option>
                <option value="CABA">CABA</option>
                <option value="Córdoba">Córdoba</option>
                <option value="Santa Fe">Santa Fe</option>
                <option value="Mendoza">Mendoza</option>
              </select>
              <button type="submit" className="rounded-xl bg-terracota-oscuro px-6 py-3 font-bold hover:bg-terracota-mas-oscuro transition-colors">
                Buscar
              </button>
            </form>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
              <Link href="/animales" className="rounded-full bg-sol text-tinta px-5 py-2 hover:brightness-105">Quiero adoptar</Link>
              <Link href="/publicar-transito" className="rounded-full border-2 border-crema px-5 py-2 hover:bg-crema hover:text-tinta transition-colors">Publicá un animal en tránsito</Link>
              <Link href="/sumate" className="rounded-full border-2 border-crema px-5 py-2 hover:bg-crema hover:text-tinta transition-colors">Sumá tu refugio</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" aria-hidden>
            {FOTOS.hero.map((foto, i) => (
              <Image
                key={foto.src}
                src={foto.src}
                alt={foto.alt}
                width={420}
                height={420}
                priority={i < 2}
                sizes="(min-width: 1024px) 210px, 45vw"
                className={`aspect-square w-full rounded-3xl object-cover border-4 border-crema/20 ${
                  i % 2 === 1 ? "translate-y-4" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-black">Así se ve una publicación</h2>
          <Link href="/animales" className="text-sm font-bold text-terracota-oscuro hover:underline shrink-0">
            Ver catálogo →
          </Link>
        </div>
        <p className="mt-2 text-sm text-tinta-suave max-w-2xl">
          Todavía hay pocos animales cargados. Estas fichas son el modelo: foto,
          zona, si está en adopción o tránsito, y quién lo publica.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vitrina.map((a) => (
            <CardAnimal key={a.id} animal={a} />
          ))}
        </div>
      </section>

      <section className="bg-crema-2/60">
        <div className="mx-auto max-w-6xl px-4 py-14 grid gap-8 lg:grid-cols-3">
          {[
            ["1. Encontrá", "Filtrá por especie y provincia, o mirá el mapa."],
            ["2. Escribí", "Postulate o chateá con el refugio o particular."],
            ["3. Coordiná", "La adopción la cierran las personas. AdoptAR ordena el contacto."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-display text-2xl font-bold">{t}</h3>
              <p className="mt-2 text-tinta-suave">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-3xl font-black">Refugios</h2>
        <p className="mt-2 text-sm text-tinta-suave">
          Si tenés un refugio o rescatás por tu cuenta, el alta es gratis.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {refugios.slice(0, 3).map((r) => (
            <Link
              key={r.id}
              href={`/refugios/${r.slug}`}
              className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-5 hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <h3 className="font-display text-xl font-bold">🏠 {r.nombre.replace(/\s*\(demo\)\s*/i, "")}</h3>
              <p className="text-sm text-tinta-suave">{formatearZona(r.ciudad, r.provincia)}</p>
              <p className="mt-2 text-sm line-clamp-2">{r.descripcion}</p>
            </Link>
          ))}
        </div>
        <Link
          href="/sumate"
          className="mt-6 inline-block rounded-full bg-terracota-oscuro text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-mas-oscuro"
        >
          Quiero publicar mis animales →
        </Link>
      </section>

      {campanas.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-black">Si querés colaborar</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {campanas
              .filter((c) => c.tipo === "plataforma" || c.causa === "plataforma")
              .map((c) => (
                <div key={c.id} className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6">
                  <h3 className="font-display text-xl font-bold">{c.titulo}</h3>
                  <p className="mt-2 text-sm text-tinta-suave">{c.descripcion}</p>
                  <Link href="/donaciones" className="mt-4 inline-block rounded-full bg-terracota-oscuro text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-mas-oscuro transition-colors">
                    Donar
                  </Link>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
