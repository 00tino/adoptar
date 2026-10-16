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
  it("no cachea escrituras de animales ni llamadas RPC", async () => {
    const cliente = crearClienteSupabase();
    await cliente.from("animales").update({ estado: "adoptado" }).eq("id", "prueba");
    await cliente.rpc("contar_animales_por_refugio");
    for (const [, opciones] of peticiones.mock.calls) expect(opciones).not.toHaveProperty("next");
  });
});
