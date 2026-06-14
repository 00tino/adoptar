import { ImageResponse } from "next/og";
import { obtenerRefugioPorSlug } from "@/lib/datos";

// Imagen OG dinámica por refugio: foto (o emoji 🏠) + nombre y ubicación.

export const alt = "Refugio de animales en AdoptAR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const refugio = await obtenerRefugioPorSlug(slug);

  const nombre = refugio?.nombre ?? "Refugio en AdoptAR";
  const foto = refugio?.fotos?.[0] ?? null;
  const lugar = refugio
    ? `${refugio.ciudad}, ${refugio.provincia}`
    : "Adopción de animales en Argentina";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#faf4ea",
          padding: 40,
        }}
      >
        <div
          style={{
            width: 420,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 48,
            overflow: "hidden",
            background: "linear-gradient(135deg, #5f7d56cc, #f2b73499)",
            fontSize: 220,
          }}
        >
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto}
              alt=""
              width={420}
              height={550}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            "🏠"
          )}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 56,
            color: "#2e2118",
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: "#5c4a3a" }}>
            🏠 Refugio verificado
          </div>
          <div style={{ fontSize: 88, fontWeight: 800, marginTop: 8 }}>{nombre}</div>
          <div style={{ fontSize: 36, color: "#5c4a3a", marginTop: 12 }}>{`📍 ${lugar}`}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 48,
              fontSize: 40,
              fontWeight: 800,
              color: "#d95d28",
            }}
          >
            🐾 AdoptAR · adoptar.dpdns.org
          </div>
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}
