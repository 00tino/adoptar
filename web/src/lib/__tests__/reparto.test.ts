import { describe, expect, it } from "vitest";
import { repartir } from "../reparto";

describe("repartir", () => {
  it("divide parejo cuando es exacto", () => {
    expect(repartir(300, 3)).toEqual([100, 100, 100]);
  });

  it("nunca pierde ni inventa pesos (suma == total)", () => {
    const partes = repartir(1000, 3);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(partes).toEqual([334, 333, 333]);
  });

  it("reparte el resto en las primeras partes", () => {
    expect(repartir(10, 4)).toEqual([3, 3, 2, 2]);
  });

  it("una sola parte recibe todo", () => {
    expect(repartir(777, 1)).toEqual([777]);
  });

  it("0 partes devuelve vacío (no divide por cero)", () => {
    expect(repartir(500, 0)).toEqual([]);
  });
});
