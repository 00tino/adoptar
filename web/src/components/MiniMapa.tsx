"use client";

// Mini-mapa del perfil del animal: un solo marcador con la ubicación
// aproximada. Carga Leaflet solo en el navegador, como MapaCliente.
import dynamic from "next/dynamic";

const Mapa = dynamic(() => import("./MiniMapaInterno"), {
  ssr: false,
  loading: () => (
    <div className="h-56 rounded-2xl bg-crema-2/60 flex items-center justify-center text-tinta-suave font-bold">
      Cargando mapa… 🗺️
    </div>
  ),
});

export default function MiniMapa(props: {
  lat: number;
  lng: number;
  etiqueta: string;
}) {
  return <Mapa {...props} />;
}
