import type { Especie } from "@/lib/tipos";

// Foto de marcador de posición: hasta que conectemos Supabase Storage con las
// fotos reales, cada animal muestra un retrato cálido generado con gradiente +
// emoji de su especie. Funciona sin internet y sin configurar dominios de imagen.
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
  clase = "",
}: {
  especie: Especie;
  nombre: string;
  semilla: string;
  clase?: string;
}) {
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
