import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import CardAnimal from "@/components/CardAnimal";
import PaginaAnimales from "../page";

const mocks = vi.hoisted(() => ({ catalogo: vi.fn(), provincias: vi.fn(), usuario: vi.fn(), favoritos: vi.fn() }));
vi.mock("@/lib/datos", () => ({
  ANIMALES_POR_PAGINA: 12, obtenerAnimalesPaginados: mocks.catalogo,
  obtenerAnimalesCercanos: vi.fn(), obtenerProvincias: mocks.provincias,
}));
vi.mock("@/lib/auth", () => ({ usuarioActual: mocks.usuario }));
vi.mock("@/lib/acciones-favoritos", () => ({ idsFavoritos: mocks.favoritos }));

function tarjetas(nodo: ReactNode): { logueado: boolean; favorito: boolean }[] {
  if (Array.isArray(nodo)) return nodo.flatMap(tarjetas);
  if (!isValidElement<{ children?: ReactNode; logueado: boolean; favorito: boolean }>(nodo)) return [];
  return nodo.type === CardAnimal ? [nodo.props] : tarjetas(nodo.props.children);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.catalogo.mockResolvedValue({ animales: [{ id: "luna", slug: "luna" }], total: 1 });
  mocks.provincias.mockResolvedValue(["Buenos Aires"]);
  mocks.usuario.mockResolvedValue(null);
});

describe("Catálogo: lecturas públicas y sesión independientes", () => {
  it("inicia los favoritos mientras el catálogo todavía está esperando y conserva la personalización", async () => {
    let resolver!: (datos: object) => void;
    mocks.catalogo.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    mocks.usuario.mockResolvedValue({ id: "cuenta-a" });
    mocks.favoritos.mockResolvedValue(new Set(["luna"]));
    const pagina = PaginaAnimales({ searchParams: Promise.resolve({}) });
    await vi.waitFor(() => expect(mocks.favoritos).toHaveBeenCalledOnce());
    resolver({ animales: [{ id: "luna", slug: "luna" }], total: 1 });
    expect(tarjetas(await pagina)).toMatchObject([{ logueado: true, favorito: true }]);
  });

  it("una visita anónima posterior no consulta ni hereda favoritos", async () => {
    mocks.usuario.mockResolvedValueOnce({ id: "cuenta-a" });
    mocks.favoritos.mockResolvedValue(new Set(["luna"]));
    await PaginaAnimales({ searchParams: Promise.resolve({}) });
    mocks.favoritos.mockClear();
    const anonima = await PaginaAnimales({ searchParams: Promise.resolve({}) });
    expect(mocks.favoritos).not.toHaveBeenCalled();
    expect(tarjetas(anonima)).toMatchObject([{ logueado: false, favorito: false }]);
  });
});
