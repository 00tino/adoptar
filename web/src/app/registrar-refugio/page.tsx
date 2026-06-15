import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import { registrarRefugio } from "@/lib/acciones";
import { supabaseDisponible } from "@/lib/supabase";
import { clerkDisponible, usuarioActual } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Registrar mi refugio",
  description:
    "Sumá tu refugio a AdoptAR gratis. Verificamos cada refugio manualmente para cuidar a adoptantes y animales.",
};

export default async function PaginaRegistrarRefugio({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  const activo = supabaseDisponible();
  // Necesitamos saber quién registra para vincular el refugio a su cuenta.
  const usuario = clerkDisponible() ? await usuarioActual() : null;
  const necesitaLogin = clerkDisponible() && !usuario;

  if (enviado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-7xl">🏠</p>
        <h1 className="mt-4 font-display text-4xl font-black">¡Solicitud enviada!</h1>
        <p className="mt-3 text-tinta-suave">
          Vamos a revisar los datos y el video de tu refugio. Te llega un
          email con la respuesta dentro de las 24–72 hs.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Registrá tu refugio 🏠</h1>
      <p className="mt-2 text-tinta-suave">
        Es gratis y siempre lo va a ser. Revisamos cada solicitud a mano. Si
        tenés un video institucional, sumalo: ayuda a verificar más rápido que
        el refugio existe y que los animales están bien cuidados (no es
        obligatorio).
      </p>

      <ol className="mt-6 space-y-3 text-sm">
        {[
          "Completás este formulario con los datos del refugio.",
          "Nuestro equipo revisa la información (y el video, si lo cargaste) en 24–72 hs.",
          "Te llega un email con la aprobación y ya podés publicar animales.",
        ].map((paso, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="shrink-0 w-7 h-7 rounded-full bg-sol text-tinta font-bold flex items-center justify-center">{i + 1}</span>
            <span className="pt-1">{paso}</span>
          </li>
        ))}
      </ol>

      {necesitaLogin && (
        <div className="mt-6 rounded-2xl bg-sol/30 border-2 border-sol px-5 py-4">
          <p className="font-bold text-tinta">Primero ingresá con tu cuenta 🐾</p>
          <p className="mt-1 text-sm text-tinta-suave">
            Vinculamos el refugio a tu cuenta para que, una vez aprobado, puedas
            administrarlo desde tu panel.
          </p>
          <SignInButton mode="modal">
            <button className="mt-3 rounded-full bg-terracota-oscuro px-6 py-2.5 text-sm font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors">
              Ingresar
            </button>
          </SignInButton>
        </div>
      )}

      <form
        action={activo && !necesitaLogin ? registrarRefugio : undefined}
        className={`mt-8 space-y-5 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6 sm:p-8 ${necesitaLogin ? "opacity-60" : ""}`}
      >
        {[
          { etiqueta: "Nombre del refugio *", nombre: "nombre", requerido: true },
          { etiqueta: "Dirección completa *", nombre: "direccion", requerido: true },
          { etiqueta: "Ciudad y provincia *", nombre: "ciudad", requerido: true },
          { etiqueta: "Teléfono *", nombre: "telefono", requerido: true },
          { etiqueta: "Email *", nombre: "email", requerido: true, tipo: "email" },
          { etiqueta: "WhatsApp", nombre: "whatsapp", requerido: false },
          { etiqueta: "Redes sociales (Instagram, Facebook…)", nombre: "redes", requerido: false },
          { etiqueta: "Video institucional (link de YouTube o Drive) — opcional", nombre: "video", requerido: false, tipo: "url" },
        ].map((c) => (
          <div key={c.nombre}>
            <label className="block text-sm font-bold" htmlFor={c.nombre}>{c.etiqueta}</label>
            <input
              id={c.nombre}
              name={c.nombre}
              type={c.tipo ?? "text"}
              required={c.requerido}
              className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-bold" htmlFor="descripcion">Contanos sobre el refugio *</label>
          <textarea
            id="descripcion"
            name="descripcion"
            required
            rows={4}
            className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
          />
        </div>
        {activo ? (
          <button
            type="submit"
            disabled={necesitaLogin}
            className="w-full rounded-xl bg-terracota-oscuro text-blanco-calido py-3 font-bold hover:bg-terracota-mas-oscuro transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {necesitaLogin ? "Ingresá para enviar" : "Enviar solicitud 🏠"}
          </button>
        ) : (
          <>
            <button
              type="submit"
              disabled
              className="w-full rounded-xl bg-terracota-oscuro/50 text-blanco-calido py-3 font-bold cursor-not-allowed"
            >
              Enviar solicitud (próximamente)
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
