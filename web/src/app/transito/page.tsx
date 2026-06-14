import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { obtenerAnimales } from "@/lib/datos";
import { FOTOS } from "@/lib/fotos";
import CardAnimal from "@/components/CardAnimal";

export const metadata: Metadata = {
  title: "Hogares de tránsito para animales en Argentina",
  description:
    "¿Qué es el tránsito? Animales que necesitan un hogar temporal mientras encuentran familia definitiva. Sumate como hogar de tránsito o publicá un animal.",
};

export default async function PaginaTransito() {
  const enTransito = await obtenerAnimales({ tipo: "transito" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="overflow-hidden rounded-3xl bg-terracota text-blanco-calido lg:grid lg:grid-cols-[1fr_minmax(0,380px)]">
        <div className="p-8 sm:p-12">
        <h1 className="font-display text-4xl sm:text-5xl font-black">¿Qué es el tránsito? 💛</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          Un hogar de tránsito es un hogar temporal: recibís a un animal
          rescatado por unas semanas o meses mientras le buscamos su familia
          definitiva. No tiene costo (los rescatistas suelen cubrir alimento y
          veterinaria) y salva vidas: sin tránsito, muchos animales no pueden
          salir de la calle.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 font-bold text-sm">
          <Link href="/publicar-transito" className="rounded-full bg-sol text-tinta px-6 py-3 hover:brightness-105">
            Tengo un animal que necesita tránsito
          </Link>
          <Link href="/transito/alertas" className="rounded-full border-2 border-blanco-calido px-6 py-3 hover:bg-blanco-calido hover:text-terracota transition-colors">
            Avisarme de animales cerca mío 💛
          </Link>
        </div>
        </div>
        <Image
          src={FOTOS.transito.src}
          alt={FOTOS.transito.alt}
          width={760}
          height={560}
          priority
          sizes="(min-width: 1024px) 380px, 100vw"
          className="h-56 w-full object-cover lg:h-full"
        />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-3xl font-black">Necesitan tránsito ahora</h2>
        {enTransito.length === 0 ? (
          <p className="mt-4 text-tinta-suave">No hay animales en tránsito por el momento. 🎉</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enTransito.map((a) => (
              <CardAnimal key={a.id} animal={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
