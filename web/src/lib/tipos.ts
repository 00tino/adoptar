// Tipos del dominio de AdoptAR.
// Reflejan el modelo de datos de Supabase (ver supabase/schema.sql).

export type Especie = "perro" | "gato" | "otro";
export type Sexo = "macho" | "hembra";
export type Tamano = "chico" | "mediano" | "grande";
export type TipoPublicacion = "adopcion" | "transito";
export type EstadoAnimal =
  | "pendiente"
  | "disponible"
  | "en_proceso"
  | "adoptado"
  | "rechazado";
export type EstadoRefugio =
  | "pendiente"
  | "verificado"
  | "estrella"
  | "suspendido";

export interface Refugio {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  /** Historia larga que el refugio escribe desde "Mi perfil" */
  historia: string;
  ciudad: string;
  provincia: string;
  lat: number;
  lng: number;
  telefono: string;
  email: string;
  whatsapp: string;
  /** URLs públicas de fotos del refugio en Supabase Storage */
  fotos: string[];
  /** Video de presentación: link de YouTube/Instagram o archivo subido */
  videoUrl: string | null;
  /** Redes sociales validadas (solo instagram.com / facebook.com) */
  redes: { instagram?: string; facebook?: string };
  estado: EstadoRefugio;
  creadoEl: string; // fecha ISO
}

export interface Animal {
  id: string;
  slug: string;
  nombre: string;
  especie: Especie;
  raza: string;
  /** Edad aproximada en meses */
  edadMeses: number;
  sexo: Sexo;
  tamano: Tamano;
  castrado: boolean;
  vacunas: string[];
  descripcion: string;
  ciudad: string;
  provincia: string;
  /** Coordenadas aproximadas (desplazadas para particulares) */
  latAprox: number;
  lngAprox: number;
  tipo: TipoPublicacion;
  estado: EstadoAnimal;
  /** null si lo publica un particular en tránsito */
  refugioId: string | null;
  /** Nombre visible del particular cuando no hay refugio */
  particularNombre: string | null;
  /** URLs públicas de fotos en Supabase Storage (vacío = placeholder) */
  fotos: string[];
  /** URL pública del video de presentación, si hay */
  videoUrl: string | null;
  creadoEl: string;
}

export interface Campana {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: "refugio" | "plataforma";
  refugioId: string | null;
  metaMonto: number | null;
  recaudado: number;
  estado: "pendiente" | "activa" | "cerrada";
}

/** Edad legible en español: "3 meses", "2 años" */
export function edadLegible(meses: number): string {
  if (meses < 12) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const anios = Math.floor(meses / 12);
  return `${anios} ${anios === 1 ? "año" : "años"}`;
}
