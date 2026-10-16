import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registrarError } from "../monitoreo";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockReset().mockResolvedValue({ ok: true });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Webhook de monitoreo", () => {
  it("sin URL registra localmente y no hace envíos", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", "");
    await registrarError({ contexto: "prueba", mensaje: "Falla" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("[ERROR500]", expect.any(String));
  });
  it("Slack recibe text", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", "https://hooks.slack.com/services/solo-prueba");
    await registrarError({ contexto: "prueba", mensaje: "Falla", ruta: "/animales", metodo: "GET" });
    const opciones = fetchMock.mock.calls[0][1];
    expect(JSON.parse(opciones.body)).toEqual({ text: expect.stringContaining("GET /animales") });
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });
  it("Discord recibe content sin menciones y respeta el límite", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", "https://discord.com/api/webhooks/solo-prueba");
    await registrarError({ contexto: "prueba", mensaje: "x".repeat(3000) });
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(cuerpo.content).toHaveLength(2000);
    expect(cuerpo.allowed_mentions).toEqual({ parse: [] });
  });
  it("una falla de red o un HTTP fallido no rompe la solicitud", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", "https://discord.com/api/webhooks/solo-prueba");
    fetchMock.mockRejectedValueOnce(new Error("Sin conexión"));
    await expect(registrarError({ contexto: "prueba", mensaje: "Falla" })).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 });
    await registrarError({ contexto: "prueba", mensaje: "Falla" });
    expect(console.error).toHaveBeenCalledWith("[ERROR500] Webhook de monitoreo rechazado:", 429);
  });
});
