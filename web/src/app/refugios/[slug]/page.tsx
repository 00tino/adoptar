import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerAnimalesDeRefugio, obtenerRefugioPorSlug } from "@/lib/datos";
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

  const animales = await obtenerAnimalesDeRefugio(refugio.id);

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

      <div className="mt-6 rounded-3xl bg-salvia-oscuro text-crema p-8">
        <h1 className="font-display text-4xl sm:text-5xl font-black">🏠 {refugio.nombre}</h1>
        <p className="mt-2 text-crema-2 font-bold">📍 {refugio.ciudad}, {refugio.provincia}</p>
        <p className="mt-4 max-w-2xl leading-relaxed">{refugio.descripcion}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
          <a
            href={`https://wa.me/${refugio.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-sol text-tinta px-5 py-2 hover:brightness-105"
          >
            WhatsApp 💬
          </a>
          <a
            href={`mailto:${refugio.email}`}
            className="rounded-full border-2 border-crema px-5 py-2 hover:bg-crema hover:text-tinta transition-colors"
          >
            Email ✉️
          </a>
          <a
            href={`tel:${refugio.telefono.replace(/[^+\d]/g, "")}`}
            className="rounded-full border-2 border-crema px-5 py-2 hover:bg-crema hover:text-tinta transition-colors"
          >
            Llamar 📞
          </a>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-3xl font-black">Sus animales</h2>
        {animales.length === 0 ? (
          <p className="mt-4 text-tinta-suave">Este refugio no tiene animales publicados por ahora.</p>
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
