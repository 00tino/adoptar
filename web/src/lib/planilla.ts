// Parseo de planillas (CSV / XLS / XLSX / ODS) con SheetJS. Solo del lado
// servidor: importa el bundle de xlsx, así que NO importar desde el cliente.

import * as XLSX from "xlsx";

/**
 * Lee el buffer de una planilla y devuelve encabezados + filas (como strings).
 * Toma la primera hoja y descarta las filas totalmente vacías.
 */
export function parsearPlanilla(buffer: ArrayBuffer | Buffer): {
  encabezados: string[];
  filas: string[][];
} {
  const libro = XLSX.read(buffer, { type: "buffer" });
  const nombreHoja = libro.SheetNames[0];
  if (!nombreHoja) return { encabezados: [], filas: [] };
  const hoja = libro.Sheets[nombreHoja];
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (matriz.length === 0) return { encabezados: [], filas: [] };
  const encabezados = (matriz[0] as unknown[]).map((c) => String(c ?? "").trim());
  const filas = matriz
    .slice(1)
    .map((fila) => encabezados.map((_, i) => String((fila as unknown[])[i] ?? "").trim()))
    .filter((fila) => fila.some((c) => c !== ""));
  return { encabezados, filas };
}
