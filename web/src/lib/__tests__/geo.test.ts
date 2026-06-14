import { describe, expect, it } from "vitest";
import { distanciaKm, enRadio, desplazar } from "../geo";

describe("distanciaKm (Haversine)", () => {
  it("es 0 entre el mismo punto", () => {
    expect(distanciaKm(-34.6, -58.4, -34.6, -58.4)).toBeCloseTo(0, 5);
  });

  it("calcula Buenos Aires ↔ Córdoba (~645 km)", () => {
    // CABA (-34.60, -58.38) ↔ Córdoba (-31.42, -64.18)
    const d = distanciaKm(-34.6037, -58.3816, -31.4201, -64.1888);
    expect(d).toBeGreaterThan(620);
    expect(d).toBeLessThan(670);
  });

  it("es simétrica", () => {
    const a = distanciaKm(-34.6, -58.4, -31.4, -64.2);
    const b = distanciaKm(-31.4, -64.2, -34.6, -58.4);
    expect(a).toBeCloseTo(b, 9);
  });
});

describe("enRadio", () => {
  it("incluye un punto dentro del radio", () => {
    // ~1.1 km al norte
    expect(enRadio(-34.6, -58.4, -34.59, -58.4, 5)).toBe(true);
  });

  it("excluye un punto fuera del radio", () => {
    expect(enRadio(-34.6, -58.4, -31.4, -64.2, 50)).toBe(false);
  });

  it("incluye el borde exacto", () => {
    expect(enRadio(-34.6, -58.4, -34.6, -58.4, 0)).toBe(true);
  });
});

describe("desplazar", () => {
  it("mueve la coordenada dentro de ~ la distancia pedida", () => {
    const { lat, lng } = desplazar(-34.6, -58.4, 500);
    const d = distanciaKm(-34.6, -58.4, lat, lng);
    // Tolerancia: ~500 m, permitimos margen por la proyección
    expect(d).toBeGreaterThan(0.3);
    expect(d).toBeLessThan(0.7);
  });
});
