// Categorías fijas de causa para donaciones y campañas.
// Si se agrega una acá, agregarla también al check constraint de
// campanas.causa en supabase/schema.sql.

export const CAUSAS = [
  {
    id: "cirugias",
    nombre: "Cirugías",
    emoji: "🩺",
    descripcion: "Operaciones y tratamientos veterinarios urgentes",
  },
  {
    id: "refugios",
    nombre: "Refugios",
    emoji: "🏠",
    descripcion: "Mantenimiento y mejoras de los refugios",
  },
  {
    id: "rescates",
    nombre: "Rescates",
    emoji: "🚑",
    descripcion: "Rescate de animales en situación de calle o maltrato",
  },
  {
    id: "castraciones",
    nombre: "Castraciones",
    emoji: "✂️",
    descripcion: "Jornadas de castración para frenar el abandono",
  },
  {
    id: "alimento",
    nombre: "Alimento",
    emoji: "🥣",
    descripcion: "Comida para los animales rescatados",
  },
  {
    id: "plataforma",
    nombre: "Plataforma",
    emoji: "💻",
    descripcion: "Dominio y servicios que mantienen AdoptAR online y gratis",
  },
] as const;

export type CausaId = (typeof CAUSAS)[number]["id"];

export function esCausa(valor: string): valor is CausaId {
  return CAUSAS.some((c) => c.id === valor);
}

export function nombreCausa(id: string): string {
  const causa = CAUSAS.find((c) => c.id === id);
  return causa ? `${causa.emoji} ${causa.nombre}` : id;
}
