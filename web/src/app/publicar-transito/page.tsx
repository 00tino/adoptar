import type { Metadata } from "next";
import { publicarTransito } from "@/lib/acciones";
import { supabaseDisponible } from "@/lib/supabase";
import { CampoAnimal, SelectorAnimal } from "@/components/CamposAnimal";

export const metadata: Metadata = {
  title: "Publicar un animal en tránsito",
  robots: { index: false }, // página de formulario, no necesita indexarse
};

// Formulario de publicación: guarda en Supabase con estado "pendiente"
// (cola de aprobación del admin). Si Supabase aún no está configurado,
// el botón queda deshabilitado y lo dice claramente.
export default async function PaginaPublicarTransito({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  const activo = supabaseDisponible();

  if (enviado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-7xl">💛</p>
        <h1 className="mt-4 font-display text-4xl font-black">¡Publicación enviada!</h1>
        <p className="mt-3 text-tinta-suave">
          Tu publicación entró en la cola de verificación. Te avisamos por
          email cuando esté aprobada (normalmente dentro de las 48 hs).
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Publicar un animal en tránsito</h1>
      <p className="mt-2 text-tinta-suave">
        Completá los datos del animal. Tu publicación pasa por una verificación
        manual (por eso pedimos video) y te avisamos por email cuando esté
        aprobada.
      </p>

      <form
        action={activo ? publicarTransito : undefined}
        className="mt-8 space-y-5 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6 sm:p-8"
      >
        <CampoAnimal etiqueta="Nombre del animal" nombre="nombre" requerido />
        <div className="grid grid-cols-2 gap-4">
          <SelectorAnimal etiqueta="Especie *" nombre="especie" requerido opciones={[["perro", "Perro"], ["gato", "Gato"], ["otro", "Otro"]]} />
          <SelectorAnimal etiqueta="Sexo *" nombre="sexo" requerido opciones={[["hembra", "Hembra"], ["macho", "Macho"]]} />
        </div>
        <CampoAnimal etiqueta="Raza (o 'mestizo')" nombre="raza" />
        <CampoAnimal etiqueta="Edad aproximada" nombre="edad" placeholder="Ej: 2 años" />
        <CampoAnimal etiqueta="Zona (ciudad, NO tu dirección exacta)" nombre="zona" requerido placeholder="Ej: Caballito, CABA" />
        <div>
          <label className="block text-sm font-bold" htmlFor="descripcion">Descripción *</label>
          <textarea
            id="descripcion"
            name="descripcion"
            required
            rows={4}
            className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
            placeholder="Contanos su carácter, con qué se lleva bien, qué necesita…"
          />
        </div>
        <div>
          <label className="block text-sm font-bold" htmlFor="historia">
            Su historia (opcional)
          </label>
          <textarea
            id="historia"
            name="historia"
            rows={3}
            className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
            placeholder="¿Cómo lo encontraste o rescataste? Contá su historia para emocionar a quien lo lea 💛"
          />
        </div>
        <CampoAnimal etiqueta="Fotos (mínimo 2, máximo 6)" nombre="fotos" tipo="file" multiple requerido accept="image/jpeg,image/png,image/webp" />
        <CampoAnimal etiqueta="Video (obligatorio, para verificación)" nombre="video" tipo="file" requerido accept="video/mp4,video/webm,video/quicktime" />
        <p className="text-sm text-tinta-suave">Las personas interesadas van a poder escribirte por el chat de la publicación.</p>

        {activo ? (
          <button
            type="submit"
            className="w-full rounded-xl bg-terracota-oscuro text-blanco-calido py-3 font-bold hover:bg-terracota-mas-oscuro transition-colors"
          >
            Enviar para verificación 🐾
          </button>
        ) : (
          <>
            <button
              type="submit"
              disabled
              className="w-full rounded-xl bg-terracota-oscuro/50 text-blanco-calido py-3 font-bold cursor-not-allowed"
            >
              Enviar para verificación (próximamente)
            </button>
            <p className="text-xs text-tinta-suave text-center">
              El envío se habilita al conectar la base de datos. Mientras tanto,
              escribinos a <a className="underline font-bold" href="mailto:adoptar.argentina.ayuda@gmail.com">adoptar.argentina.ayuda@gmail.com</a>.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
