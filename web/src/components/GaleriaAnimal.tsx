"use client";

import { useState } from "react";
import Image from "next/image";
import type { Especie } from "@/lib/tipos";
import FotoAnimal from "./FotoAnimal";

// Galería del perfil del animal: foto principal + miniaturas + video.
// Si el animal no tiene fotos, muestra el placeholder de siempre.
export default function GaleriaAnimal({
  fotos,
  videoUrl,
  especie,
  nombre,
  semilla,
}: {
  fotos: string[];
  videoUrl: string | null;
  especie: Especie;
  nombre: string;
  semilla: string;
}) {
  const [actual, setActual] = useState(0);

  if (fotos.length === 0) {
    return (
      <div>
        <FotoAnimal
          especie={especie}
          nombre={nombre}
          semilla={semilla}
          clase="h-80 sm:h-96 w-full rounded-3xl"
        />
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="mt-4 w-full rounded-3xl border-2 border-crema-2"
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-80 sm:h-96 w-full overflow-hidden rounded-3xl">
        <Image
          src={fotos[actual]}
          alt={`Foto ${actual + 1} de ${nombre}`}
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          priority
          className="object-cover"
        />
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActual((actual - 1 + fotos.length) % fotos.length)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-blanco-calido/85 text-xl font-bold text-tinta shadow hover:bg-blanco-calido transition-colors"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setActual((actual + 1) % fotos.length)}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-blanco-calido/85 text-xl font-bold text-tinta shadow hover:bg-blanco-calido transition-colors"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-tinta/60 px-3 py-1 text-xs font-bold text-blanco-calido">
              {actual + 1} / {fotos.length}
            </span>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={foto}
              type="button"
              onClick={() => setActual(i)}
              aria-label={`Ver foto ${i + 1} de ${nombre}`}
              className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                i === actual ? "border-terracota" : "border-crema-2 hover:border-sol"
              }`}
            >
              <Image
                src={foto}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
      {videoUrl && (
        <video
          src={videoUrl}
          controls
          preload="metadata"
          className="mt-4 w-full rounded-3xl border-2 border-crema-2"
        />
      )}
    </div>
  );
}
