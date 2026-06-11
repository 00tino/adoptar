import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  obtenerAnimalPorSlug,
  obtenerAnimales,
  obtenerRefugioPorId,
} from "@/lib/datos";
import { edadLegible } from "@/lib/tipos";
import GaleriaAnimal from "@/components/GaleriaAnimal";
import MiniMapa from "@/components/MiniMapa";
import CardAnimal from "@/components/CardAnimal";
import ChatAnimal from "@/components/ChatAnimal";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { supabaseDisponible } from "@/lib/supabase";

// PERFIL DE ANIMAL: datos completos + contacto + SEO con Schema.org.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const animal = await obtenerAnimalPorSlug(slug);
  if (!animal) return {};
  return {
    title: `Adoptá a ${animal.nombre} — ${animal.especie} en ${animal.ciudad}`,
    description: animal.descripcion.slice(0, 160),
    openGraph: {
      title: `Adoptá a ${animal.nombre} | AdoptAR`,
      description: animal.descripcion.slice(0, 160),
    },
  };
}

export default async function PaginaAnimal({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const animal = await obtenerAnimalPorSlug(slug);
  if (!animal) notFound();

  const refugio = animal.refugioId
    ? await obtenerRefugioPorId(animal.refugioId)
    : null;

  // Animales relacionados: misma provincia o especie, excluyendo el actual
  const relacionados = (await obtenerAnimales())
    .filter(
      (a) =>
        a.id !== animal.id &&
        (a.provincia === animal.provincia || a.especie === animal.especie)
    )
    .slice(0, 3);

  const adoptado = animal.estado === "adoptado";

  // Ubicación para el mini-mapa. La base ya guarda coordenadas aproximadas,
  // pero para particulares sumamos un desplazamiento fijo (~500 m, derivado
  // del id para que no cambie entre visitas) como capa extra de privacidad.
  let ubicacion: { lat: number; lng: number } | null = null;
  if (animal.latAprox && animal.lngAprox) {
    if (animal.refugioId) {
      ubicacion = { lat: animal.latAprox, lng: animal.lngAprox };
    } else {
      const hash = [...animal.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);
      ubicacion = {
        lat: animal.latAprox + ((hash % 100) / 100 - 0.5) * 0.009,
        lng: animal.lngAprox + ((Math.floor(hash / 10) % 100) / 100 - 0.5) * 0.009,
      };
    }
  }

  // Datos de contacto: del refugio, o genéricos del particular (en la versión
  // con Supabase saldrán de su perfil aprobado)
  const whatsapp = refugio?.whatsapp ?? null;
  const email = refugio?.email ?? null;
  const telefono = refugio?.telefono ?? null;

  // Schema.org para que Google entienda que es un animal en adopción
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${animal.nombre} — ${animal.especie} en adopción`,
    description: animal.descripcion,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "ARS",
      availability: adoptado
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      areaServed: `${animal.ciudad}, ${animal.provincia}, Argentina`,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Escapamos "<" para que una descripción con "</script>" no inyecte HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />

      <nav aria-label="Migas de pan" className="text-sm text-tinta-suave">
        <Link href="/animales" className="hover:underline">← Volver al catálogo</Link>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Galería: fotos reales de Supabase Storage (o placeholder) + video */}
        <div>
          <GaleriaAnimal
            fotos={animal.fotos}
            videoUrl={animal.videoUrl}
            especie={animal.especie}
            nombre={animal.nombre}
            semilla={animal.id}
          />
          {ubicacion && (
            <div className="mt-4">
              <MiniMapa
                lat={ubicacion.lat}
                lng={ubicacion.lng}
                etiqueta={`${animal.ciudad}, ${animal.provincia}`}
              />
            </div>
          )}
        </div>

        {/* Datos */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-5xl font-black">{animal.nombre}</h1>
            <span
              className={`rounded-full px-4 py-1 text-sm font-bold text-blanco-calido ${
                adoptado
                  ? "bg-tinta-suave"
                  : animal.estado === "en_proceso"
                    ? "bg-sol text-tinta"
                    : "bg-salvia"
              }`}
            >
              {adoptado
                ? "Adoptado 🎉"
                : animal.estado === "en_proceso"
                  ? "En proceso de adopción"
                  : "Disponible"}
            </span>
          </div>

          <p className="mt-2 text-tinta-suave font-bold">
            {animal.tipo === "transito" ? "💛 Necesita hogar de tránsito" : "🏡 En adopción"}
            {" · "}📍 {animal.ciudad}, {animal.provincia}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm rounded-2xl bg-blanco-calido border-2 border-crema-2 p-5">
            <div><dt className="font-bold text-tinta-suave">Especie</dt><dd className="capitalize">{animal.especie}</dd></div>
            <div><dt className="font-bold text-tinta-suave">Raza</dt><dd>{animal.raza}</dd></div>
            <div><dt className="font-bold text-tinta-suave">Edad</dt><dd>{edadLegible(animal.edadMeses)}</dd></div>
            <div><dt className="font-bold text-tinta-suave">Sexo</dt><dd>{animal.sexo === "hembra" ? "Hembra" : "Macho"}</dd></div>
            <div><dt className="font-bold text-tinta-suave">Tamaño</dt><dd className="capitalize">{animal.tamano}</dd></div>
            <div><dt className="font-bold text-tinta-suave">Castrado/a</dt><dd>{animal.castrado ? "Sí ✅" : "Todavía no"}</dd></div>
            <div className="col-span-2">
              <dt className="font-bold text-tinta-suave">Vacunas</dt>
              <dd>{animal.vacunas.length ? animal.vacunas.join(", ") : "Sin datos"}</dd>
            </div>
          </dl>

          <p className="mt-6 leading-relaxed">{animal.descripcion}</p>

          {/* Contacto */}
          <div className="mt-8 rounded-2xl bg-salvia-oscuro text-crema p-6">
            <h2 className="font-display text-2xl font-bold">
              ¿Querés darle un hogar a {animal.nombre}?
            </h2>
            <p className="mt-1 text-sm text-crema-2">
              {refugio ? (
                <>Lo publica <Link href={`/refugios/${refugio.slug}`} className="font-bold underline">{refugio.nombre}</Link></>
              ) : (
                <>Lo publica {animal.particularNombre} (particular verificado)</>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola! Vi a ${animal.nombre} en AdoptAR y me interesa adoptarlo/a 🐾`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-sol text-tinta px-5 py-2 font-bold text-sm hover:brightness-105"
                >
                  WhatsApp 💬
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(`Consulta por ${animal.nombre} (AdoptAR)`)}`}
                  className="rounded-full border-2 border-crema px-5 py-2 font-bold text-sm hover:bg-crema hover:text-tinta transition-colors"
                >
                  Email ✉️
                </a>
              )}
              {telefono && (
                <a
                  href={`tel:${telefono.replace(/[^+\d]/g, "")}`}
                  className="rounded-full border-2 border-crema px-5 py-2 font-bold text-sm hover:bg-crema hover:text-tinta transition-colors"
                >
                  Llamar 📞
                </a>
              )}
            </div>
          </div>

          {/* Chat interno: solo con sesión iniciada y Supabase configurado */}
          {supabaseDisponible() && clerkDisponible() && (
            <div className="mt-6">
              <h2 className="font-display text-2xl font-bold">Chat con quien lo publica 💬</h2>
              {(await usuarioActual()) ? (
                <ChatAnimal animalId={animal.id} />
              ) : (
                <p className="mt-2 text-sm text-tinta-suave">
                  Iniciá sesión (botón &quot;Ingresar&quot; arriba) para chatear
                  directamente desde la plataforma.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl font-black">También te están esperando</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relacionados.map((a) => (
              <CardAnimal key={a.id} animal={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
