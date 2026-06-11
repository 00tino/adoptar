import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
