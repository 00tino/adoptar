import Link from "next/link";
import Image from "next/image";
import { FOTOS } from "@/lib/fotos";

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <Image
        src={FOTOS.noEncontrada.src}
        alt={FOTOS.noEncontrada.alt}
        width={320}
        height={320}
        sizes="(min-width: 640px) 320px, 60vw"
        className="mx-auto aspect-square w-60 rounded-3xl object-cover sm:w-80"
      />
      <h1 className="mt-6 font-display text-4xl font-black">Esta página se escapó</h1>
      <p className="mt-2 text-tinta-suave">
        No encontramos lo que buscabas, pero hay muchos animales esperándote.
      </p>
      <Link
        href="/animales"
        className="mt-6 inline-block rounded-full bg-terracota text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-oscuro transition-colors"
      >
        Ver animales en adopción
      </Link>
    </div>
  );
}
