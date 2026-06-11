import Image from "next/image";
import type { Especie } from "@/lib/tipos";

// Foto del animal: muestra la primera foto real de Supabase Storage si existe;
// si no hay fotos, cae al retrato cálido de gradiente + emoji de su especie.
const emojiPorEspecie: Record<Especie, string> = {
  perro: "🐶",
  gato: "🐱",
  otro: "🐰",
};

const gradientes = [
  "from-terracota/70 to-sol/60",
  "from-salvia/70 to-sol/50",
  "from-sol/70 to-terracota/50",
  "from-salvia/60 to-terracota/50",
];

export default function FotoAnimal({
  especie,
  nombre,
  semilla,
  foto,
  prioridad = false,
  clase = "",
}: {
  especie: Especie;
  nombre: string;
  semilla: string;
  /** URL pública de la foto real (Supabase Storage); si falta, placeholder */
  foto?: string | null;
  /** true para la imagen principal de la página (LCP) */
  prioridad?: boolean;
  clase?: string;
}) {
  if (foto) {
    return (
      <div className={`relative overflow-hidden ${clase}`}>
        <Image
          src={foto}
          alt={`Foto de ${nombre}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={prioridad}
          className="object-cover"
        />
      </div>
    );
  }

  // Elegimos el gradiente según el id para que cada animal tenga su color fijo
  const g = gradientes[semilla.charCodeAt(semilla.length - 1) % gradientes.length];
  return (
    <div
      role="img"
      aria-label={`Foto de ${nombre}`}
      className={`flex items-center justify-center bg-gradient-to-br ${g} ${clase}`}
    >
      <span aria-hidden className="text-6xl drop-shadow-sm">
        {emojiPorEspecie[especie]}
      </span>
    </div>
  );
}
