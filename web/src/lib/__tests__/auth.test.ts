import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usuarioActual } from "../auth";

const mocks = vi.hoisted(() => ({ usuario: vi.fn(), cabeceras: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: mocks.usuario }));
vi.mock("next/headers", () => ({ headers: mocks.cabeceras }));
const usuario = { id: "cuenta-a" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_solo_prueba");
  mocks.usuario.mockResolvedValue(usuario);
  mocks.cabeceras.mockResolvedValue(new Headers({ "x-clerk-auth-status": "signed-in" }));
});
afterEach(() => vi.unstubAllEnvs());

describe("Identidad durante el paso público", () => {
  it("la visita sin credenciales ni contexto de Clerk no consulta una identidad", async () => {
    mocks.cabeceras.mockResolvedValue(new Headers());
    expect(await usuarioActual()).toBeNull();
    expect(mocks.usuario).not.toHaveBeenCalled();
  });

  it("el contexto del proxy conserva la consulta de Clerk, incluido el retorno de ingreso", async () => {
    expect(await usuarioActual()).toEqual(usuario);
    expect(mocks.usuario).toHaveBeenCalledOnce();
  });

  it.each([{ cookie: "__session=sesion" }, { authorization: "Bearer credencial" }])("las credenciales siempre se validan con Clerk: %j", async (credenciales) => {
    mocks.cabeceras.mockResolvedValue(new Headers(credenciales));
    expect(await usuarioActual()).toEqual(usuario);
    expect(mocks.usuario).toHaveBeenCalledOnce();
  });

  it("propaga un fallo de autenticación en vez de aceptar una identidad", async () => {
    mocks.usuario.mockRejectedValueOnce(new Error("Credencial inválida"));
    await expect(usuarioActual()).rejects.toThrow("Credencial inválida");
  });

  it("el modo demo no consulta Clerk ni las cabeceras", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    expect(await usuarioActual()).toBeNull();
    expect(mocks.usuario).not.toHaveBeenCalled();
    expect(mocks.cabeceras).not.toHaveBeenCalled();
  });

  it("una cookie vacía sigue siendo una visita sin identidad", async () => {
    mocks.cabeceras.mockResolvedValue(new Headers({ cookie: "" }));
    expect(await usuarioActual()).toBeNull();
    expect(mocks.usuario).not.toHaveBeenCalled();
  });
});
