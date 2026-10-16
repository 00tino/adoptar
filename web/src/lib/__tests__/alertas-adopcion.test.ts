import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), enviar: vi.fn(), error: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mocks.from }) }));
vi.mock("../emails", () => ({ emailAlertaAdopcion: mocks.enviar }));
vi.mock("../monitoreo", () => ({ registrarError: mocks.error }));
import { notificarAlertasAdopcion } from "../alertas-adopcion";

const respuestas: { data?: unknown; error?: unknown }[] = [];
const consultas: { tabla: string; eq: ReturnType<typeof vi.fn>; or: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }[] = [];
const animal = { id: "animal", nombre: "Luna", especie: "perro", ciudad: "Avellaneda", provincia: "Buenos Aires", tipo: "adopcion", estado: "disponible", slug: "luna" };

beforeEach(() => {
  vi.clearAllMocks(); respuestas.length = 0; consultas.length = 0;
  mocks.enviar.mockResolvedValue(true);
  mocks.from.mockImplementation((tabla: string) => {
    const respuesta = respuestas.shift() ?? { data: null };
    const c = {
      tabla, select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
      then: (ok: (v: object) => unknown, mal: (e: unknown) => unknown) => Promise.resolve(respuesta).then(ok, mal),
    };
    consultas.push(c); return c;
  });
});

describe("Avisos de adopción", () => {
  it("no manda emails si el animal no está disponible para adopción", async () => {
    respuestas.push({ data: null });
    await notificarAlertasAdopcion("animal");
    expect(consultas[0].eq).toHaveBeenCalledWith("estado", "disponible");
    expect(consultas[0].eq).toHaveBeenCalledWith("tipo", "adopcion");
    expect(mocks.enviar).not.toHaveBeenCalled();
  });
  it("filtra alertas activas, usuarios no suspendidos, especie y provincia", async () => {
    respuestas.push({ data: animal }, { data: [{ id: "alerta", usuarios: { email: "test@example.invalid" } }] }, { data: { alerta_id: "alerta" } });
    await notificarAlertasAdopcion("animal");
    expect(consultas[1].eq).toHaveBeenCalledWith("activa", true);
    expect(consultas[1].eq).toHaveBeenCalledWith("usuarios.suspendido", false);
    expect(consultas[1].or).toHaveBeenCalledWith("especie.is.null,especie.eq.perro");
    expect(consultas[1].or).toHaveBeenCalledWith('provincia.is.null,provincia.ilike."Buenos Aires"');
    expect(mocks.enviar).toHaveBeenCalledWith("test@example.invalid", animal);
  });
  it("no duplica un aviso ya reservado por otra solicitud", async () => {
    respuestas.push({ data: animal }, { data: [{ id: "alerta", usuarios: [{ email: "test@example.invalid" }] }] }, { data: null });
    await notificarAlertasAdopcion("animal");
    expect(consultas[2].upsert).toHaveBeenCalledWith({ alerta_id: "alerta", animal_id: "animal" }, { onConflict: "alerta_id,animal_id", ignoreDuplicates: true });
    expect(mocks.enviar).not.toHaveBeenCalled();
  });
  it("libera la reserva si falla el envío y registra el error", async () => {
    respuestas.push({ data: animal }, { data: [{ id: "alerta", usuarios: { email: "test@example.invalid" } }] }, { data: { alerta_id: "alerta" } }, { error: null });
    mocks.enviar.mockResolvedValue(false);
    await notificarAlertasAdopcion("animal");
    expect(consultas[3].delete).toHaveBeenCalled();
    expect(consultas[3].eq).toHaveBeenCalledWith("alerta_id", "alerta");
    expect(mocks.error).toHaveBeenCalled();
  });
  it("pagina más de 100 alertas sin perder destinatarios", async () => {
    const lote = Array.from({ length: 100 }, (_, n) => ({ id: `alerta-${n}`, usuarios: null }));
    respuestas.push({ data: animal }, { data: lote }, { data: [] });
    await notificarAlertasAdopcion("animal");
    expect(consultas[1].range).toHaveBeenCalledWith(0, 99);
    expect(consultas[2].range).toHaveBeenCalledWith(100, 199);
  });
  it("un fallo de consulta no interrumpe la publicación", async () => {
    respuestas.push({ error: new Error("Sin conexión") });
    await expect(notificarAlertasAdopcion("animal")).resolves.toBeUndefined();
    expect(mocks.error).toHaveBeenCalledWith({ contexto: "alertas-adopcion", mensaje: "Sin conexión" });
  });
});
