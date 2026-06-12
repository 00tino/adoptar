import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  obtenerAnimalesDeRefugio,
  obtenerCampanasActivas,
  obtenerRefugioPorSlug,
} from "@/lib/datos";
import { resolverEmbedVideo } from "@/lib/embeds";
import CardAnimal from "@/components/CardAnimal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const refugio = await obtenerRefugioPorSlug(slug);
  if (!refugio) return {};
  return {
    title: `${refugio.nombre} — refugio en ${refugio.ciudad}`,
    description: refugio.descripcion.slice(0, 160),
  };
}

export default async function PaginaRefugio({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const refugio = await obtenerRefugioPorSlug(slug);
  if (!refugio) notFound();

  const [animales, campanas] = await Promise.all([
    obtenerAnimalesDeRefugio(refugio.id),
    obtenerCampanasActivas(),
  ]);
  const susCampanas = campanas.filter((c) => c.refugioId === refugio.id);
  const embed = resolverEmbedVideo(refugio.videoUrl);

  // Schema.org: el refugio como organización local
  const schema = {
    "@context": "https://schema.org",
    "@type": "AnimalShelter",
    name: refugio.nombre,
    description: refugio.descripcion,
    address: {
      "@type": "PostalAddress",
      addressLocality: refugio.ciudad,
      addressRegion: refugio.provincia,
      addressCountry: "AR",
    },
    telephone: refugio.telefono,
    email: refugio.email,
    ...(refugio.redes.instagram || refugio.redes.facebook
      ? { sameAs: [refugio.redes.instagram, refugio.redes.facebook].filter(Boolean) }
      : {}),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />

      <nav aria-label="Migas de pan" className="text-sm text-tinta-suave">
        <Link href="/refugios" className="hover:underline">← Todos los refugios</Link>
      </nav>

      {/* HERO: datos + collage de fotos del refugio */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-salvia-oscuro text-crema">
        <div className="grid lg:grid-cols-2">
          <div className="p-8">
            <h1 className="font-display text-4xl sm:text-5xl font-black">
              🏠 {refugio.nombre}
            </h1>
            <p className="mt-2 text-crema-2 font-bold">
              📍 {refugio.ciudad}, {refugio.provincia}
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed">{refugio.descripcion}</p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
              {refugio.whatsapp && (
                <a
                  href={`https://wa.me/${refugio.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-sol text-tinta px-5 py-2.5 hover:brightness-105"
                >
                  WhatsApp 💬
                </a>
              )}
              {refugio.redes.instagram && (
                <a
                  href={refugio.redes.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-blanco-calido text-tinta px-5 py-2.5 hover:brightness-95"
                >
                  {/* Ícono Instagram */}
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1M12 0C8.7 0 8.3 0 7 .1 5.8.1 4.9.3 4.1.6c-.8.3-1.5.7-2.2 1.4C1.2 2.7.8 3.4.5 4.2.2 5 .1 5.8 0 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.1 1.3.2 2.1.5 2.9.3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.6.4 2.9.5 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c1.3-.1 2.1-.2 2.9-.5.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.4-1.6.5-2.9.1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.1-1.3-.2-2.1-.5-2.9-.3-.8-.7-1.5-1.4-2.2C20.3 1.2 19.6.8 18.8.5 18 .2 17.2.1 15.9 0 14.7 0 14.3 0 12 0z"/>
                    <path d="M12 5.8A6.2 6.2 0 1 0 18.2 12 6.2 6.2 0 0 0 12 5.8zm0 10.2A4 4 0 1 1 16 12a4 4 0 0 1-4 4zM19.8 5.6a1.4 1.4 0 1 1-1.4-1.4 1.4 1.4 0 0 1 1.4 1.4z"/>
                  </svg>
                  Instagram
                </a>
              )}
              {refugio.redes.facebook && (
                <a
                  href={refugio.redes.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-blanco-calido text-tinta px-5 py-2.5 hover:brightness-95"
                >
                  {/* Ícono Facebook */}
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"/>
                  </svg>
                  Facebook
                </a>
              )}
              {refugio.email && (
                <a
                  href={`mailto:${refugio.email}`}
                  className="rounded-full border-2 border-crema px-5 py-2.5 hover:bg-crema hover:text-tinta transition-colors"
                >
                  Email ✉️
                </a>
              )}
              {refugio.telefono && (
                <a
                  href={`tel:${refugio.telefono.replace(/[^+\d]/g, "")}`}
                  className="rounded-full border-2 border-crema px-5 py-2.5 hover:bg-crema hover:text-tinta transition-colors"
                >
                  Llamar 📞
                </a>
              )}
            </div>
          </div>

          {refugio.fotos.length > 0 && (
            <div
              className={`grid gap-1 p-1 ${
                refugio.fotos.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {refugio.fotos.slice(0, 4).map((f, i) => (
                <Image
                  key={f}
                  src={f}
                  alt={`Foto de ${refugio.nombre}`}
                  width={600}
                  height={450}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  priority={i === 0}
                  className={`h-full max-h-64 w-full rounded-2xl object-cover ${
                    refugio.fotos.length === 3 && i === 0 ? "col-span-2" : ""
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* HISTORIA */}
      {refugio.historia && (
        <section className="mt-12">
          <h2 className="font-display text-3xl font-black">Nuestra historia</h2>
          <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-tinta">
            {refugio.historia.split(/\n{2,}/).map((parrafo, i) => (
              <p key={i} className="whitespace-pre-line">{parrafo}</p>
            ))}
          </div>
        </section>
      )}

      {/* VIDEO */}
      {embed && (
        <section className="mt-12 text-center">
          <h2 className="font-display text-3xl font-black">Conocenos en video 🎬</h2>
          <div className="mx-auto mt-4 max-w-3xl">
            {embed.tipo === "archivo" ? (
              <video
                src={embed.src}
                controls
                playsInline
                className="w-full rounded-2xl border-2 border-crema-2 bg-tinta"
              />
            ) : (
              <iframe
                src={embed.src}
                title={`Video de ${refugio.nombre}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                className={`w-full rounded-2xl border-2 border-crema-2 ${
                  embed.tipo === "instagram" ? "mx-auto aspect-[4/5] max-w-md" : "aspect-video"
                }`}
              />
            )}
          </div>
        </section>
      )}

      {/* CAMPAÑAS ACTIVAS */}
      {susCampanas.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-3xl font-black">Sus campañas activas 💛</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {susCampanas.map((c) => (
              <div key={c.id} className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6">
                <h3 className="font-display text-xl font-bold">{c.titulo}</h3>
                <p className="mt-2 text-sm text-tinta-suave">{c.descripcion}</p>
                {c.metaMonto ? (
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
                ) : (
                  <p className="mt-4 text-xs font-bold text-salvia-oscuro">
                    ${c.recaudado.toLocaleString("es-AR")} recaudados
                  </p>
                )}
                <Link
                  href="/donaciones"
                  className="mt-4 inline-block rounded-full bg-terracota text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-oscuro transition-colors"
                >
                  Donar 💛
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUS ANIMALES */}
      <section className="mt-12">
        <h2 className="font-display text-3xl font-black">Sus animales</h2>
        {animales.length === 0 ? (
          <p className="mt-4 text-tinta-suave">
            Este refugio no tiene animales publicados por ahora.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {animales.map((a) => (
              <CardAnimal key={a.id} animal={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
