"use client";

// Envoltorio que carga el mapa solo en el navegador (Leaflet no funciona
// en el servidor). Muestra un placeholder mientras carga.
import dynamic from "next/dynamic";
import type { PuntoMapa } from "./MapaArgentina";

const Mapa = dynamic(() => import("./MapaArgentina"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] rounded-3xl bg-crema-2/60 flex items-center justify-center text-tinta-suave font-bold">
      Cargando mapa… 🗺️
    </div>
  ),
});

export default function MapaCliente({ puntos }: { puntos: PuntoMapa[] }) {
  return <Mapa puntos={puntos} />;
}
