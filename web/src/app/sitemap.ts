import type { MetadataRoute } from "next";
import { obtenerAnimales, obtenerRefugios } from "@/lib/datos";

// Sitemap automático: incluye páginas fijas + cada animal y refugio.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://adoptar.dpdns.org";
  const [animales, refugios] = await Promise.all([
    obtenerAnimales(),
    obtenerRefugios(),
  ]);

  const fijas = ["", "/animales", "/transito", "/refugios", "/mapa", "/donaciones", "/donaciones/mensual", "/registrar-refugio", "/quienes-somos", "/terminos", "/privacidad"].map(
    (ruta) => ({ url: `${base}${ruta}`, changeFrequency: "daily" as const })
  );

  return [
    ...fijas,
    ...animales.map((a) => ({
      url: `${base}/animales/${a.slug}`,
      lastModified: a.creadoEl,
      changeFrequency: "weekly" as const,
    })),
    ...refugios.map((r) => ({
      url: `${base}/refugios/${r.slug}`,
      changeFrequency: "weekly" as const,
    })),
  ];
}
