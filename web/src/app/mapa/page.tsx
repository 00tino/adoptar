import type { Metadata } from "next";
import { obtenerAnimales, obtenerRefugios } from "@/lib/datos";
import { edadLegible } from "@/lib/tipos";
import MapaCliente from "@/components/MapaCliente";
import type { PuntoMapa } from "@/components/MapaArgentina";

export const metadata: Metadata = {
  title: "Mapa de animales en adopción en Argentina",
  description:
    "Mapa interactivo de Argentina: animales en adopción, en tránsito y refugios cerca tuyo.",
};

// MAPA: los datos se leen en el servidor y el mapa se dibuja en el cliente.
export default async function PaginaMapa() {
  const [animales, refugios] = await Promise.all([
    obtenerAnimales(),
    obtenerRefugios(),
  ]);

  const puntos: PuntoMapa[] = [
    ...animales
      .filter((a) => a.latAprox && a.lngAprox && a.estado === "disponible")
      .map((a) => ({
        id: `a-${a.id}`,
        tipo: a.tipo,
        nombre: a.nombre,
        detalle: `${a.raza} · ${edadLegible(a.edadMeses)} · ${a.ciudad}`,
        url: `/animales/${a.slug}`,
        lat: a.latAprox,
        lng: a.lngAprox,
      })),
    ...refugios
      .filter((r) => r.lat && r.lng)
      .map((r) => ({
        id: `r-${r.id}`,
        tipo: "refugio" as const,
        nombre: r.nombre,
        detalle: `${r.ciudad}, ${r.provincia}`,
        url: `/refugios/${r.slug}`,
        lat: r.lat,
        lng: r.lng,
      })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Mapa de AdoptAR 🗺️</h1>
      <p className="mt-2 text-tinta-suave">
        Acercate a tu zona para descubrir animales y refugios cerca tuyo.
      </p>
      <div className="mt-6">
        {puntos.length === 0 ? (
          <div className="rounded-2xl bg-crema-2/60 p-10 text-center text-tinta-suave">
            Todavía no hay animales ni refugios con ubicación cargada.
          </div>
        ) : (
          <MapaCliente puntos={puntos} />
        )}
      </div>
    </div>
  );
}
