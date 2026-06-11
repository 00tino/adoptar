import { ImageResponse } from "next/og";

// Imagen OG general del sitio (home y páginas sin imagen propia).

export const alt = "AdoptAR — Adopción de animales en Argentina";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #faf4ea, #f3e9d8)",
          color: "#2e2118",
        }}
      >
        <div style={{ fontSize: 140 }}>🐾</div>
        <div style={{ fontSize: 110, fontWeight: 800, marginTop: 16 }}>
          AdoptAR
        </div>
        <div style={{ fontSize: 42, color: "#5c4a3a", marginTop: 16 }}>
          Adopción de animales en Argentina
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#d95d28",
            marginTop: 40,
          }}
        >
          adoptar.dpdns.org
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}
