import Link from "next/link";

// Pestañas del panel "Mi refugio".
const pestanas = [
  { href: "/mi-refugio", texto: "Mis animales" },
  { href: "/mi-refugio/campanas", texto: "Campañas" },
  { href: "/mi-refugio/archivos", texto: "Archivos" },
  { href: "/mi-refugio/perfil", texto: "Mi perfil" },
];

export default function Pestanas({ activa }: { activa: string }) {
  return (
    <nav className="mt-6 flex gap-2 overflow-x-auto border-b-2 border-crema-2">
      {pestanas.map((p) =>
        p.href === activa ? (
          <span
            key={p.href}
            className="whitespace-nowrap rounded-t-xl bg-crema-2 px-5 py-3 font-bold text-tinta"
          >
            {p.texto}
          </span>
        ) : (
          <Link
            key={p.href}
            href={p.href}
            className="whitespace-nowrap rounded-t-xl px-5 py-3 font-bold text-tinta-suave hover:bg-crema-2 transition-colors"
          >
            {p.texto}
          </Link>
        )
      )}
    </nav>
  );
}
