import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";
import { FOTOS } from "@/lib/fotos";
import { misPostulaciones, type MiPostulacion } from "@/lib/acciones-adopcion";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { supabaseDisponible } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Mis postulaciones",
  robots: { index: false },
};

// Seguimiento de las postulaciones de adopción del usuario: en qué estado está
// cada una (postulado → en proceso → aceptada/rechazada) y acceso directo a la
// conversación con quien publica, para que postularse y chatear no queden sueltos.

const PASOS = ["postulado", "en_proceso", "aceptada"] as const;

const ETIQUETA: Record<MiPostulacion["estado"], string> = {
  postulado: "Enviada",
  en_proceso: "En proceso",
  aceptada: "¡Aceptada! 🎉",
  rechazada: "No avanzó esta vez",
};

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Línea de progreso postulado → en proceso → aceptada (o estado rechazada). */
function Progreso({ estado }: { estado: MiPostulacion["estado"] }) {
  if (estado === "rechazada") {
    return (
      <span className="inline-flex items-center rounded-full bg-crema-2 px-3 py-1 text-sm font-bold text-tinta-suave">
        {ETIQUETA.rechazada}
      </span>
    );
  }
  const actual = PASOS.indexOf(estado as (typeof PASOS)[number]);
  return (
    <ol className="flex items-center gap-2" aria-label={`Estado: ${ETIQUETA[estado]}`}>
      {PASOS.map((paso, i) => {
        const hecho = i <= actual;
        return (
          <li key={paso} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                hecho
                  ? "bg-salvia text-blanco-calido"
                  : "bg-crema-2 text-tinta-suave"
              }`}
            >
              {hecho ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${hecho ? "font-bold text-tinta" : "text-tinta-suave"}`}>
              {ETIQUETA[paso]}
            </span>
            {i < PASOS.length - 1 && (
              <span aria-hidden className={`mx-1 h-0.5 w-5 ${hecho ? "bg-salvia" : "bg-crema-2"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default async function PaginaMisPostulaciones() {
  if (!supabaseDisponible() || !clerkDisponible()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-black">Mis postulaciones</h1>
        <p className="mt-3 text-tinta-suave">Se habilita al conectar la base de datos.</p>
      </div>
    );
  }

  const usuario = await usuarioActual();
  if (!usuario) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-7xl">📝</p>
        <h1 className="mt-4 font-display text-4xl font-black">Mis postulaciones</h1>
        <p className="mt-3 text-tinta-suave">Iniciá sesión para seguir tus postulaciones.</p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <button className="rounded-full bg-terracota-oscuro text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-mas-oscuro transition-colors">
              Ingresar
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const postulaciones = await misPostulaciones();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Mis postulaciones 🐾</h1>
      <p className="mt-2 text-tinta-suave">
        Seguí el estado de cada animal que querés adoptar y seguí la charla con
        quien lo publica.
      </p>

      {postulaciones.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-10 text-center">
          <Image
            src={FOTOS.vacio.src}
            alt={FOTOS.vacio.alt}
            width={200}
            height={200}
            sizes="160px"
            className="mx-auto aspect-square w-40 rounded-3xl object-cover"
          />
          <p className="mt-4 text-tinta-suave">
            Todavía no te postulaste para adoptar. Encontrá tu próximo compañero en el{" "}
            <Link href="/animales" className="font-bold text-terracota-oscuro underline">
              catálogo
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {postulaciones.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/animales/${p.animalSlug}`}
                  className="font-display text-xl font-bold hover:text-terracota-oscuro transition-colors"
                >
                  {p.animalNombre}
                </Link>
                <span className="text-xs text-tinta-suave">
                  Postulada el {fechaLegible(p.creadoEl)}
                </span>
              </div>
              <div className="mt-4">
                <Progreso estado={p.estado} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/animales/${p.animalSlug}#chat`}
                  className="rounded-full bg-terracota-oscuro px-4 py-1.5 text-sm font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors"
                >
                  Chatear 💬
                </Link>
                <Link
                  href="/mensajes"
                  className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold text-tinta-suave hover:border-terracota transition-colors"
                >
                  Ver conversación
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
