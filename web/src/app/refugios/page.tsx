import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { obtenerAnimalesDeRefugio, obtenerRefugios } from "@/lib/datos";
import { FOTOS } from "@/lib/fotos";

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
            className="overflow-hidden rounded-2xl bg-blanco-calido border-2 border-crema-2 hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            {/* Foto del refugio, o placeholder lindo si no subió ninguna */}
            <Image
              src={r.fotos[0] ?? FOTOS.refugio.src}
              alt={r.fotos[0] ? `Foto de ${r.nombre}` : FOTOS.refugio.alt}
              width={600}
              height={340}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-40 w-full object-cover"
            />
            <div className="p-6">
            <h2 className="font-display text-2xl font-bold">🏠 {r.nombre}</h2>
            <p className="text-sm text-tinta-suave">{r.ciudad}, {r.provincia}</p>
            <p className="mt-3 text-sm line-clamp-3">{r.descripcion}</p>
            <p className="mt-4 text-sm font-bold text-salvia-oscuro">
              {r.cantidad} {r.cantidad === 1 ? "animal disponible" : "animales disponibles"}
            </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-crema-2/60 p-8 text-center">
        <h2 className="font-display text-2xl font-bold">¿Tenés un refugio?</h2>
        <p className="mt-2 text-tinta-suave">Sumate a AdoptAR, es gratis para siempre.</p>
        <Link
          href="/registrar-refugio"
          className="mt-4 inline-block rounded-full bg-terracota-oscuro text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-mas-oscuro transition-colors"
        >
          Registrar mi refugio
        </Link>
      </div>
    </div>
  );
}
