import type { NextConfig } from "next";
import { constants } from "@clerk/backend/internal";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  experimental: {
    // El límite por defecto de los Server Actions es 1 MB. Subimos fotos (8 MB),
    // videos (60 MB) y archivos del vault (20 MB) por server action, así que lo
    // ampliamos. Está protegido por login + rate limit por IP.
    serverActions: { bodySizeLimit: "64mb" },
  },
  // Fotos de animales servidas desde el bucket público de Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mkiedljddnlrncfzbkek.supabase.co",
        pathname: "/storage/v1/object/public/media/**",
      },
    ],
  },
  async redirects() {
    return [{ source: "/publico/:path*", destination: "/:path*", permanent: true }];
  },
  async rewrites() {
    const sinSesion = [
      ...["cookie", "authorization", "x-clerk-auth-status", "x-clerk-request-data", "next-action"]
        .map((key) => ({ type: "header" as const, key })),
      ...[...Object.values(constants.QueryParameters), "__clerk_ticket", "__clerk_status"]
        .map((key) => ({ type: "query" as const, key })),
    ];
    return {
      beforeFiles: [
        { source: "/", destination: "/publico", missing: sinSesion },
        {
          source: "/animales", destination: "/publico/animales",
          missing: [...sinSesion, ...["especie", "tipo", "provincia", "tamano", "sexo", "edad", "castrado", "q", "pagina", "lat", "lng", "radio"]
            .map((key) => ({ type: "query" as const, key }))],
        },
        { source: "/refugios", destination: "/publico/refugios", missing: sinSesion },
        {
          source: "/animales/:slug((?:adoptar-|transito-)[a-z0-9-]+)", destination: "/publico/animales/:slug",
          missing: [...sinSesion, { type: "query", key: "postulado" }],
        },
      ],
      afterFiles: [], fallback: [],
    };
  },
  // Headers de seguridad para todas las respuestas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Nadie puede meter AdoptAR dentro de un iframe (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // El navegador no debe "adivinar" tipos de contenido
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No filtrar la URL completa al navegar a otros sitios
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Bloquear APIs sensibles que no usamos (la geolocalización sí, para el mapa)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
