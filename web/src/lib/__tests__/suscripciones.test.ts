import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ crear: vi.fn(), cliente: vi.fn(), redirigir: vi.fn() }));
vi.mock("mercadopago", () => ({ MercadoPagoConfig: class {}, PreApproval: class { create = mocks.crear; } }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.cliente }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirigir }));
vi.mock("../usuarios", () => ({
  asegurarUsuario: async () => ({ id: "usuario-1", email: "test@example.invalid" }),
  exigirUsuarioActivo: async () => ({ id: "usuario-1", email: "test@example.invalid" }),
}));
vi.mock("../limites", () => ({ limitarPorIp: async () => {}, campoTexto: (v: unknown) => String(v ?? "") }));
vi.mock("../emails", () => ({ emailGraciasDonante: vi.fn() }));
import { crearSuscripcion } from "../acciones-suscripciones";

afterEach(() => vi.unstubAllEnvs());

it("crea el checkout mensual sin enviar una fecha que puede vencer durante la solicitud", async () => {
  vi.stubEnv("MP_ACCESS_TOKEN", "token-ficticio-sin-red");
  vi.stubEnv("MP_TEST_PAYER_EMAIL", "");
  const consulta = {
    select: vi.fn(), eq: vi.fn(), neq: vi.fn(), order: vi.fn(), limit: vi.fn(),
    update: vi.fn(), insert: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    single: vi.fn().mockResolvedValue({ data: { id: "suscripcion-1" }, error: null }),
  };
  for (const paso of [consulta.select, consulta.eq, consulta.neq, consulta.order, consulta.limit, consulta.update, consulta.insert]) paso.mockReturnValue(consulta);
  mocks.cliente.mockReturnValue({ from: () => consulta });
  mocks.crear.mockResolvedValue({ id: "preapproval-1", init_point: "https://example.invalid/checkout" });
  const formulario = new FormData(); formulario.set("monto", "500"); formulario.set("causas", "general");
  await crearSuscripcion(formulario);
  const cuerpo = mocks.crear.mock.calls[0][0].body;
  expect(cuerpo.auto_recurring).toEqual({ frequency: 1, frequency_type: "months", transaction_amount: 500, currency_id: "ARS" });
  expect(cuerpo).toMatchObject({ status: "pending", payer_email: "test@example.invalid", external_reference: "sus:suscripcion-1" });
  expect(consulta.update).toHaveBeenCalledWith({ preapproval_id: "preapproval-1" });
  expect(mocks.redirigir).toHaveBeenCalledWith("https://example.invalid/checkout");
});
