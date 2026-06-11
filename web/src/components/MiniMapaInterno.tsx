"use client";

import { Circle, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Mapa chico con un círculo de zona (no un pin exacto): la ubicación que
// mostramos es aproximada a propósito, sobre todo para particulares.
export default function MiniMapaInterno({
  lat,
  lng,
  etiqueta,
}: {
  lat: number;
  lng: number;
  etiqueta: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-crema-2">
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "14rem", width: "100%" }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[lat, lng]}
          radius={600}
          pathOptions={{ color: "#d95d28", fillColor: "#d95d28", fillOpacity: 0.25 }}
        />
      </MapContainer>
      <p className="bg-blanco-calido px-4 py-2 text-xs text-tinta-suave">
        📍 {etiqueta} — ubicación aproximada
      </p>
    </div>
  );
}
