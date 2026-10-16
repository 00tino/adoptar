import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registrarError } from "../monitoreo";

const correo = vi.hoisted(() => vi.fn());
vi.mock("../emails", async (importOriginal) => ({
  ...await importOriginal<typeof import("../emails")>(), enviarEmail: correo,
}));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("ERROR_ALERT_EMAIL", "");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  correo.mockReset().mockResolvedValue(true);
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
    await expect(registrarError({ contexto: "prueba", mensaje: "Falla" })).resolves.toBe(false);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 });
    await registrarError({ contexto: "prueba", mensaje: "Falla" });
    expect(console.error).toHaveBeenCalledWith("[ERROR500] Webhook de monitoreo rechazado:", 429);
  });
  it("envía una alerta por email sin incluir parámetros de URL ni HTML sin escapar", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", "");
    vi.stubEnv("ERROR_ALERT_EMAIL", "test@example.invalid");
    expect(await registrarError({ contexto: "correo-envio", mensaje: "<script>ejemplo</script>", ruta: "/ruta?token=secreto" })).toBe(true);
    expect(correo).toHaveBeenCalledWith(expect.objectContaining({ para: "test@example.invalid", html: expect.stringContaining("&lt;script&gt;") }));
    expect(correo.mock.calls[0][0].html).not.toContain("token=secreto");
  });
  it("agrupa errores por contexto durante 15 minutos y permite otro contexto", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", ""); vi.stubEnv("ERROR_ALERT_EMAIL", "test@example.invalid");
    const reloj = vi.spyOn(Date, "now").mockReturnValue(1000000);
    expect(await registrarError({ contexto: "correo-agrupado", mensaje: "Falla" })).toBe(true);
    expect(await registrarError({ contexto: "correo-agrupado", mensaje: "Repetido" })).toBe(false);
    expect(await registrarError({ contexto: "correo-otro", mensaje: "Falla" })).toBe(true);
    expect(correo).toHaveBeenCalledTimes(2);
    reloj.mockReturnValue(1000000 + 15 * 60_000);
    expect(await registrarError({ contexto: "correo-agrupado", mensaje: "Nuevo aviso" })).toBe(true);
  });
  it("un envío fallido permite reintentar sin romper la solicitud", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", ""); vi.stubEnv("ERROR_ALERT_EMAIL", "test@example.invalid");
    correo.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await registrarError({ contexto: "correo-reintento", mensaje: "Falla" })).toBe(false);
    expect(await registrarError({ contexto: "correo-reintento", mensaje: "Falla" })).toBe(true);
  });
  it("no intenta cargar SMTP dentro de Edge", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", ""); vi.stubEnv("ERROR_ALERT_EMAIL", "test@example.invalid"); vi.stubEnv("NEXT_RUNTIME", "edge");
    expect(await registrarError({ contexto: "correo-edge", mensaje: "Falla" })).toBe(false);
    expect(correo).not.toHaveBeenCalled();
  });
});
