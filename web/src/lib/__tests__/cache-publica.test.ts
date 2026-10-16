import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearClienteSupabase } from "../supabase";

const peticiones = vi.fn();
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://local.example.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "clave-publica-de-prueba");
  vi.stubGlobal("fetch", peticiones);
  peticiones.mockReset().mockImplementation(async () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Caché pública de Supabase", () => {
  it("cachea únicamente lecturas anónimas del catálogo durante 60 segundos", async () => {
    await crearClienteSupabase().from("animales").select("id");
    expect(peticiones.mock.calls[0][1]).toMatchObject({ cache: "force-cache", next: { revalidate: 60, tags: ["animales-publicos"] } });
  });
  it("no cachea consultas a usuarios", async () => {
    await crearClienteSupabase().from("usuarios").select("id");
    expect(peticiones.mock.calls[0][1]).not.toHaveProperty("next");
    expect(peticiones.mock.calls[0][1]).not.toHaveProperty("cache");
  });
  it("cachea los refugios públicos con su propia etiqueta", async () => {
    await crearClienteSupabase().from("refugios").select("id,nombre");
    expect(peticiones.mock.calls[0][1]).toMatchObject({ cache: "force-cache", next: { revalidate: 60, tags: ["refugios-publicos"] } });
  });
  it("cachea por GET solamente el conteo público y lo invalida con los animales", async () => {
    await crearClienteSupabase().rpc("contar_animales_por_refugio", undefined, { get: true });
    expect(peticiones.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "force-cache", next: { revalidate: 60, tags: ["animales-publicos"] } });
    await crearClienteSupabase().rpc("otra_funcion", undefined, { get: true });
    expect(peticiones.mock.calls[1][1]).not.toHaveProperty("cache");
  });
  it("mantiene frescos los importes y no cachea cambios de refugios", async () => {
    const cliente = crearClienteSupabase();
    await cliente.from("campanas_con_recaudado").select("*");
    await cliente.from("donaciones").select("monto");
    await cliente.from("refugios").update({ estado: "suspendido" }).eq("id", "prueba");
    for (const [, opciones] of peticiones.mock.calls) {
      expect(opciones).not.toHaveProperty("cache");
      expect(opciones).not.toHaveProperty("next");
    }
  });
  it("no cachea escrituras de animales ni llamadas RPC", async () => {
    const cliente = crearClienteSupabase();
    await cliente.from("animales").update({ estado: "adoptado" }).eq("id", "prueba");
    await cliente.rpc("contar_animales_por_refugio");
    for (const [, opciones] of peticiones.mock.calls) expect(opciones).not.toHaveProperty("next");
  });
});
