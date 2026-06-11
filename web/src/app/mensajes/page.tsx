import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { obtenerConversaciones } from "@/lib/acciones-chat";
import { miRefugio } from "@/lib/acciones-refugio";
import {
  calificarUsuario,
  obtenerRatingUsuario,
  type RatingUsuario,
} from "@/lib/acciones-ratings";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { supabaseDisponible } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Mis mensajes",
  robots: { index: false },
};

// Bandeja de conversaciones: todas las consultas del usuario en un solo lugar,
// agrupadas por animal e interlocutor, con no-leídos destacados.

function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  const hoy = new Date();
  const esHoy = fecha.toDateString() === hoy.toDateString();
  if (esHoy)
    return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default async function PaginaMensajes() {
  if (!supabaseDisponible() || !clerkDisponible()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-black">Mis mensajes</h1>
        <p className="mt-3 text-tinta-suave">El chat se habilita al conectar la base de datos.</p>
      </div>
    );
  }

  const usuario = await usuarioActual();
  if (!usuario) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-7xl">💬</p>
        <h1 className="mt-4 font-display text-4xl font-black">Mis mensajes</h1>
        <p className="mt-3 text-tinta-suave">Iniciá sesión para ver tus conversaciones.</p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <button className="rounded-full bg-terracota text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-oscuro transition-colors">
              Ingresar
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const conversaciones = await obtenerConversaciones();

  // Si soy un refugio, veo la calificación de cada interlocutor (solo refugios)
  const soyRefugio = Boolean(await miRefugio());
  const ratings = new Map<string, RatingUsuario>();
  if (soyRefugio) {
    const ids = [
      ...new Set(
        conversaciones.map((c) => c.interlocutorId).filter((id): id is string => !!id)
      ),
    ];
    const resultados = await Promise.all(ids.map((id) => obtenerRatingUsuario(id)));
    ids.forEach((id, i) => {
      const r = resultados[i];
      if (r) ratings.set(id, r);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Mis mensajes 💬</h1>
      <p className="mt-2 text-tinta-suave">
        Todas tus conversaciones por animales publicados o consultados.
      </p>

      {conversaciones.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-10 text-center">
          <p className="text-5xl">🐾</p>
          <p className="mt-3 text-tinta-suave">
            Todavía no tenés conversaciones. Encontrá un animal en el{" "}
            <Link href="/animales" className="font-bold text-terracota underline">
              catálogo
            </Link>{" "}
            y escribile a quien lo publica.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {conversaciones.map((c) => {
            const rating = c.interlocutorId ? ratings.get(c.interlocutorId) : null;
            return (
            <li key={`${c.animalId}|${c.interlocutorId ?? "?"}`}>
              <Link
                href={`/animales/${c.animalSlug}`}
                className={`flex items-center gap-4 rounded-2xl border-2 p-4 transition-colors hover:border-terracota ${
                  c.noLeidos > 0
                    ? "bg-sol/15 border-sol"
                    : "bg-blanco-calido border-crema-2"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold">
                    {c.animalNombre}{" "}
                    <span className="font-sans text-sm font-normal text-tinta-suave">
                      · con {c.interlocutor}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-tinta-suave">
                    {c.ultimoMensaje}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-tinta-suave">{fechaLegible(c.ultimaFecha)}</p>
                  {c.noLeidos > 0 && (
                    <span className="mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-terracota px-2 text-xs font-bold text-blanco-calido">
                      {c.noLeidos}
                    </span>
                  )}
                </div>
              </Link>

              {/* Calificación del usuario: visible y editable SOLO para refugios */}
              {soyRefugio && rating && c.interlocutorId && (
                <details className="mt-1 rounded-2xl border-2 border-crema-2 bg-blanco-calido px-4 py-2 text-sm">
                  <summary className="cursor-pointer font-bold text-tinta-suave">
                    {rating.cantidad > 0
                      ? `★ ${rating.promedio.toFixed(1)} (${rating.cantidad}) — calificación entre refugios`
                      : "Calificar a este usuario (solo lo ven otros refugios)"}
                  </summary>
                  {rating.comentarios.filter((co) => co.comentario).length > 0 && (
                    <ul className="mt-2 space-y-1 text-tinta-suave">
                      {rating.comentarios
                        .filter((co) => co.comentario)
                        .slice(0, 3)
                        .map((co, i) => (
                          <li key={i}>
                            {"★".repeat(co.estrellas)} “{co.comentario}” — {co.refugio}
                          </li>
                        ))}
                    </ul>
                  )}
                  <form action={calificarUsuario} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="usuarioId" value={c.interlocutorId} />
                    <label className="font-bold" htmlFor={`estrellas-${c.animalId}-${c.interlocutorId}`}>
                      Tu puntaje:
                    </label>
                    <select
                      id={`estrellas-${c.animalId}-${c.interlocutorId}`}
                      name="estrellas"
                      defaultValue={rating.miPuntaje ?? 5}
                      className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-2 py-1"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {"★".repeat(n)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="comentario"
                      placeholder="Comentario (opcional)"
                      className="min-w-40 flex-1 rounded-xl border-2 border-crema-2 px-3 py-1"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-salvia text-blanco-calido px-4 py-1 font-bold hover:bg-salvia-oscuro transition-colors"
                    >
                      Guardar
                    </button>
                  </form>
                </details>
              )}
            </li>
          );
          })}
        </ul>
      )}
    </div>
  );
}
