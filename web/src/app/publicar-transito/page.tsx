import type { Metadata } from "next";
import { publicarTransito } from "@/lib/acciones";
import { supabaseDisponible } from "@/lib/supabase";

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
        <Campo etiqueta="Nombre del animal" nombre="nombre" requerido />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold" htmlFor="especie">Especie *</label>
            <select id="especie" name="especie" required className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido">
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold" htmlFor="sexo">Sexo *</label>
            <select id="sexo" name="sexo" required className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido">
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
            </select>
          </div>
        </div>
        <Campo etiqueta="Raza (o 'mestizo')" nombre="raza" />
        <Campo etiqueta="Edad aproximada" nombre="edad" placeholder="Ej: 2 años" />
        <Campo etiqueta="Zona (ciudad, NO tu dirección exacta)" nombre="zona" requerido placeholder="Ej: Caballito, CABA" />
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
        <Campo etiqueta="Fotos (mínimo 2, máximo 6)" nombre="fotos" tipo="file" multiple />
        <Campo etiqueta="Video (obligatorio, para verificación)" nombre="video" tipo="file" requerido />
        <Campo etiqueta="Tu WhatsApp de contacto" nombre="whatsapp" requerido placeholder="Ej: 5491122334455" />

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

// Campo de texto reutilizable del formulario
function Campo({
  etiqueta,
  nombre,
  tipo = "text",
  requerido = false,
  multiple = false,
  placeholder,
}: {
  etiqueta: string;
  nombre: string;
  tipo?: string;
  requerido?: boolean;
  multiple?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={nombre}>
        {etiqueta} {requerido && "*"}
      </label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        required={requerido}
        multiple={multiple}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
      />
    </div>
  );
}
