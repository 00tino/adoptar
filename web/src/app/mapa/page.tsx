import type { Metadata } from "next";
import { obtenerPuntosMapa } from "@/lib/datos";
import MapaCliente from "@/components/MapaCliente";

export const metadata: Metadata = {
  title: "Mapa de animales en adopción en Argentina",
  description:
    "Mapa interactivo de Argentina: animales en adopción, en tránsito y refugios cerca tuyo.",
};

// MAPA: los datos se leen en el servidor y el mapa se dibuja en el cliente.
export default async function PaginaMapa() {
  const puntos = await obtenerPuntosMapa();

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
