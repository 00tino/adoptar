// Importador de animales desde planillas (CSV / XLS / XLSX).
// Lógica PURA (auto-detección y normalización), sin xlsx ni red: así se puede
// testear con vitest y reutilizar en el cliente para re-mapear columnas sin
// bundlear SheetJS. El parseo del binario vive en ./planilla.ts (server-only).

/** Campos de un animal que sabemos mapear desde una planilla. */
export type CampoImport =
  | "nombre"
  | "especie"
  | "raza"
  | "edad_meses"
  | "edad_anios"
  | "sexo"
  | "tamano"
  | "ciudad"
  | "provincia"
  | "descripcion"
  | "castrado"
  | "tipo";

/** Extensiones que el importador sabe parsear. */
export const EXT_IMPORTABLES = ["csv", "tsv", "xls", "xlsx", "ods"];

export const CAMPOS: CampoImport[] = [
  "nombre",
  "especie",
  "raza",
  "edad_meses",
  "edad_anios",
  "sexo",
  "tamano",
  "ciudad",
  "provincia",
  "descripcion",
  "castrado",
  "tipo",
];

/** Etiquetas legibles para la UI del mapeo. */
export const ETIQUETA_CAMPO: Record<CampoImport, string> = {
  nombre: "Nombre",
  especie: "Especie",
  raza: "Raza",
  edad_meses: "Edad (en meses)",
  edad_anios: "Edad (en años)",
  sexo: "Sexo",
  tamano: "Tamaño",
  ciudad: "Ciudad",
  provincia: "Provincia",
  descripcion: "Descripción",
  castrado: "Castrado/esterilizado",
  tipo: "Tipo (adopción/tránsito)",
};

/** Mapeo de campo → índice de columna en la planilla (o null si no hay). */
export type Mapeo = Record<CampoImport, number | null>;

/** Animal ya normalizado, listo para insertar (sin foto). */
export interface FilaImportada {
  nombre: string;
  especie: "perro" | "gato" | "otro";
  raza: string | null;
  edad_meses: number;
  sexo: "macho" | "hembra";
  tamano: "chico" | "mediano" | "grande";
  ciudad: string;
  provincia: string;
  descripcion: string;
  castrado: boolean;
  tipo: "adopcion" | "transito";
  /** Campos mínimos faltantes (nombre y/o especie). Vacío = lista para importar. */
  faltantes: string[];
}

/** Saca acentos, pasa a minúsculas y recorta, para comparar encabezados/valores. */
function normalizar(texto: unknown): string {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Alias de encabezados (es/en) por campo. Se comparan normalizados.
const ALIAS: Record<CampoImport, string[]> = {
  nombre: ["nombre", "name", "nombre del animal", "mascota"],
  especie: ["especie", "tipo de animal", "species", "animal", "perro/gato"],
  raza: ["raza", "breed"],
  edad_meses: ["edad en meses", "edad meses", "meses", "age months", "months"],
  edad_anios: ["edad", "edad anios", "edad en anios", "age", "anios", "years", "edad (anios)"],
  sexo: ["sexo", "sex", "genero", "gender"],
  tamano: ["tamano", "tamano del animal", "size", "porte"],
  ciudad: ["ciudad", "localidad", "city", "town"],
  provincia: ["provincia", "estado", "province", "state"],
  descripcion: ["descripcion", "notas", "observaciones", "description", "notes", "comentarios"],
  castrado: ["castrado", "esterilizado", "neutered", "spayed", "castrado/esterilizado"],
  tipo: ["tipo", "tipo de publicacion", "adopcion/transito", "type"],
};

/** Auto-detecta qué columna corresponde a cada campo según los encabezados. */
export function detectarMapeo(encabezados: string[]): Mapeo {
  const norm = encabezados.map(normalizar);
  const mapeo = Object.fromEntries(CAMPOS.map((c) => [c, null])) as Mapeo;
  for (const campo of CAMPOS) {
    const alias = ALIAS[campo];
    // 1º coincidencia exacta; si no, coincidencia parcial (contiene el alias)
    let idx = norm.findIndex((h) => h !== "" && alias.includes(h));
    if (idx === -1) {
      idx = norm.findIndex((h) => h !== "" && alias.some((a) => h.includes(a)));
    }
    if (idx !== -1) mapeo[campo] = idx;
  }
  // edad_meses y edad_anios no pueden apuntar a la misma columna
  if (mapeo.edad_meses !== null && mapeo.edad_meses === mapeo.edad_anios) {
    mapeo.edad_anios = null;
  }
  return mapeo;
}

const SI = ["si", "s", "yes", "y", "true", "1", "verdadero", "x", "castrado", "esterilizado"];
const NO = ["no", "n", "false", "0", "falso", ""];

function valor(fila: string[], idx: number | null): string {
  return idx === null ? "" : String(fila[idx] ?? "").trim();
}

function normalizarEspecie(v: string): "perro" | "gato" | "otro" | null {
  const n = normalizar(v);
  if (n === "") return null;
  if (["perro", "perra", "dog", "can", "canino", "cachorro"].some((a) => n.includes(a))) return "perro";
  if (["gato", "gata", "cat", "felino", "minino"].some((a) => n.includes(a))) return "gato";
  return "otro";
}

function normalizarSexo(v: string): "macho" | "hembra" {
  const n = normalizar(v);
  if (["hembra", "female", "f", "h", "hembras"].includes(n) || n.startsWith("hemb")) return "hembra";
  return "macho";
}

function normalizarTamano(v: string): "chico" | "mediano" | "grande" {
  const n = normalizar(v);
  if (["chico", "pequeno", "small", "s", "mini", "petizo"].some((a) => n.includes(a))) return "chico";
  if (["grande", "large", "big", "g", "xl", "l"].some((a) => n === a || n.includes(a))) return "grande";
  return "mediano";
}

function normalizarBool(v: string): boolean {
  const n = normalizar(v);
  if (NO.includes(n)) return false;
  return SI.includes(n);
}

function normalizarTipo(v: string): "adopcion" | "transito" {
  const n = normalizar(v);
  if (n.includes("transit")) return "transito";
  return "adopcion";
}

/** Convierte una fila cruda + mapeo en un animal normalizado y marca faltantes. */
export function normalizarFila(fila: string[], mapeo: Mapeo): FilaImportada {
  const faltantes: string[] = [];

  const nombre = valor(fila, mapeo.nombre).slice(0, 80);
  if (!nombre) faltantes.push("nombre");

  const especie = normalizarEspecie(valor(fila, mapeo.especie));
  if (!especie) faltantes.push("especie");

  // Edad: prioridad a meses; si no, años × 12
  const mesesCrudo = Number(valor(fila, mapeo.edad_meses).replace(/[^\d.]/g, ""));
  const aniosCrudo = Number(valor(fila, mapeo.edad_anios).replace(/[^\d.]/g, ""));
  let edad_meses = 0;
  if (Number.isFinite(mesesCrudo) && mesesCrudo > 0) edad_meses = Math.round(mesesCrudo);
  else if (Number.isFinite(aniosCrudo) && aniosCrudo > 0) edad_meses = Math.round(aniosCrudo * 12);
  edad_meses = Math.min(Math.max(edad_meses, 0), 600);

  return {
    nombre,
    especie: especie ?? "otro",
    raza: valor(fila, mapeo.raza).slice(0, 80) || null,
    edad_meses,
    sexo: normalizarSexo(valor(fila, mapeo.sexo)),
    tamano: normalizarTamano(valor(fila, mapeo.tamano)),
    ciudad: valor(fila, mapeo.ciudad).slice(0, 120),
    provincia: valor(fila, mapeo.provincia).slice(0, 120),
    descripcion: valor(fila, mapeo.descripcion).slice(0, 3000),
    castrado: normalizarBool(valor(fila, mapeo.castrado)),
    tipo: normalizarTipo(valor(fila, mapeo.tipo)),
    faltantes,
  };
}
