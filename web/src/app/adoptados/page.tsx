import type { Metadata } from "next";
import Link from "next/link";
import { obtenerAnimalesPaginados, ANIMALES_POR_PAGINA } from "@/lib/datos";
import CardAnimal from "@/components/CardAnimal";

export const metadata: Metadata = { title: "Adopciones felices", description: "Conocé a los animales que ya encontraron una familia. Cada adopción abre una nueva oportunidad." };

export default async function PaginaAdoptados({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const params = await searchParams;
  const pagina = Math.max(1, Math.floor(Number(params.pagina) || 1));
  const { animales, total } = await obtenerAnimalesPaginados({ estado: "adoptado", tipo: "adopcion" }, pagina);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-bold uppercase tracking-wide text-salvia-oscuro">Un hogar cambia una vida</p>
      <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">Ya tienen familia</h1>
      <p className="mt-4 max-w-2xl text-lg text-tinta-suave">Estas adopciones ya se concretaron. Gracias a quienes abrieron su casa y a quienes cuidaron de ellos hasta ese momento.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{animales.map((animal) => <CardAnimal key={animal.id} animal={animal} />)}</div>
      {!animales.length && <p className="mt-6 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-6">{pagina === 1 ? "Acá vamos a compartir las adopciones a medida que los refugios las confirmen." : "No hay adopciones en esta página."}</p>}
      <nav aria-label="Páginas de adopciones felices" className="mt-6 flex gap-5">
        {pagina > 1 && <Link href={`/adoptados?pagina=${pagina - 1}`} className="py-3 font-bold underline">Anterior</Link>}
        {pagina * ANIMALES_POR_PAGINA < total && <Link href={`/adoptados?pagina=${pagina + 1}`} className="py-3 font-bold underline">Siguiente</Link>}
      </nav>
      <Link href="/animales" className="mt-8 inline-block min-h-11 rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido">Conocé a quienes todavía esperan</Link>
    </div>
  );
}
