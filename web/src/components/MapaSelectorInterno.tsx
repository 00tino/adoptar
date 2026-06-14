"use client";

// Mapa para ELEGIR una zona: marcador que se mueve al hacer clic o arrastrar,
// más un círculo que muestra el radio de la alerta. Leaflet necesita el
// navegador, así que se carga con dynamic(ssr:false) desde FormularioAlerta.

import { useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

const icono = divIcon({
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">💛</div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 26],
});

// Captura clics en el mapa para mover el punto elegido
function CapturaClic({ onElegir }: { onElegir: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onElegir(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Botón "Usar mi ubicación": geolocaliza y recenta el mapa
function BotonMiUbicacion({ onElegir }: { onElegir: (lat: number, lng: number) => void }) {
  const mapa = useMap();
  const [buscando, setBuscando] = useState(false);
  return (
    <button
      type="button"
      disabled={buscando}
      onClick={() => {
        setBuscando(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            onElegir(latitude, longitude);
            mapa.setView([latitude, longitude], 12);
            setBuscando(false);
          },
          () => setBuscando(false),
          { timeout: 8000 }
        );
      }}
      className="absolute bottom-4 right-4 z-[1000] rounded-full bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold shadow hover:border-tinta transition-colors"
    >
      {buscando ? "Buscando…" : "📍 Usar mi ubicación"}
    </button>
  );
}

export default function MapaSelectorInterno({
  lat,
  lng,
  radioKm,
  onElegir,
}: {
  lat: number;
  lng: number;
  radioKm: number;
  onElegir: (lat: number, lng: number) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-crema-2">
      <MapContainer
        center={[lat, lng]}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "20rem", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CapturaClic onElegir={onElegir} />
        <Marker
          position={[lat, lng]}
          icon={icono}
          draggable
          eventHandlers={{
            dragend(e) {
              const p = e.target.getLatLng();
              onElegir(p.lat, p.lng);
            },
          }}
        />
        <Circle
          center={[lat, lng]}
          radius={radioKm * 1000}
          pathOptions={{ color: "#d95d28", fillColor: "#d95d28", fillOpacity: 0.12 }}
        />
        <BotonMiUbicacion onElegir={onElegir} />
      </MapContainer>
    </div>
  );
}
