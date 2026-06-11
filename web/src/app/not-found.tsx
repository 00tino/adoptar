import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-7xl">🐕‍🦺</p>
      <h1 className="mt-4 font-display text-4xl font-black">Esta página se escapó</h1>
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
