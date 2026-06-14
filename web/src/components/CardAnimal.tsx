import Link from "next/link";
import type { Animal } from "@/lib/tipos";
import { edadLegible } from "@/lib/tipos";
import FotoAnimal from "./FotoAnimal";
import BotonFavorito from "./BotonFavorito";

// Tarjeta de animal para grillas (home, catálogo, perfil de refugio).
// `distanciaKm` (opcional) se muestra en modo "cerca mío".
// `favorito`/`logueado` (opcionales) habilitan el corazón de favoritos.
export default function CardAnimal({
  animal,
  distanciaKm,
  favorito,
  logueado,
}: {
  animal: Animal;
  distanciaKm?: number;
  favorito?: boolean;
  logueado?: boolean;
}) {
  const esTransito = animal.tipo === "transito";
  const mostrarFavorito = logueado !== undefined;
  return (
    <div className="group relative rounded-2xl bg-blanco-calido border-2 border-crema-2 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
      {mostrarFavorito && (
        <BotonFavorito animalId={animal.id} inicial={!!favorito} logueado={!!logueado} />
      )}
      <Link href={`/animales/${animal.slug}`} className="block">
        <div className="relative">
          <FotoAnimal
            especie={animal.especie}
            nombre={animal.nombre}
            semilla={animal.id}
            foto={animal.fotos[0]}
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
            <span className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold bg-sol text-tinta">
              En proceso
            </span>
          )}
          {distanciaKm != null && (
            <span className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-bold bg-tinta text-crema">
              📍 a {distanciaKm < 1 ? "menos de 1" : Math.round(distanciaKm)} km
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
    </div>
  );
}
