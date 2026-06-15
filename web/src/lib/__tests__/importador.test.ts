import { describe, expect, it } from "vitest";
import { detectarMapeo, normalizarFila } from "../importador";

describe("detectarMapeo", () => {
  it("detecta encabezados en español", () => {
    const m = detectarMapeo(["Nombre", "Especie", "Edad", "Sexo", "Provincia"]);
    expect(m.nombre).toBe(0);
    expect(m.especie).toBe(1);
    expect(m.edad_anios).toBe(2);
    expect(m.sexo).toBe(3);
    expect(m.provincia).toBe(4);
  });

  it("detecta encabezados en inglés", () => {
    const m = detectarMapeo(["name", "species", "breed", "sex", "city"]);
    expect(m.nombre).toBe(0);
    expect(m.especie).toBe(1);
    expect(m.raza).toBe(2);
    expect(m.sexo).toBe(3);
    expect(m.ciudad).toBe(4);
  });

  it("distingue edad en meses de edad en años", () => {
    const m = detectarMapeo(["Nombre", "Edad en meses"]);
    expect(m.edad_meses).toBe(1);
    expect(m.edad_anios).toBe(null);
  });

  it("deja en null los campos que no encuentra", () => {
    const m = detectarMapeo(["Nombre"]);
    expect(m.especie).toBe(null);
    expect(m.ciudad).toBe(null);
  });
});

describe("normalizarFila", () => {
  const mapeo = detectarMapeo([
    "Nombre", "Especie", "Edad", "Sexo", "Tamaño", "Castrado", "Tipo",
  ]);

  it("normaliza especie, sexo, tamaño, castrado y tipo", () => {
    const f = normalizarFila(
      ["Luna", "Perro", "2", "Hembra", "Grande", "Sí", "Tránsito"],
      mapeo
    );
    expect(f.especie).toBe("perro");
    expect(f.sexo).toBe("hembra");
    expect(f.tamano).toBe("grande");
    expect(f.castrado).toBe(true);
    expect(f.tipo).toBe("transito");
    expect(f.faltantes).toEqual([]);
  });

  it("convierte edad en años a meses", () => {
    const f = normalizarFila(["Rocky", "gato", "3", "", "", "no", ""], mapeo);
    expect(f.edad_meses).toBe(36);
    expect(f.especie).toBe("gato");
    expect(f.castrado).toBe(false);
    expect(f.tipo).toBe("adopcion");
  });

  it("prioriza edad en meses cuando está mapeada", () => {
    const m = detectarMapeo(["Nombre", "Especie", "Edad en meses"]);
    const f = normalizarFila(["Toby", "perro", "8"], m);
    expect(f.edad_meses).toBe(8);
  });

  it("marca faltantes cuando no hay nombre ni especie", () => {
    const f = normalizarFila(["", "", "1", "", "", "", ""], mapeo);
    expect(f.faltantes).toContain("nombre");
    expect(f.faltantes).toContain("especie");
  });

  it("una especie desconocida cae en 'otro' sin marcarse como faltante", () => {
    const f = normalizarFila(["Coco", "conejo", "1", "", "", "", ""], mapeo);
    expect(f.especie).toBe("otro");
    expect(f.faltantes).not.toContain("especie");
  });
});
