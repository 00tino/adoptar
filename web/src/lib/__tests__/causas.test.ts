import { describe, expect, it } from "vitest";
import { esCausa, nombreCausa } from "../causas";

describe("esCausa", () => {
  it("acepta una causa válida", () => {
    expect(esCausa("cirugias")).toBe(true);
  });

  it("rechaza una causa inventada", () => {
    expect(esCausa("hackeo")).toBe(false);
  });

  it("rechaza 'general' (no es una causa concreta de campaña)", () => {
    expect(esCausa("general")).toBe(false);
  });
});

describe("nombreCausa", () => {
  it("devuelve nombre con emoji para una causa conocida", () => {
    expect(nombreCausa("cirugias")).toContain("Cirugías");
  });

  it("devuelve el id tal cual si no la conoce", () => {
    expect(nombreCausa("desconocida")).toBe("desconocida");
  });
});
