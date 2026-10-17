import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { constants } from "@clerk/backend/internal";
import { config } from "../proxy";

vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: vi.fn() }));
const coincide = (ruta: string, headers?: Record<string, string>, cookies?: Record<string, string>) =>
  unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `https://local.invalid${ruta}`, headers: { ...headers }, cookies });

describe("Matcher público y contexto de autenticación", () => {
  it.each(["/", "/animales", "/animales?especie=gato", "/refugios", "/animales/adoptar-perra-luna-demo", "/animales/transito-perro-rocky-demo"])("%s no invoca middleware sin credenciales", (ruta) => {
    expect(coincide(ruta)).toBe(false);
  });

  it.each(["/admin", "/admin/diagnostico", "/admin/reportes", "/mi-refugio", "/favoritos", "/animales/alertas", "/api/chat/luna", "/api/mercadopago/webhook", "/__clerk/v1/client", "/animales/luna", "/refugios/patitas"])("%s conserva el middleware aun sin cookies", (ruta) => {
    expect(coincide(ruta)).toBe(true);
  });

  it.each([{ cookies: { __session: "sesion" } }, { cookies: { __session_instancia: "sesion" } }, { cookies: { consentimiento: "1" } }, { headers: { authorization: "Bearer credencial" } }])("las credenciales y cookies mantienen la validación: %j", (contexto) => {
    for (const ruta of ["/", "/animales", "/refugios", "/animales/adoptar-perra-luna-demo"]) {
      expect(coincide(ruta, contexto.headers, contexto.cookies)).toBe(true);
    }
  });

  it.each([...new Set([...Object.values(constants.QueryParameters), "__clerk_ticket", "__clerk_status"])])("el parámetro %s del SDK conserva el flujo de ingreso", (parametro) => {
    expect(coincide(`/?${parametro}=prueba`)).toBe(true);
  });

  it.each(["x-clerk-auth-status", "x-clerk-request-data", "next-action"])("%s exige el middleware incluso en páginas públicas", (cabecera) => {
    expect(coincide("/animales", { [cabecera]: "prueba" })).toBe(true);
  });

  it.each(["/_next/static/chunk.js", "/_next/image?url=foto", "/foto.webp", "/manifest.webmanifest"])("%s no agrega autenticación a recursos estáticos", (ruta) => {
    expect(coincide(ruta, undefined, { __session: "sesion" })).toBe(false);
  });

  it("una cookie vacía no constituye una credencial", () => {
    expect(coincide("/animales", { cookie: "" })).toBe(false);
  });
});
