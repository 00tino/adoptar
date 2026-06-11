import { ImageResponse } from "next/og";
import { obtenerAnimalPorSlug } from "@/lib/datos";
import { edadLegible } from "@/lib/tipos";

// Imagen OG dinámica por animal: replica el estilo de FotoAnimal
// (gradiente cálido + emoji de la especie) con los datos principales.

export const alt = "Animal en adopción en AdoptAR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const emojiPorEspecie: Record<string, string> = {
  perro: "🐶",
  gato: "🐱",
  otro: "🐰",
};

// Mismos pares de colores que los gradientes de FotoAnimal
const gradientes = [
  ["#d95d28", "#f2b734"],
  ["#5f7d56", "#f2b734"],
  ["#f2b734", "#d95d28"],
  ["#5f7d56", "#d95d28"],
];

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const animal = await obtenerAnimalPorSlug(slug);

  const nombre = animal?.nombre ?? "AdoptAR";
  const emoji = animal ? (emojiPorEspecie[animal.especie] ?? "🐾") : "🐾";
  const [c1, c2] = animal
    ? gradientes[animal.id.charCodeAt(animal.id.length - 1) % gradientes.length]
    : gradientes[0];
  const foto = animal?.fotos[0] ?? null;
  const detalle = animal
    ? `${animal.sexo === "hembra" ? "Hembra" : "Macho"} · ${edadLegible(animal.edadMeses)} · ${animal.ciudad}, ${animal.provincia}`
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
            background: `linear-gradient(135deg, ${c1}b3, ${c2}99)`,
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
            emoji
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
            {animal?.tipo === "transito"
              ? "💛 Necesita hogar de tránsito"
              : "🏡 En adopción"}
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, marginTop: 8 }}>
            {nombre}
          </div>
          <div style={{ fontSize: 36, color: "#5c4a3a", marginTop: 12 }}>
            {detalle}
          </div>
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
