import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { tieneRefugio } from "@/lib/acciones-refugio";
import { contarNoLeidos } from "@/lib/acciones-chat";
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
  const [conRefugio, noLeidos] =
    usuario && supabaseDisponible()
      ? await Promise.all([tieneRefugio(usuario.id), contarNoLeidos(usuario.id)])
      : [false, 0];
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
