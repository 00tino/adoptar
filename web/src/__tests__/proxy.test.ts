import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";

const mocks = vi.hoisted(() => ({ crear: vi.fn(), manejar: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: mocks.crear }));
const evento = { waitUntil: vi.fn() } as unknown as NextFetchEvent;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_solo_prueba");
  mocks.manejar.mockResolvedValue(NextResponse.next());
  mocks.crear.mockReturnValue(mocks.manejar);
});
afterEach(() => vi.unstubAllEnvs());

describe("Paso público sin sesión", () => {
  it.each(["/", "/animales", "/animales?especie=gato", "/refugios", "/animales/adoptar-perra-luna-demo", "/animales/transito-perro-rocky-demo"])("%s evita cargar Clerk sin credenciales", async (ruta) => {
    const { default: proxy } = await import("../proxy");
    const respuesta = await proxy(new NextRequest(`https://local.invalid${ruta}`), evento);
    expect(mocks.crear).not.toHaveBeenCalled();
    expect(respuesta?.headers.get("x-middleware-request-x-adoptar-visita-anonima")).toBe("1");
  });

  it.each(["/admin", "/admin/diagnostico", "/admin/reportes", "/mi-refugio", "/favoritos", "/animales/alertas", "/api/chat/luna", "/api/mercadopago/webhook", "/__clerk/v1/client"])("%s conserva Clerk aun sin cookies", async (ruta) => {
    const { default: proxy } = await import("../proxy");
    await proxy(new NextRequest(`https://local.invalid${ruta}`), evento);
    expect(mocks.manejar).toHaveBeenCalledOnce();
  });

  it.each([{ cookie: "__session=sesion" }, { cookie: "__session_instancia=sesion" }, { cookie: "consentimiento=1" }, { authorization: "Bearer credencial" }])("las credenciales o cookies mantienen la validación: %j", async (cabeceras) => {
    const { default: proxy } = await import("../proxy");
    await proxy(new NextRequest("https://local.invalid/animales", { headers: cabeceras }), evento);
    expect(mocks.manejar).toHaveBeenCalledOnce();
  });

  it.each(["__clerk_handshake", "__clerk_ticket", "__clerk_db_jwt", "__clerk_synced", "__session", "suffixed_cookies", "__dev_session"])("%s conserva el flujo de ingreso", async (parametro) => {
    const { default: proxy } = await import("../proxy");
    await proxy(new NextRequest(`https://local.invalid/?${parametro}=prueba`), evento);
    expect(mocks.manejar).toHaveBeenCalledOnce();
  });

  it("no omite Clerk en una operación POST sobre una ruta pública", async () => {
    const { default: proxy } = await import("../proxy");
    await proxy(new NextRequest("https://local.invalid/animales", { method: "POST" }), evento);
    expect(mocks.manejar).toHaveBeenCalledOnce();
  });

  it("descarta marcas de anonimato falsificadas antes de validar una ruta privada", async () => {
    const { default: proxy } = await import("../proxy");
    const request = new NextRequest("https://local.invalid/admin", { headers: { "x-adoptar-visita-anonima": "1" } });
    await proxy(request, evento);
    expect(mocks.manejar).toHaveBeenCalledWith(request, evento);
    expect(request.headers.has("x-adoptar-visita-anonima")).toBe(false);
  });

  it("elimina cabeceras de identidad falsificadas del paso anónimo", async () => {
    const { default: proxy } = await import("../proxy");
    const respuesta = await proxy(new NextRequest("https://local.invalid/", { headers: { "x-clerk-auth-status": "signed-in", "x-clerk-auth-token": "falso" } }), evento);
    expect(respuesta?.headers.get("x-middleware-override-headers")).not.toContain("x-clerk-");
    expect(respuesta?.headers.get("x-middleware-request-x-adoptar-visita-anonima")).toBe("1");
    expect(mocks.crear).not.toHaveBeenCalled();
  });

  it("conserva el modo demo sin claves", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const { default: proxy } = await import("../proxy");
    await proxy(new NextRequest("https://local.invalid/admin"), evento);
    expect(mocks.crear).not.toHaveBeenCalled();
  });
});
