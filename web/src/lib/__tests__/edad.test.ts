import { describe, expect, it } from "vitest";
import { edadAproximadaEnMeses } from "../tipos";

describe("edadAproximadaEnMeses", () => {
  it("lee años, meses y edades mixtas de un texto libre", () => {
    expect(edadAproximadaEnMeses("2 años")).toBe(24);
    expect(edadAproximadaEnMeses("8 meses")).toBe(8);
    expect(edadAproximadaEnMeses("1 año y 6 meses")).toBe(18);
  });

  it("deja sin informar una edad que no puede interpretar", () => {
    expect(edadAproximadaEnMeses("cachorro")).toBeNull();
    expect(edadAproximadaEnMeses("")).toBeNull();
  });
});
