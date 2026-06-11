import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { tieneRefugio } from "@/lib/acciones-refugio";
import { contarNoLeidos } from "@/lib/acciones-chat";
import {
  marcarNotificacionesLeidas,
  obtenerNoLeidas,
} from "@/lib/notificaciones";
import { supabaseDisponible } from "@/lib/supabase";

// Encabezado principal con navegación. Mobile-first: los links secundarios
// se muestran en una segunda fila scrolleable en pantallas chicas.
const links = [
  { href: "/animales", texto: "Animales" },
  { href: "/transito", texto: "Tránsito" },
  { href: "/refugios", texto: "Refugios" },
  { href: "/mapa", texto: "Mapa" },
  { href: "/donaciones", texto: "Donar" },
];

export default async function Header() {
  // Resolvemos la sesión en el servidor (Clerk puede no estar configurado)
  const usuario = clerkDisponible() ? await usuarioActual() : null;
  // Link "Mi refugio" solo para usuarios con refugio verificado/estrella
  const [conRefugio, noLeidos, notificaciones] =
    usuario && supabaseDisponible()
      ? await Promise.all([
          tieneRefugio(usuario.id),
          contarNoLeidos(usuario.id),
          obtenerNoLeidas(usuario.id),
        ])
      : [false, 0, []];
  return (
    <header className="sticky top-0 z-50 bg-blanco-calido/90 backdrop-blur border-b-2 border-crema-2">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="flex items-baseline gap-1 shrink-0">
          <span className="font-display text-2xl font-bold text-tinta">
            Adopt<span className="text-terracota">AR</span>
          </span>
          <span aria-hidden className="text-xl">🐾</span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="flex gap-1 overflow-x-auto -mx-1 px-1 order-last w-full sm:order-none sm:w-auto sm:ml-auto"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-tinta-suave hover:bg-crema-2 hover:text-tinta transition-colors"
            >
              {l.texto}
            </Link>
          ))}
          {usuario && supabaseDisponible() && (
            <Link
              href="/mensajes"
              className="relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-tinta-suave hover:bg-crema-2 hover:text-tinta transition-colors"
            >
              Mensajes
              {noLeidos > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracota px-1 text-[11px] font-bold text-blanco-calido">
                  {noLeidos > 9 ? "9+" : noLeidos}
                </span>
              )}
            </Link>
          )}
          {conRefugio && (
            <Link
              href="/mi-refugio"
              className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-salvia-oscuro hover:bg-crema-2 transition-colors"
            >
              Mi refugio
            </Link>
          )}
          <Link
            href="/publicar-transito"
            className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold bg-terracota text-blanco-calido hover:bg-terracota-oscuro transition-colors"
          >
            Publicar
          </Link>
          {usuario && supabaseDisponible() && (
            <details className="relative">
              <summary
                aria-label={`Notificaciones (${notificaciones.length} sin leer)`}
                className="cursor-pointer list-none rounded-full px-3 py-2 text-sm hover:bg-crema-2 transition-colors"
              >
                🔔
                {notificaciones.length > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracota px-1 text-[10px] font-bold text-blanco-calido">
                    {notificaciones.length}
                  </span>
                )}
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-3 shadow-lg">
                {notificaciones.length === 0 ? (
                  <p className="py-3 text-center text-sm text-tinta-suave">
                    No tenés notificaciones nuevas 🐾
                  </p>
                ) : (
                  <>
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                      {notificaciones.map((n) => (
                        <li
                          key={n.id}
                          className="rounded-xl bg-crema-2/50 px-3 py-2 text-sm"
                        >
                          {n.contenido}
                          <span className="mt-0.5 block text-xs text-tinta-suave">
                            {new Date(n.creadaEl).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <form action={marcarNotificacionesLeidas} className="mt-2">
                      <button
                        type="submit"
                        className="w-full rounded-full border-2 border-crema-2 px-3 py-1.5 text-xs font-bold text-tinta-suave hover:border-tinta hover:text-tinta transition-colors"
                      >
                        Marcar todas como leídas
                      </button>
                    </form>
                  </>
                )}
              </div>
            </details>
          )}
          {clerkDisponible() &&
            (usuario ? (
              <span className="flex items-center px-1">
                <UserButton />
              </span>
            ) : (
              <SignInButton mode="modal">
                <button className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold border-2 border-tinta text-tinta hover:bg-tinta hover:text-crema transition-colors">
                  Ingresar
                </button>
              </SignInButton>
            ))}
        </nav>
      </div>
    </header>
  );
}
