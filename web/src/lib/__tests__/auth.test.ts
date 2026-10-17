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
  mocks.cabeceras.mockResolvedValue(new Headers());
});
afterEach(() => vi.unstubAllEnvs());

describe("Identidad durante el paso público", () => {
  it("la visita marcada sin credenciales no consulta una identidad", async () => {
    mocks.cabeceras.mockResolvedValue(new Headers({ "x-adoptar-visita-anonima": "1" }));
    expect(await usuarioActual()).toBeNull();
    expect(mocks.usuario).not.toHaveBeenCalled();
  });

  it("sin marca conserva la consulta de Clerk, incluido el retorno de ingreso", async () => {
    expect(await usuarioActual()).toEqual(usuario);
    expect(mocks.usuario).toHaveBeenCalledOnce();
  });

  it.each([{ cookie: "__session=sesion" }, { authorization: "Bearer credencial" }])("una marca no reemplaza la validación si hay credenciales: %j", async (credenciales) => {
    mocks.cabeceras.mockResolvedValue(new Headers({ ...credenciales, "x-adoptar-visita-anonima": "1" }));
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
});
