"use client";

// Mapa interactivo de Argentina (Leaflet + OpenStreetMap, 100% gratuito).
// Marcadores: 🐾 animal en adopción · 💛 en tránsito · 🏠 refugio.
// Es un componente cliente: Leaflet necesita el navegador (window).

import { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export interface PuntoMapa {
  id: string;
  tipo: "adopcion" | "transito" | "refugio";
  nombre: string;
  detalle: string;
  url: string;
  lat: number;
  lng: number;
}

const emojiPorTipo = { adopcion: "🐾", transito: "💛", refugio: "🏠" } as const;

function iconoEmoji(tipo: keyof typeof emojiPorTipo) {
  return divIcon({
    html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${emojiPorTipo[tipo]}</div>`,
    className: "", // sin estilos default de Leaflet
    iconSize: [26, 26],
    iconAnchor: [13, 24],
  });
}

// Botón "Cerca mío": pide la ubicación al navegador y centra el mapa
function BotonCercaMio() {
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
            mapa.setView([pos.coords.latitude, pos.coords.longitude], 12);
            setBuscando(false);
          },
          () => setBuscando(false),
          { timeout: 8000 }
        );
      }}
      className="absolute bottom-4 right-4 z-[1000] rounded-full bg-blanco-calido border-2 border-crema-2 px-4 py-2 text-sm font-bold shadow hover:border-tinta transition-colors"
    >
      {buscando ? "Buscando…" : "📍 Cerca mío"}
    </button>
  );
}

export default function MapaArgentina({ puntos }: { puntos: PuntoMapa[] }) {
  const [filtro, setFiltro] = useState<"todos" | "transito" | "refugio">("todos");

  const visibles = useMemo(
    () =>
      puntos.filter((p) => {
        if (filtro === "todos") return true;
        return p.tipo === filtro;
      }),
    [puntos, filtro]
  );

  return (
    <div>
      {/* Filtros rápidos */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            ["todos", "Ver todos"],
            ["transito", "Solo tránsito 💛"],
            ["refugio", "Solo refugios 🏠"],
          ] as const
        ).map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setFiltro(clave)}
            className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-colors ${
              filtro === clave
                ? "bg-tinta text-crema border-tinta"
                : "border-crema-2 bg-blanco-calido hover:border-tinta"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="relative mt-4 rounded-3xl overflow-hidden border-2 border-crema-2 shadow">
        <MapContainer
          // Centro de Argentina, zoom país completo
          center={[-38.4, -63.6]}
          zoom={4}
          scrollWheelZoom
          style={{ height: "70vh", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visibles.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconoEmoji(p.tipo)}>
              <Popup>
                <strong>{p.nombre}</strong>
                <br />
                {p.detalle}
                <br />
                <Link href={p.url} className="font-bold">
                  Ver más →
                </Link>
              </Popup>
            </Marker>
          ))}
          <BotonCercaMio />
        </MapContainer>
      </div>

      <p className="mt-3 text-xs text-tinta-suave">
        🐾 en adopción · 💛 en tránsito · 🏠 refugio — Las ubicaciones de
        particulares son aproximadas (~500 m) para proteger su privacidad.
      </p>
    </div>
  );
}
