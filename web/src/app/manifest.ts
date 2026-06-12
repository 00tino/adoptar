import type { MetadataRoute } from "next";

// PWA instalable: con esto el sitio se puede "Agregar a la pantalla de inicio"
// en Android/iOS. Sin service worker: no hace falta para instalar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AdoptAR — Adopción de animales en Argentina",
    short_name: "AdoptAR",
    description:
      "Plataforma argentina sin fines de lucro para adoptar animales, encontrar hogares de tránsito y ayudar a refugios.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf4ea",
    theme_color: "#faf4ea",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/iconos/icono-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
