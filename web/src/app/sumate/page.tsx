import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sumá tu refugio",
  description:
    "AdoptAR es gratis para refugios y rescatistas de Argentina. Publicá animales, recibí postulaciones e importá tu planilla.",
};

export default function PaginaSumate() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-bold text-salvia-oscuro">Para refugios y rescatistas</p>
      <h1 className="font-display text-4xl font-black mt-2">
        Publicá tus animales. Cero costo. Sin letra chica.
      </h1>
      <p className="mt-4 text-tinta-suave leading-relaxed">
        AdoptAR no es un marketplace ni cobra comisión. Es una vitrina para que
        la gente encuentre a tus animales sin depender de un post que se pierde
        en un grupo de Facebook.
      </p>

      <ul className="mt-8 space-y-4">
        {[
          ["Publicaciones con ficha completa", "Fotos, historia, vacunas, castración y zona. La gente entiende de una."],
          ["Postulaciones ordenadas", "Dejan datos en la plataforma. Vos aceptás, pasás a proceso o rechazás."],
          ["Importar planilla", "Si ya llevás Excel, lo cargás y no reescribís uno por uno."],
          ["Donaciones a tu causa", "Campaña con Mercado Pago o transferencia, cuando la apruebe el equipo."],
          ["Mapa y buscador", "Aparecés por zona. Gratis, con OpenStreetMap."],
        ].map(([t, d]) => (
          <li key={t} className="rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5">
            <p className="font-display text-xl font-bold">{t}</p>
            <p className="mt-1 text-sm text-tinta-suave">{d}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/registrar-refugio"
          className="rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro"
        >
          Registrar mi refugio
        </Link>
        <a
          href="mailto:adoptar.argentina.ayuda@gmail.com"
          className="rounded-full border-2 border-tinta px-6 py-3 font-bold hover:bg-tinta hover:text-crema"
        >
          Escribirnos
        </a>
      </div>
    </div>
  );
}
