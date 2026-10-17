import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usuario: vi.fn(), cargarRefugio: vi.fn(), cargarChat: vi.fn(),
  refugio: vi.fn(), chat: vi.fn(), notificaciones: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ clerkDisponible: () => true, usuarioActual: mocks.usuario }));
vi.mock("@/lib/supabase", () => ({ supabaseDisponible: () => true }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: () => null, SignOutButton: () => null }));
vi.mock("@/lib/acciones-refugio", () => { mocks.cargarRefugio(); return { tieneRefugio: mocks.refugio }; });
vi.mock("@/lib/acciones-chat", () => { mocks.cargarChat(); return { contarNoLeidos: mocks.chat }; });
vi.mock("@/lib/notificaciones", () => ({ obtenerNoLeidas: mocks.notificaciones, marcarNotificacionesLeidas: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.usuario.mockResolvedValue(null);
  mocks.refugio.mockResolvedValue(true);
  mocks.chat.mockResolvedValue(0);
  mocks.notificaciones.mockResolvedValue([]);
});

describe("Header: dependencias de la cuenta", () => {
  it("no carga ni consulta refugio y mensajes al renderizar una visita anónima", async () => {
    const { default: Header } = await import("../Header");
    await Header();
    expect(mocks.cargarRefugio).not.toHaveBeenCalled();
    expect(mocks.cargarChat).not.toHaveBeenCalled();
    expect(mocks.notificaciones).not.toHaveBeenCalled();
  });

  it("con sesión consulta los tres datos para la identidad actual", async () => {
    mocks.usuario.mockResolvedValue({ id: "cuenta-a", emailAddresses: [{ emailAddress: "a@example.invalid" }] });
    const { default: Header } = await import("../Header");
    await Header();
    expect(mocks.refugio).toHaveBeenCalledWith("cuenta-a");
    expect(mocks.chat).toHaveBeenCalledWith("cuenta-a");
    expect(mocks.notificaciones).toHaveBeenCalledWith("cuenta-a");
  });
});
