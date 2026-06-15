import Link from "next/link";
import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { tieneRefugio } from "@/lib/acciones-refugio";
import { contarNoLeidos } from "@/lib/acciones-chat";
import {
  marcarNotificacionesLeidas,
  obtenerNoLeidas,
} from "@/lib/notificaciones";
import type { Notificacion } from "@/lib/notificaciones";
import { supabaseDisponible } from "@/lib/supabase";
import MenuMovil from "./MenuMovil";
import LinkNav from "./LinkNav";

// Encabezado principal. Para que la barra respire, la navegación de catálogo
// vive en un desplegable "Explorar" y todo lo personal (mensajes, favoritos,
// postulaciones, mi refugio, notificaciones) cuelga del menú del avatar.
// En mobile todo se colapsa en el menú hamburguesa (MenuMovil).
const links = [
  { href: "/animales", texto: "Animales" },
  { href: "/transito", texto: "Tránsito" },
  { href: "/refugios", texto: "Refugios" },
  { href: "/mapa", texto: "Mapa" },
];

/** Listado de notificaciones con botón "marcar leídas" (desktop y mobile) */
function ListaNotificaciones({ notificaciones }: { notificaciones: Notificacion[] }) {
  if (notificaciones.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-tinta-suave">
        No tenés notificaciones nuevas 🐾
      </p>
    );
  }
  return (
    <>
      <ul className="max-h-60 space-y-2 overflow-y-auto">
        {notificaciones.map((n) => (
          <li key={n.id} className="rounded-xl bg-crema-2/50 px-3 py-2 text-sm">
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
          className="w-full rounded-full border-2 border-crema-2 px-3 py-2 text-xs font-bold text-tinta-suave hover:border-tinta hover:text-tinta transition-colors"
        >
          Marcar todas como leídas
        </button>
      </form>
    </>
  );
}

export default async function Header() {
  // Resolvemos la sesión en el servidor (Clerk puede no estar configurado)
  const usuario = clerkDisponible() ? await usuarioActual() : null;
  const [conRefugio, noLeidos, notificaciones] =
    usuario && supabaseDisponible()
      ? await Promise.all([
          tieneRefugio(usuario.id),
          contarNoLeidos(usuario.id),
          obtenerNoLeidas(usuario.id),
        ])
      : [false, 0, []];
  const conSesion = Boolean(usuario && supabaseDisponible());
  const pendientes = noLeidos + notificaciones.length;
  const nombreCorto =
    usuario?.firstName ||
    usuario?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Mi cuenta";

  return (
    <header className="sticky top-0 z-50 bg-blanco-calido/90 backdrop-blur border-b-2 border-crema-2">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-1 shrink-0 mr-auto">
          <span className="font-display text-2xl font-bold text-tinta">
            Adopt<span className="text-terracota-oscuro">AR</span>
          </span>
          <span aria-hidden className="text-xl">🐾</span>
        </Link>

        {/* Botón "Ingresar" visible al no haber sesión */}
        {clerkDisponible() && !usuario && (
          <SignInButton mode="modal">
            <button className="whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold border-2 border-tinta text-tinta hover:bg-tinta hover:text-crema transition-colors">
              Ingresar
            </button>
          </SignInButton>
        )}

        {/* Menú único para todas las pantallas (sin desplegables que se solapen) */}
        <MenuMovil aviso={conSesion && pendientes > 0}>
          <nav aria-label="Navegación principal" className="flex flex-col gap-1 pt-2">
            <p className="px-4 pt-1 text-xs font-bold uppercase tracking-wide text-tinta-suave">
              Explorar
            </p>
            {links.map((l) => (
              <LinkNav
                key={l.href}
                href={l.href}
                clase="rounded-xl px-4 py-3 text-base font-bold text-tinta hover:bg-crema-2 transition-colors"
                claseActiva="bg-crema-2"
              >
                {l.texto}
              </LinkNav>
            ))}
            <LinkNav
              href="/donaciones"
              clase="rounded-xl px-4 py-3 text-base font-bold text-tinta hover:bg-crema-2 transition-colors"
              claseActiva="bg-crema-2"
            >
              Donar
            </LinkNav>

            {conSesion && (
              <>
                <p className="mt-2 px-4 pt-1 text-xs font-bold uppercase tracking-wide text-tinta-suave">
                  Mi cuenta
                </p>
                <p className="px-4 pb-1 text-sm text-tinta-suave">
                  Hola, <span className="font-bold text-tinta">{nombreCorto}</span> 👋
                </p>
                <LinkNav
                  href="/mensajes"
                  clase="flex items-center justify-between rounded-xl px-4 py-3 text-base font-bold text-tinta hover:bg-crema-2 transition-colors"
                  claseActiva="bg-crema-2"
                >
                  💬 Mensajes
                  {noLeidos > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-terracota-oscuro px-1.5 text-xs font-bold text-blanco-calido">
                      {noLeidos > 9 ? "9+" : noLeidos}
                    </span>
                  )}
                </LinkNav>
                <LinkNav
                  href="/favoritos"
                  clase="rounded-xl px-4 py-3 text-base font-bold text-tinta hover:bg-crema-2 transition-colors"
                  claseActiva="bg-crema-2"
                >
                  ❤️ Favoritos
                </LinkNav>
                <LinkNav
                  href="/mis-postulaciones"
                  clase="rounded-xl px-4 py-3 text-base font-bold text-tinta hover:bg-crema-2 transition-colors"
                  claseActiva="bg-crema-2"
                >
                  🐾 Mis postulaciones
                </LinkNav>
                {conRefugio && (
                  <LinkNav
                    href="/mi-refugio"
                    clase="rounded-xl px-4 py-3 text-base font-bold text-salvia-oscuro hover:bg-crema-2 transition-colors"
                    claseActiva="bg-crema-2"
                  >
                    🏠 Mi refugio
                  </LinkNav>
                )}
              </>
            )}

            <Link
              href="/publicar-transito"
              className="mt-2 rounded-xl bg-terracota-oscuro px-4 py-3 text-center text-base font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors"
            >
              Publicar
            </Link>

            {conSesion && (
              <>
                <details className="mt-2 rounded-xl border-2 border-crema-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-base font-bold text-tinta">
                    <span>🔔 Notificaciones</span>
                    {notificaciones.length > 0 && (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-terracota-oscuro px-1.5 text-xs font-bold text-blanco-calido">
                        {notificaciones.length}
                      </span>
                    )}
                  </summary>
                  <div className="border-t-2 border-crema-2 p-3">
                    <ListaNotificaciones notificaciones={notificaciones} />
                  </div>
                </details>
                <SignOutButton>
                  <button className="mt-1 rounded-xl px-4 py-3 text-left text-base font-bold text-tinta-suave hover:bg-crema-2 hover:text-tinta transition-colors">
                    Cerrar sesión
                  </button>
                </SignOutButton>
              </>
            )}
          </nav>
        </MenuMovil>
      </div>
    </header>
  );
}
