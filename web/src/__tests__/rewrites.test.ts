import { describe, expect, it } from "vitest";
import { constants } from "@clerk/backend/internal";
import { getRedirectUrl, getRewrittenUrl, unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import nextConfig from "../../next.config";

const respuesta = (ruta: string, headers?: Record<string, string>, cookies?: Record<string, string>) =>
  unstable_getResponseFromNextConfig({ nextConfig, url: `https://local.invalid${ruta}`, headers: { ...headers }, cookies });

describe("HTML público y páginas con sesión", () => {
  it.each([["/", "/publico"], ["/animales", "/publico/animales"], ["/refugios", "/publico/refugios"], ["/animales/adoptar-perra-luna-demo", "/publico/animales/adoptar-perra-luna-demo"]])("%s usa su vista pública sin credenciales", async (ruta, destino) => {
    expect(getRewrittenUrl(await respuesta(ruta))).toBe(`https://local.invalid${destino}`);
  });

  it.each([{ __session: "sesion" }, { __session_instancia: "sesion" }, { consentimiento: "1" }])("las cookies %j conservan el render original", async (cookies) => {
    for (const ruta of ["/", "/animales", "/refugios", "/animales/adoptar-perra-luna-demo"]) {
      expect(getRewrittenUrl(await respuesta(ruta, undefined, cookies))).toBeNull();
    }
  });

  it.each(["authorization", "x-clerk-auth-status", "x-clerk-request-data", "next-action"])("%s impide servir la vista compartida", async (cabecera) => {
    expect(getRewrittenUrl(await respuesta("/animales", { [cabecera]: "prueba" }))).toBeNull();
  });

  it.each([...Object.values(constants.QueryParameters), "__clerk_ticket", "__clerk_status"])("%s conserva el retorno de ingreso original", async (parametro) => {
    expect(getRewrittenUrl(await respuesta(`/?${parametro}=prueba`))).toBeNull();
  });

  it.each(["especie", "tipo", "provincia", "tamano", "sexo", "edad", "castrado", "q", "pagina", "lat", "lng", "radio"])("el filtro %s conserva el catálogo dinámico", async (parametro) => {
    expect(getRewrittenUrl(await respuesta(`/animales?${parametro}=prueba`))).toBeNull();
  });

  it.each(["/animales/adoptar-perra-luna-demo?postulado=1", "/admin", "/favoritos", "/animales/alertas", "/api/campanas-publicas", "/api/mercadopago/webhook"])("%s no recibe HTML compartido", async (ruta) => {
    expect(getRewrittenUrl(await respuesta(ruta))).toBeNull();
  });

  it.each([["/publico", "/"], ["/publico/animales", "/animales"], ["/publico/refugios", "/refugios"], ["/publico/animales/adoptar-perra-luna-demo", "/animales/adoptar-perra-luna-demo"]])("%s redirige a su URL pública", async (ruta, destino) => {
    const r = await respuesta(ruta);
    expect(r.status).toBe(308);
    expect(getRedirectUrl(r)).toBe(`https://local.invalid${destino}`);
  });
});
