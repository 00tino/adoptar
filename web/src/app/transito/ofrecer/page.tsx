import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { usuarioActual } from "@/lib/auth";
import { guardarHogar, miHogar, solicitudesRecibidas } from "@/lib/acciones-hogares";

export const metadata: Metadata = { title: "Ofrecer mi hogar de tránsito", robots: { index: false } };

export default async function PaginaOfrecerTransito({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-black">Ofrecé un hogar de tránsito 💛</h1>
        <p className="mt-3 text-tinta-suave">Ingresá para indicar cuándo tenés lugar. Podés pausar tu disponibilidad cuando quieras.</p>
        <SignInButton mode="modal"><button className="mt-6 rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido">Ingresar</button></SignInButton>
      </div>
    );
  }

  const hogar = await miHogar();
  const solicitudes = hogar ? await solicitudesRecibidas() : [];
  const guardado = (await searchParams).guardado === "1";
  const nombreInicial = hogar?.nombre ?? [usuario.firstName, usuario.lastName].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/transito/hogares" className="text-sm font-bold text-terracota-oscuro hover:underline">← Ver hogares disponibles</Link>
      <h1 className="mt-4 font-display text-4xl font-black">Tu lugar puede cambiar una historia 💛</h1>
      <p className="mt-3 text-tinta-suave">Indicá qué animales podés recibir y en qué zona. Refugios y rescatistas podrán pedirte ayuda desde AdoptAR; vos decidís si podés aceptar cada caso.</p>
      {guardado && <p className="mt-6 rounded-xl border-2 border-salvia bg-salvia/20 p-4 font-bold">Disponibilidad guardada. {hogar?.disponible ? "Tu hogar aparece en la búsqueda." : "Tu hogar está pausado y no aparece en la búsqueda."}</p>}

      <form action={guardarHogar} className="mt-8 space-y-5 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">Tu disponibilidad</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Nombre que se verá en la lista
            <input name="nombre" required maxLength={80} defaultValue={nombreInicial} placeholder="Tu nombre o el de tu equipo" className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2" />
          </label>
          <label className="text-sm font-bold">Lugares disponibles
            <input name="cupos" type="number" min={1} max={10} required defaultValue={hogar?.cupos ?? 1} className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2" />
          </label>
          <label className="text-sm font-bold">Ciudad
            <input name="ciudad" required maxLength={80} defaultValue={hogar?.ciudad} className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2" />
          </label>
          <label className="text-sm font-bold">Provincia
            <input name="provincia" required maxLength={80} defaultValue={hogar?.provincia} className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2" />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-bold">Puedo recibir</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {([ ["perro", "Perros"], ["gato", "Gatos"], ["otro", "Otros"] ] as const).map(([valor, texto]) => (
              <label key={valor} className="flex items-center gap-2 text-sm"><input type="checkbox" name="especies" value={valor} defaultChecked={hogar?.especies.includes(valor)} className="accent-terracota" />{texto}</label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-bold">Algo que convenga saber (opcional)
          <textarea name="descripcion" maxLength={600} rows={3} defaultValue={hogar?.descripcion} placeholder="Por ejemplo: tengo patio, puedo recibir animales pequeños, necesito que cubran alimento..." className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-2" />
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-salvia/15 p-4 text-sm">
          <input type="checkbox" name="disponible" defaultChecked={hogar?.disponible ?? true} className="mt-1 accent-terracota" />
          <span><strong>Tengo lugar ahora.</strong> Si lo desmarcás, tu perfil deja de aparecer en la búsqueda; tus solicitudes anteriores siguen acá.</span>
        </label>
        <p className="text-sm text-tinta-suave">Solo se muestra tu nombre, ciudad, provincia y disponibilidad. Tu email no aparece en la búsqueda; al responder por correo, el solicitante verá tu dirección.</p>
        <button className="rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro">Guardar disponibilidad</button>
      </form>

      {hogar && (
        <section className="mt-12">
          <h2 className="font-display text-3xl font-bold">Solicitudes recibidas ({solicitudes.length})</h2>
          {solicitudes.length === 0 ? <p className="mt-3 text-tinta-suave">Cuando alguien te pida ayuda, vas a ver su mensaje acá y te avisaremos por email.</p> : (
            <div className="mt-5 space-y-4">
              {solicitudes.map((s) => (
                <article key={s.id} className="rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl font-bold">{s.nombre}</h3>
                    <time className="text-xs text-tinta-suave">{new Date(s.creadoEl).toLocaleDateString("es-AR")}</time>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{s.mensaje}</p>
                  {s.email && <a href={`mailto:${s.email}?subject=${encodeURIComponent("Tu solicitud de tránsito en AdoptAR")}`} className="mt-4 inline-block font-bold text-terracota-oscuro hover:underline">Responder por email a {s.nombre} →</a>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
