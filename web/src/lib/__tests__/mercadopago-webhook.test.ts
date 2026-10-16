import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pago: vi.fn(), cliente: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(),
  neq: vi.fn(), select: vi.fn(), cobro: vi.fn(), suscripcion: vi.fn(),
  gracias: vi.fn(), refugio: vi.fn(), notificacion: vi.fn(),
}));
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {}, Payment: class { get = mocks.pago; },
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.cliente }));
vi.mock("@/lib/acciones-suscripciones", () => ({
  registrarCobroSuscripcion: mocks.cobro, sincronizarPreapproval: mocks.suscripcion,
}));
vi.mock("@/lib/emails", () => ({ emailGraciasDonante: mocks.gracias, emailDonacionRecibida: mocks.refugio }));
vi.mock("@/lib/notificaciones", () => ({ crearNotificacion: mocks.notificacion }));
import { POST } from "../../app/api/mercadopago/webhook/route";

function solicitud(type = "payment", id = "123", firmaCorrecta = true) {
  const ts = "1792186200";
  const manifest = `id:${id.toLowerCase()};request-id:prueba-local;ts:${ts};`;
  const firma = createHmac("sha256", "secreto-solo-test").update(manifest).digest("hex");
  return new NextRequest("https://example.invalid/api/mercadopago/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "prueba-local", "x-signature": `ts=${ts},v1=${firmaCorrecta ? firma : "invalida"}` },
    body: JSON.stringify({ type, data: { id } }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MP_ACCESS_TOKEN", "token-ficticio-sin-red");
  vi.stubEnv("MP_WEBHOOK_SECRET", "secreto-solo-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-ficticia");
  const consulta = { update: mocks.update, eq: mocks.eq, neq: mocks.neq, select: mocks.select };
  mocks.cliente.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue(consulta);
  for (const paso of [mocks.update, mocks.eq, mocks.neq]) paso.mockReturnValue(consulta);
  mocks.select.mockResolvedValue({ data: [] });
  mocks.pago.mockResolvedValue({ id: 123, status: "approved", external_reference: "donacion-1", transaction_amount: 500, payer: { email: "test@example.invalid" } });
});
afterEach(() => vi.unstubAllEnvs());

describe("Webhook de Mercado Pago sin servicios externos", () => {
  it("rechaza firmas inválidas antes de consultar el pago o escribir datos", async () => {
    expect((await POST(solicitud("payment", "123", false))).status).toBe(401);
    expect(mocks.pago).not.toHaveBeenCalled(); expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("rechaza una notificación sin firma", async () => {
    const req = solicitud(); req.headers.delete("x-signature");
    expect((await POST(req)).status).toBe(401);
    expect(mocks.pago).not.toHaveBeenCalled();
  });
  it("no procesa pagos cuando falta la credencial del servidor", async () => {
    vi.stubEnv("MP_ACCESS_TOKEN", "");
    expect((await POST(solicitud())).status).toBe(503);
    expect(mocks.pago).not.toHaveBeenCalled();
  });
  it("consulta el pago al proveedor y acota la acreditación a la donación pendiente", async () => {
    expect((await POST(solicitud())).status).toBe(200);
    expect(mocks.pago).toHaveBeenCalledWith({ id: "123" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "donacion-1");
    expect(mocks.neq).toHaveBeenCalledWith("estado", "acreditada");
    expect(mocks.update).toHaveBeenCalledWith({ estado: "acreditada" });
  });
  it("no acredita pagos pendientes ni confía en un pago inexistente", async () => {
    mocks.pago.mockResolvedValueOnce({ status: "pending", external_reference: "donacion-1" });
    await POST(solicitud());
    mocks.pago.mockRejectedValueOnce(new Error("No encontrado"));
    await POST(solicitud());
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("un reenvío sin nuevas filas acreditadas no repite correos ni notificaciones", async () => {
    mocks.select.mockResolvedValueOnce({ data: [{ donor_nombre: "Prueba", monto: 500, campanas: { titulo: "Campaña", refugios: { nombre: "Refugio", email: "refugio@example.invalid", usuario_id: "refugio-1" } } }] });
    await POST(solicitud()); await POST(solicitud());
    expect(mocks.gracias).toHaveBeenCalledTimes(1);
    expect(mocks.refugio).toHaveBeenCalledTimes(1);
    expect(mocks.notificacion).toHaveBeenCalledTimes(1);
  });
  it("acredita las donaciones de grupo usando el identificador del grupo", async () => {
    mocks.pago.mockResolvedValueOnce({ status: "approved", external_reference: "grupo:grupo-1" });
    await POST(solicitud());
    expect(mocks.eq).toHaveBeenCalledWith("grupo_id", "grupo-1");
    expect(mocks.cobro).not.toHaveBeenCalled();
  });
  it("delega los cobros recurrentes con el monto consultado al proveedor", async () => {
    mocks.pago.mockResolvedValueOnce({ id: 123, status: "approved", external_reference: "sus:suscripcion-1", transaction_amount: 500 });
    await POST(solicitud());
    expect(mocks.cobro).toHaveBeenCalledWith("suscripcion-1", "123", 500);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("valida la firma de suscripciones con identificadores alfanuméricos", async () => {
    expect((await POST(solicitud("subscription_preapproval", "ABC123"))).status).toBe(200);
    expect(mocks.suscripcion).toHaveBeenCalledWith("ABC123");
    expect(mocks.pago).not.toHaveBeenCalled();
  });
});
