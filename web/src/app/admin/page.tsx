import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import {
  alternarSuspension,
  buscarUsuarios,
  cambiarCausaCampana,
  decidirAnimal,
  decidirCampana,
  decidirRefugio,
  donacionesPorCausa,
  obtenerEstadisticas,
  obtenerEvolucionMensual,
  obtenerPendientes,
} from "@/lib/acciones-admin";
import { CAUSAS, nombreCausa } from "@/lib/causas";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

// PANEL ADMIN con cola de aprobación real.
// Solo accesible para ADMIN_EMAIL; a cualquier otro le devolvemos 404
// para no revelar que la ruta existe.
export default async function PaginaAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await esAdmin())) notFound();

  const { q = "" } = await searchParams;
  const [stats, pendientes, usuarios, evolucion, porCausa] = await Promise.all([
    obtenerEstadisticas(),
    obtenerPendientes(),
    buscarUsuarios(q),
    obtenerEvolucionMensual(),
    donacionesPorCausa(),
  ]);
  const maxMes = Math.max(1, ...evolucion.map((m) => m.publicados));

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
    <div>
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
                {/* Causa etiquetada por el refugio; el admin puede corregirla */}
                <form action={cambiarCausaCampana} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <label htmlFor={`causa-${c.id}`} className="text-sm font-bold">
                    Causa:
                  </label>
                  <select
                    id={`causa-${c.id}`}
                    name="causa"
                    defaultValue={c.causa ?? "plataforma"}
                    className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
                  >
                    {CAUSAS.map((causa) => (
                      <option key={causa.id} value={causa.id}>
                        {causa.emoji} {causa.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold hover:border-tinta transition-colors"
                  >
                    Corregir
                  </button>
                </form>
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

      {/* Donaciones acreditadas por causa */}
      {porCausa.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-black">Donaciones por causa</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-crema-2 bg-blanco-calido">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-crema-2 text-left">
                  <th className="px-4 py-3">Causa</th>
                  <th className="px-4 py-3">Donaciones</th>
                  <th className="px-4 py-3">Total acreditado</th>
                </tr>
              </thead>
              <tbody>
                {porCausa.map((fila) => (
                  <tr key={fila.causa} className="border-b border-crema-2 last:border-0">
                    <td className="px-4 py-3 font-bold">{nombreCausa(fila.causa)}</td>
                    <td className="px-4 py-3">{fila.cantidad}</td>
                    <td className="px-4 py-3">${fila.total.toLocaleString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Evolución mensual */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-black">Evolución mensual</h2>
        <div className="mt-4 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6 overflow-x-auto">
          <div className="flex items-end gap-2 min-w-[560px]" aria-hidden>
            {evolucion.map((m) => (
              <div key={m.mes} className="flex-1 text-center">
                <div className="flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-4 rounded-t bg-terracota/80"
                    style={{ height: `${(m.publicados / maxMes) * 100}%` }}
                    title={`${m.publicados} publicados`}
                  />
                  <div
                    className="w-4 rounded-t bg-salvia"
                    style={{ height: `${(m.adoptados / maxMes) * 100}%` }}
                    title={`${m.adoptados} adoptados`}
                  />
                </div>
                <p className="mt-1 text-[11px] font-bold text-tinta-suave">
                  {m.mes.slice(5)}/{m.mes.slice(2, 4)}
                </p>
                <p className="text-[11px] text-tinta-suave">
                  {m.publicados}·{m.adoptados}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-tinta-suave">
            <span className="font-bold text-terracota">■ Publicados</span> ·{" "}
            <span className="font-bold text-salvia-oscuro">■ Adoptados</span> (por mes de publicación)
          </p>
        </div>
      </section>

      {/* Gestión de usuarios */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-black">Usuarios</h2>
        <form action="/admin" method="get" className="mt-4 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por email o nombre…"
            className="w-full max-w-sm rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
          />
          <button
            type="submit"
            className="rounded-full bg-tinta text-crema px-5 py-2 text-sm font-bold hover:bg-tinta/80 transition-colors"
          >
            Buscar
          </button>
        </form>

        <ul className="mt-4 space-y-2">
          {usuarios.length === 0 && (
            <li className="rounded-2xl bg-crema-2/60 p-6 text-center text-tinta-suave">
              Sin resultados para “{q}”.
            </li>
          )}
          {usuarios.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blanco-calido border-2 border-crema-2 px-5 py-3"
            >
              <div>
                <p className="font-bold">
                  {u.nombre}{" "}
                  {u.suspendido && (
                    <span className="ml-1 rounded-full bg-terracota px-2 py-0.5 text-xs font-bold text-blanco-calido">
                      Suspendido
                    </span>
                  )}
                </p>
                <p className="text-sm text-tinta-suave">
                  {u.email} · {u.tipo} · desde {new Date(u.creadoEl).toLocaleDateString("es-AR")}
                </p>
              </div>
              <form action={alternarSuspension}>
                <input type="hidden" name="id" value={u.id} />
                <button
                  type="submit"
                  name="accion"
                  value={u.suspendido ? "reactivar" : "suspender"}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                    u.suspendido
                      ? "border-2 border-salvia text-salvia-oscuro hover:bg-salvia hover:text-blanco-calido"
                      : "border-2 border-terracota text-terracota hover:bg-terracota hover:text-blanco-calido"
                  }`}
                >
                  {u.suspendido ? "Reactivar" : "Suspender"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* Exportar CSV */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-black">Exportar datos</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {["animales", "refugios", "donaciones", "usuarios"].map((tabla) => (
            <a
              key={tabla}
              href={`/admin/exportar/${tabla}`}
              className="rounded-full border-2 border-crema-2 bg-blanco-calido px-5 py-2 text-sm font-bold capitalize hover:border-terracota hover:text-terracota transition-colors"
            >
              ⬇️ {tabla}.csv
            </a>
          ))}
        </div>
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
