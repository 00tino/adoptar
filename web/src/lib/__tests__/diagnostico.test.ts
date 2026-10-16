import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), limite: vi.fn(), correo: vi.fn(), monitoreo: vi.fn() }));
vi.mock("../auth", () => ({ esAdmin: mocks.admin }));
vi.mock("../limites", () => ({ limitarPorIp: mocks.limite, campoTexto: (v: unknown, max: number) => String(v ?? "").trim().slice(0, max) }));
vi.mock("../emails", () => ({ enviarEmail: mocks.correo }));
vi.mock("../monitoreo", () => ({ registrarError: mocks.monitoreo }));
import { probarServicios } from "../acciones-diagnostico";

const formulario = (tipo: string, email = "test@example.invalid") => {
  const fd = new FormData(); fd.set("tipo", tipo); fd.set("email", email); return fd;
};
beforeEach(() => {
  vi.clearAllMocks(); mocks.admin.mockResolvedValue(true); mocks.correo.mockResolvedValue(true); mocks.monitoreo.mockResolvedValue(true);
});
describe("Pruebas privadas de servicios", () => {
  it("no permite envíos sin administrador", async () => {
    mocks.admin.mockResolvedValue(false);
    expect(await probarServicios({}, formulario("correo"))).toHaveProperty("error");
    expect(mocks.correo).not.toHaveBeenCalled(); expect(mocks.limite).not.toHaveBeenCalled();
  });
  it("valida el destinatario", async () => {
    expect(await probarServicios({}, formulario("correo", "incorrecto"))).toHaveProperty("error");
    expect(mocks.correo).not.toHaveBeenCalled();
  });
  it("identifica el mensaje de prueba y solo confirma aceptación del proveedor", async () => {
    expect(await probarServicios({}, formulario("correo"))).toHaveProperty("mensaje", expect.stringContaining("proveedor aceptó"));
    expect(mocks.correo).toHaveBeenCalledWith(expect.objectContaining({ para: "test@example.invalid", asunto: "[AdoptAR] Prueba de correo real" }));
  });
  it("no muestra éxito cuando falla el envío", async () => {
    mocks.correo.mockResolvedValue(false);
    expect(await probarServicios({}, formulario("correo"))).toHaveProperty("error");
    mocks.monitoreo.mockResolvedValue(false);
    expect(await probarServicios({}, formulario("monitoreo"))).toHaveProperty("error");
  });
  it("manda una prueba identificada al destino de monitoreo configurado", async () => {
    expect(await probarServicios({}, formulario("monitoreo"))).toHaveProperty("mensaje");
    expect(mocks.monitoreo).toHaveBeenCalledWith(expect.objectContaining({ contexto: "PRUEBA:monitoreo", ruta: "/admin/diagnostico" }));
  });
  it("rechaza operaciones desconocidas y limita los envíos", async () => {
    expect(await probarServicios({}, formulario("otro"))).toHaveProperty("error");
    mocks.limite.mockRejectedValueOnce(new Error("Límite"));
    expect(await probarServicios({}, formulario("correo"))).toHaveProperty("error");
    expect(mocks.correo).not.toHaveBeenCalled();
  });
});
