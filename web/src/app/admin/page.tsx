import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clerkDisponible, esAdmin } from "@/lib/auth";
import { supabaseDisponible } from "@/lib/supabase";
import {
  decidirAnimal,
  decidirCampana,
  decidirRefugio,
  obtenerEstadisticas,
  obtenerPendientes,
} from "@/lib/acciones-admin";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

// PANEL ADMIN con cola de aprobación real.
// Solo accesible para ADMIN_EMAIL; a cualquier otro le devolvemos 404
// para no revelar que la ruta existe.
export default async function PaginaAdmin() {
  if (!supabaseDisponible() || !clerkDisponible()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-black">Panel no disponible</h1>
        <p className="mt-2 text-tinta-suave">
          Faltan configurar Supabase y Clerk en .env.local.
        </p>
      </div>
    );
  }
  if (!(await esAdmin())) notFound();

  const [stats, pendientes] = await Promise.all([
    obtenerEstadisticas(),
    obtenerPendientes(),
  ]);

  const tarjetas = [
    { etiqueta: "Animales publicados", valor: stats.animales },
    { etiqueta: "Disponibles ahora", valor: stats.disponibles },
    { etiqueta: "Adoptados", valor: stats.adoptados },
    { etiqueta: "Refugios verificados", valor: stats.refugios },
    { etiqueta: "Campañas activas", valor: stats.campanas },
    { etiqueta: "Usuarios registrados", valor: stats.usuarios },
  ];

  const totalPendientes =
    pendientes.refugios.length +
    pendientes.animales.length +
    pendientes.campanas.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Panel de administración</h1>

      {/* Estadísticas */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {tarjetas.map((s) => (
          <div key={s.etiqueta} className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-5">
            <p className="font-display text-4xl font-black text-terracota">{s.valor}</p>
            <p className="text-sm font-bold text-tinta-suave">{s.etiqueta}</p>
          </div>
        ))}
      </div>

      {/* Cola de aprobación */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-black">
          Cola de aprobación{" "}
          {totalPendientes > 0 && (
            <span className="inline-block rounded-full bg-terracota text-blanco-calido text-sm px-3 py-1 align-middle">
              {totalPendientes} pendiente{totalPendientes !== 1 && "s"}
            </span>
          )}
        </h2>

        {totalPendientes === 0 && (
          <div className="mt-4 rounded-2xl bg-crema-2/60 p-10 text-center text-tinta-suave">
            🎉 No hay solicitudes pendientes
          </div>
        )}

        {/* Refugios pendientes */}
        {pendientes.refugios.map((r) => (
          <div key={r.id} className="mt-4 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-salvia-oscuro">Refugio nuevo</p>
                <h3 className="font-display text-xl font-bold">🏠 {r.nombre}</h3>
                <p className="text-sm text-tinta-suave">
                  {r.ciudad}, {r.provincia} · {r.email ?? "sin email"} · {r.telefono ?? "sin teléfono"}
                </p>
                <p className="mt-2 text-sm max-w-xl">{r.descripcion}</p>
                {r.video_url && (
                  <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-bold text-terracota hover:underline">
                    Ver video institucional →
                  </a>
                )}
              </div>
              <form action={decidirRefugio} className="flex gap-2 shrink-0">
                <input type="hidden" name="id" value={r.id} />
                <BotonDecision decision="aprobar" texto="Aprobar ✓" estilo="bg-salvia text-blanco-calido hover:bg-salvia-oscuro" />
                <BotonDecision decision="estrella" texto="Aprobar ⭐" estilo="bg-sol text-tinta hover:brightness-105" titulo="Aprobar como Refugio Estrella (publica sin verificación)" />
                <BotonDecision decision="rechazar" texto="Rechazar ✗" estilo="bg-crema-2 text-tinta hover:bg-terracota hover:text-blanco-calido" />
              </form>
            </div>
          </div>
        ))}

        {/* Animales pendientes */}
        {pendientes.animales.map((a) => (
          <div key={a.id} className="mt-4 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-terracota">
                  Animal en {a.tipo === "transito" ? "tránsito" : "adopción"}
                  {a.particular_nombre && ` · publica ${a.particular_nombre}`}
                </p>
                <h3 className="font-display text-xl font-bold">🐾 {a.nombre}</h3>
                <p className="text-sm text-tinta-suave">
                  {a.especie} · {a.raza ?? "raza s/d"} · {a.ciudad}, {a.provincia}
                </p>
                <p className="mt-2 text-sm max-w-xl">{a.descripcion}</p>
                <div className="mt-1 flex gap-3 text-sm font-bold">
                  {Array.isArray(a.fotos) &&
                    a.fotos.map((f: string, i: number) => (
                      <a key={i} href={f} target="_blank" rel="noopener noreferrer" className="text-terracota hover:underline">
                        Foto {i + 1}
                      </a>
                    ))}
                  {a.video_url && (
                    <a href={a.video_url} target="_blank" rel="noopener noreferrer" className="text-terracota hover:underline">
                      Video →
                    </a>
                  )}
                </div>
              </div>
              <form action={decidirAnimal} className="flex gap-2 shrink-0">
                <input type="hidden" name="id" value={a.id} />
                <BotonDecision decision="aprobar" texto="Aprobar ✓" estilo="bg-salvia text-blanco-calido hover:bg-salvia-oscuro" />
                <BotonDecision decision="rechazar" texto="Rechazar ✗" estilo="bg-crema-2 text-tinta hover:bg-terracota hover:text-blanco-calido" />
              </form>
            </div>
          </div>
        ))}

        {/* Campañas pendientes */}
        {pendientes.campanas.map((c) => (
          <div key={c.id} className="mt-4 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sol">Campaña de donación</p>
                <h3 className="font-display text-xl font-bold">💛 {c.titulo}</h3>
                <p className="mt-2 text-sm max-w-xl">{c.descripcion}</p>
                {c.meta_monto && (
                  <p className="mt-1 text-sm font-bold text-salvia-oscuro">
                    Meta: ${Number(c.meta_monto).toLocaleString("es-AR")}
                  </p>
                )}
              </div>
              <form action={decidirCampana} className="flex gap-2 shrink-0">
                <input type="hidden" name="id" value={c.id} />
                <BotonDecision decision="aprobar" texto="Aprobar ✓" estilo="bg-salvia text-blanco-calido hover:bg-salvia-oscuro" />
                <BotonDecision decision="rechazar" texto="Rechazar ✗" estilo="bg-crema-2 text-tinta hover:bg-terracota hover:text-blanco-calido" />
              </form>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// Botón que envía la decisión dentro del form de cada tarjeta
function BotonDecision({
  decision,
  texto,
  estilo,
  titulo,
}: {
  decision: string;
  texto: string;
  estilo: string;
  titulo?: string;
}) {
  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      title={titulo}
      className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${estilo}`}
    >
      {texto}
    </button>
  );
}
