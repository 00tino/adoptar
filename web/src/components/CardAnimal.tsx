import Link from "next/link";
import type { Animal } from "@/lib/tipos";
import { edadLegible } from "@/lib/tipos";
import FotoAnimal from "./FotoAnimal";

// Tarjeta de animal para grillas (home, catálogo, perfil de refugio).
export default function CardAnimal({ animal }: { animal: Animal }) {
  const esTransito = animal.tipo === "transito";
  return (
    <Link
      href={`/animales/${animal.slug}`}
      className="group block rounded-2xl bg-blanco-calido border-2 border-crema-2 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
    >
      <div className="relative">
        <FotoAnimal
          especie={animal.especie}
          nombre={animal.nombre}
          semilla={animal.id}
          clase="h-44 w-full"
        />
        <span
          className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-blanco-calido ${
            esTransito ? "bg-terracota" : "bg-salvia"
          }`}
        >
          {esTransito ? "💛 En tránsito" : "🏡 En adopción"}
        </span>
        {animal.estado === "en_proceso" && (
          <span className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold bg-sol text-tinta">
            En proceso
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-xl font-bold group-hover:text-terracota transition-colors">
          {animal.nombre}
        </h3>
        <p className="text-sm text-tinta-suave">
          {animal.raza} · {edadLegible(animal.edadMeses)} ·{" "}
          {animal.sexo === "hembra" ? "Hembra" : "Macho"}
        </p>
        <p className="mt-1 text-sm text-tinta-suave">
          📍 {animal.ciudad}, {animal.provincia}
        </p>
        <p className="mt-2 text-xs font-bold text-salvia-oscuro">
          {animal.particularNombre
            ? `Publica: ${animal.particularNombre} (particular)`
            : "Publica: refugio verificado"}
        </p>
      </div>
    </Link>
  );
}
