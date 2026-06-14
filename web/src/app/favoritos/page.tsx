import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { usuarioActual } from "@/lib/auth";
import { misFavoritos } from "@/lib/acciones-favoritos";
import CardAnimal from "@/components/CardAnimal";

export const metadata: Metadata = {
  title: "Mis favoritos",
  robots: { index: false },
};

export default async function PaginaFavoritos() {
  const user = await usuarioActual();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-6xl">❤️</p>
        <h1 className="mt-4 font-display text-3xl font-black">Mis favoritos</h1>
        <p className="mt-3 text-tinta-suave">
          Iniciá sesión para guardar animales y volver a verlos acá.
        </p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <button className="rounded-xl bg-terracota text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-oscuro transition-colors">
              Iniciar sesión
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const animales = await misFavoritos();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Mis favoritos ❤️</h1>
      <p className="mt-2 text-tinta-suave">
        {animales.length} {animales.length === 1 ? "animal guardado" : "animales guardados"}
      </p>

      {animales.length === 0 ? (
        <div className="mt-12 text-center py-16 rounded-2xl bg-crema-2/60">
          <p className="font-display text-2xl font-bold">Todavía no guardaste ninguno</p>
          <p className="mt-2 text-tinta-suave">
            Tocá el 🤍 en cualquier animal para guardarlo.
          </p>
          <Link
            href="/animales"
            className="mt-4 inline-block text-terracota font-bold hover:underline"
          >
            Ver animales →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {animales.map((a) => (
            <CardAnimal key={a.id} animal={a} logueado favorito />
          ))}
        </div>
      )}
    </div>
  );
}
