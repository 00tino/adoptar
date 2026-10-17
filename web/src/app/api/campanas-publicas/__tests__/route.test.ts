import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({ campanas: vi.fn(), despues: vi.fn(), registrar: vi.fn() }));
vi.mock("@/lib/datos", () => ({ obtenerCampanasActivas: mocks.campanas }));
vi.mock("@/lib/monitoreo", () => ({ registrarError: mocks.registrar }));
vi.mock("next/server", async (importOriginal) => ({ ...await importOriginal<typeof import("next/server")>(), after: mocks.despues }));
beforeEach(() => vi.resetAllMocks());

describe("Recaudación pública fresca", () => {
  it("vuelve a consultar los montos en cada petición y prohíbe guardarlos en caché", async () => {
    mocks.campanas.mockResolvedValueOnce([{ id: "causa", recaudado: 100 }]).mockResolvedValueOnce([{ id: "causa", recaudado: 150 }]);
    const primera = await GET();
    const segunda = await GET();
    expect(await primera.json()).toEqual({ campanas: [{ id: "causa", recaudado: 100 }] });
    expect(await segunda.json()).toEqual({ campanas: [{ id: "causa", recaudado: 150 }] });
    expect(primera.headers.get("cache-control")).toBe("no-store");
    expect(segunda.headers.get("cache-control")).toBe("no-store");
    expect(mocks.campanas).toHaveBeenCalledTimes(2);
    expect(mocks.campanas).toHaveBeenCalledWith(2);
    expect(mocks.despues).not.toHaveBeenCalled();
  });

  it("ante un fallo no devuelve un monto viejo ni datos internos", async () => {
    mocks.campanas.mockRejectedValue(new Error("dato interno de conexión"));
    const r = await GET();
    expect(r.status).toBe(503);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ error: "No pudimos consultar las campañas." });
    await mocks.despues.mock.calls[0][0]();
    expect(mocks.registrar).toHaveBeenCalledWith(expect.objectContaining({ contexto: "api:campanas-publicas", metodo: "GET" }));
  });
});
