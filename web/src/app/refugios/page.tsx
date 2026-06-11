import type { Metadata } from "next";
import Link from "next/link";
import { obtenerAnimalesDeRefugio, obtenerRefugios } from "@/lib/datos";

export const metadata: Metadata = {
  title: "Refugios de animales verificados en Argentina",
  description:
    "Conocé los refugios verificados que publican animales en adopción en AdoptAR. Todos pasan por una revisión manual antes de activarse.",
};

export default async function PaginaRefugios() {
  const refugios = await obtenerRefugios();
  const conConteo = await Promise.all(
    refugios.map(async (r) => ({
      ...r,
      cantidad: (await obtenerAnimalesDeRefugio(r.id)).filter(
        (a) => a.estado === "disponible"
      ).length,
    }))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Refugios verificados</h1>
      <p className="mt-2 text-tinta-suave max-w-2xl">
        Cada refugio de AdoptAR pasa por una verificación manual: revisamos sus
        datos, su video institucional y su trayectoria antes de aprobarlo.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {conConteo.map((r) => (
          <Link
            key={r.id}
            href={`/refugios/${r.slug}`}
            className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <h2 className="font-display text-2xl font-bold">🏠 {r.nombre}</h2>
            <p className="text-sm text-tinta-suave">{r.ciudad}, {r.provincia}</p>
            <p className="mt-3 text-sm line-clamp-3">{r.descripcion}</p>
            <p className="mt-4 text-sm font-bold text-salvia-oscuro">
              {r.cantidad} {r.cantidad === 1 ? "animal disponible" : "animales disponibles"}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-crema-2/60 p-8 text-center">
        <h2 className="font-display text-2xl font-bold">¿Tenés un refugio?</h2>
        <p className="mt-2 text-tinta-suave">Sumate a AdoptAR, es gratis para siempre.</p>
        <Link
          href="/registrar-refugio"
          className="mt-4 inline-block rounded-full bg-terracota text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-oscuro transition-colors"
        >
          Registrar mi refugio
        </Link>
      </div>
    </div>
  );
}
