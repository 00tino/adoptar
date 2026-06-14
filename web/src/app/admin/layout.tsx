import { notFound } from "next/navigation";
import { clerkDisponible, esAdmin } from "@/lib/auth";
import { supabaseDisponible } from "@/lib/supabase";
import LinkNav from "@/components/LinkNav";

// Layout común del panel admin: título, búsqueda global y pestañas.
// La verificación de admin se repite acá y en cada server action.
export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const pestanas: { href: string; texto: string; exacta?: boolean }[] = [
    { href: "/admin", texto: "Inicio", exacta: true },
    { href: "/admin/animales", texto: "Animales" },
    { href: "/admin/refugios", texto: "Refugios" },
    { href: "/admin/campanas", texto: "Campañas" },
    { href: "/admin/donaciones", texto: "Donaciones" },
    { href: "/admin/suscripciones", texto: "Suscripciones" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Panel de administración</h1>

      {/* Búsqueda global: animales, refugios, campañas, usuarios y donaciones */}
      <form action="/admin/buscar" method="get" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          placeholder="Buscar en todo: animales, refugios, campañas, usuarios, donantes…"
          className="w-full max-w-xl rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
        />
        <button
          type="submit"
          className="rounded-full bg-terracota-oscuro text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-mas-oscuro transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Pestañas de sección */}
      <nav
        aria-label="Secciones del panel"
        className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {pestanas.map((p) => (
          <LinkNav
            key={p.href}
            href={p.href}
            exacta={p.exacta}
            clase="shrink-0 rounded-full border-2 border-crema-2 bg-blanco-calido px-4 py-1.5 text-sm font-bold transition-colors hover:border-terracota hover:text-terracota-oscuro"
            claseActiva="!border-tinta !bg-tinta !text-crema hover:!text-crema"
          >
            {p.texto}
          </LinkNav>
        ))}
      </nav>

      {children}
    </div>
  );
}
