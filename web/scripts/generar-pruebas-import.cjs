// Genera planillas de prueba para el importador de animales (Fase 10).
// Cada archivo tiene 10 animales: una mezcla de filas válidas y con problemas
// (sin nombre, sin especie, especie desconocida, edades en años/meses, etc.)
// para probar auto-detección de columnas, normalización y marcado de inválidas.
//
// Uso: node scripts/generar-pruebas-import.cjs
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "archivos-prueba");
fs.mkdirSync(OUT, { recursive: true });

// ---- Set en ESPAÑOL (encabezado "Edad" => años) ----
const headerEs = [
  "Nombre", "Especie", "Raza", "Edad", "Sexo", "Tamaño",
  "Ciudad", "Provincia", "Descripción", "Castrado", "Tipo",
];
const filasEs = [
  ["Luna", "Perro", "Mestizo", 2, "Hembra", "Mediano", "La Plata", "Buenos Aires", "Muy cariñosa y sociable", "Sí", "Adopción"],          // OK
  ["Rocky", "Gato", "Siamés", 1, "Macho", "Chico", "Córdoba", "Córdoba", "Juguetón", "No", "Adopción"],                                     // OK
  ["", "Perro", "", 3, "Macho", "Grande", "Rosario", "Santa Fe", "Tranquilo, ideal para depto", "true", "Tránsito"],                        // FALTA NOMBRE
  ["Milo", "", "Caniche", 0.5, "Macho", "Chico", "Mendoza", "Mendoza", "Cachorro recién rescatado", "No", "Adopción"],                       // FALTA ESPECIE
  ["Nina", "Conejo", "", 1, "Hembra", "Chico", "CABA", "CABA", "Conejita mansa", "No", "Adopción"],                                          // especie desconocida -> otro (OK)
  ["Thor", "perro", "Ovejero alemán", 5, "macho", "grande", "Mar del Plata", "Buenos Aires", "Buen guardián", "si", "transito"],            // OK (minúsculas)
  ["Maia", "GATO", "", 2, "F", "M", "Salta", "Salta", "", "verdadero", "adopcion"],                                                          // OK (F->hembra, castrado verdadero->true)
  ["", "", "Desconocida", "", "", "Mediano", "Tigre", "Buenos Aires", "Encontrado en la calle, sin más datos", "No", "Adopción"],            // FALTA NOMBRE + ESPECIE (con datos)
  ["Coco", "Ave", "", 0, "Macho", "Chico", "Neuquén", "Neuquén", "Pájaro rescatado", "No", "Adopción"],                                      // especie desconocida -> otro (OK)
  ["Frida", "Gata", "Mestiza", 4, "hembra", "Mediano", "San Juan", "San Juan", "Dulce y tranquila", "1", "adopción"],                       // OK (castrado 1->true)
];

// ---- Set en INGLÉS (encabezado "Age" => años) ----
const headerEn = [
  "Name", "Species", "Breed", "Age", "Sex", "Size",
  "City", "Province", "Description", "Neutered", "Type",
];
const filasEn = [
  ["Max", "Dog", "Labrador", 3, "Male", "Large", "La Plata", "Buenos Aires", "Friendly and energetic", "yes", "adoption"],   // OK
  ["Bella", "Cat", "Persian", 2, "Female", "Small", "Cordoba", "Cordoba", "Calm lap cat", "no", "adoption"],                  // OK
  ["", "Dog", "Beagle", 1, "Male", "Medium", "Rosario", "Santa Fe", "Playful pup", "true", "transit"],                        // MISSING NAME
  ["Charlie", "", "Mixed", 4, "Male", "Medium", "Mendoza", "Mendoza", "Loyal companion", "no", "adoption"],                   // MISSING SPECIES
  ["Daisy", "Hamster", "", 1, "Female", "Small", "CABA", "CABA", "Tiny rescue", "no", "adoption"],                            // unknown species -> otro (OK)
  ["Rex", "dog", "Boxer", 6, "male", "large", "Mar del Plata", "Buenos Aires", "Great guard dog", "1", "transit"],            // OK
  ["Lucy", "CAT", "", 2, "F", "L", "Salta", "Salta", "", "true", "adoption"],                                                 // OK (F->hembra, L->grande)
  ["", "", "Unknown", "", "", "Medium", "Tigre", "Buenos Aires", "Found stray, no details", "no", "adoption"],                // MISSING NAME + SPECIES (with data)
  ["Coco", "Parrot", "", 0, "Male", "Small", "Neuquen", "Neuquen", "Rescued bird", "no", "adoption"],                         // unknown species -> otro (OK)
  ["Molly", "Dog", "Poodle", 5, "female", "Medium", "San Juan", "San Juan", "Sweet and quiet", "yes", "adoption"],            // OK
];

// ---- Set con EDAD EN MESES (prueba el mapeo meses) ----
const headerMeses = [
  "Nombre", "Especie", "Edad en meses", "Sexo", "Provincia",
];
const filasMeses = [
  ["Pelusa", "Gata", 6, "Hembra", "Buenos Aires"],
  ["Toby", "Perro", 18, "Macho", "Santa Fe"],
  ["Simón", "Gato", 24, "Macho", "Córdoba"],
  ["", "Perro", 3, "Macho", "Mendoza"],          // FALTA NOMBRE
  ["Lola", "", 12, "Hembra", "CABA"],            // FALTA ESPECIE
  ["Bruno", "Perro", 60, "Macho", "Salta"],
  ["Kira", "Gata", 9, "Hembra", "Tucumán"],
  ["Otto", "Perro", 36, "Macho", "Neuquén"],
  ["Mara", "Gata", 15, "Hembra", "Río Negro"],
  ["", "", 8, "Hembra", "Chaco"],                 // FALTA NOMBRE + ESPECIE (con datos)
];

function hojaDesde(header, filas) {
  return XLSX.utils.aoa_to_sheet([header, ...filas]);
}

function escribir(nombreArchivo, header, filas, bookType) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hojaDesde(header, filas), "Animales");
  const destino = path.join(OUT, nombreArchivo);
  XLSX.writeFile(wb, destino, bookType ? { bookType } : undefined);
  return destino;
}

const generados = [];

// CSV (español, separado por comas)
generados.push(escribir("animales_es.csv", headerEs, filasEs, "csv"));

// XLSX (español)
generados.push(escribir("animales_es.xlsx", headerEs, filasEs, "xlsx"));

// XLSX (inglés) — prueba auto-detección de encabezados en inglés
generados.push(escribir("animales_en.xlsx", headerEn, filasEn, "xlsx"));

// XLS (Excel viejo / BIFF8), inglés
generados.push(escribir("animales_en.xls", headerEn, filasEn, "xls"));

// ODS (LibreOffice/OpenOffice), edad en meses
generados.push(escribir("animales_meses.ods", headerMeses, filasMeses, "ods"));

// TSV (tabulaciones) — se arma a mano porque writeFile no infiere .tsv
const wsTsv = hojaDesde(headerEs, filasEs);
// BOM UTF-8 al inicio para que SheetJS detecte la codificación (acentos).
const tsv = "﻿" + XLSX.utils.sheet_to_csv(wsTsv, { FS: "\t" });
const destinoTsv = path.join(OUT, "animales_es.tsv");
fs.writeFileSync(destinoTsv, tsv, "utf8");
generados.push(destinoTsv);

console.log("Archivos generados en", OUT + ":");
for (const g of generados) {
  console.log("  -", path.basename(g), `(${fs.statSync(g).size} bytes)`);
}
