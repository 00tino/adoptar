import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { actualizarPerfilRefugio, miRefugio } from "@/lib/acciones-refugio";

export const metadata: Metadata = {
  title: "Mi perfil de refugio",
  robots: { index: false },
};

// Pestaña "Mi perfil": el refugio edita su página pública cuando quiera,
// sin pasar por el admin (ya está verificado).
export default async function PaginaPerfilRefugio({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const refugio = await miRefugio();
  if (!refugio) redirect("/registrar-refugio");
  const { guardado } = await searchParams;

  const claseCampo =
    "mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">{refugio.nombre}</h1>

      {/* Pestañas del panel */}
      <nav className="mt-6 flex gap-2 border-b-2 border-crema-2">
        <Link
          href="/mi-refugio"
          className="rounded-t-xl px-5 py-3 font-bold text-tinta-suave hover:bg-crema-2 transition-colors"
        >
          Mis animales
        </Link>
        <span className="rounded-t-xl bg-crema-2 px-5 py-3 font-bold text-tinta">
          Mi perfil
        </span>
      </nav>

      {guardado && (
        <p className="mt-6 rounded-2xl bg-salvia/20 border-2 border-salvia px-5 py-3 font-bold text-salvia-oscuro">
          ¡Perfil guardado! Así se ve tu página pública:{" "}
          <Link href={`/refugios/${refugio.slug}`} className="underline">
            /refugios/{refugio.slug}
          </Link>
        </p>
      )}

      <form action={actualizarPerfilRefugio} className="mt-8 space-y-6">
        <div>
          <label htmlFor="descripcion" className="font-bold">
            Descripción corta
          </label>
          <p className="text-sm text-tinta-suave">
            Aparece en el listado de refugios y arriba de tu página.
          </p>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            maxLength={500}
            defaultValue={refugio.descripcion}
            className={claseCampo}
          />
        </div>

        <div>
          <label htmlFor="historia" className="font-bold">
            Nuestra historia
          </label>
          <p className="text-sm text-tinta-suave">
            Contá cómo nació el refugio, qué hacen y qué necesitan. Sin límite
            de drama ni de ternura (hasta 8.000 caracteres).
          </p>
          <textarea
            id="historia"
            name="historia"
            rows={10}
            maxLength={8000}
            defaultValue={refugio.historia}
            className={claseCampo}
          />
        </div>

        <fieldset>
          <legend className="font-bold">Fotos del refugio</legend>
          {refugio.fotos.length > 0 && (
            <>
              <p className="text-sm text-tinta-suave">
                Marcá las que quieras quitar:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {refugio.fotos.map((f) => (
                  <label key={f} className="relative block cursor-pointer">
                    <Image
                      src={f}
                      alt="Foto del refugio"
                      width={200}
                      height={150}
                      className="h-28 w-full rounded-xl object-cover"
                    />
                    <input
                      type="checkbox"
                      name="fotos_quitar"
                      value={f}
                      className="absolute right-2 top-2 h-6 w-6 accent-terracota"
                      aria-label="Quitar esta foto"
                    />
                  </label>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 text-sm text-tinta-suave">
            Agregar fotos nuevas (JPG/PNG/WebP, hasta 8 MB cada una, máx. 12 en
            total):
          </p>
          <input
            type="file"
            name="fotos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-crema-2 file:px-4 file:py-1.5 file:font-bold"
          />
        </fieldset>

        <fieldset>
          <legend className="font-bold">Video de presentación</legend>
          <p className="text-sm text-tinta-suave">
            Pegá un link de YouTube o Instagram, o subí un archivo (MP4/WebM/MOV
            hasta 60 MB). El archivo tiene prioridad si cargás los dos.
          </p>
          <input
            type="url"
            name="video_url"
            placeholder="https://www.youtube.com/watch?v=…"
            defaultValue={refugio.video_url ?? ""}
            className={claseCampo}
          />
          <input
            type="file"
            name="video_archivo"
            accept="video/mp4,video/webm,video/quicktime"
            className="mt-2 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-crema-2 file:px-4 file:py-1.5 file:font-bold"
          />
          {refugio.video_url && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="quitar_video" className="h-5 w-5 accent-terracota" />
              Quitar el video actual
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend className="font-bold">Redes sociales</legend>
          <p className="text-sm text-tinta-suave">
            Si las cargás, aparecen como botones en tu página pública.
          </p>
          <label htmlFor="instagram" className="mt-2 block text-sm font-bold">
            Instagram
          </label>
          <input
            type="text"
            id="instagram"
            name="instagram"
            placeholder="https://instagram.com/turefugio"
            defaultValue={refugio.redes.instagram ?? ""}
            className={claseCampo}
          />
          <label htmlFor="facebook" className="mt-3 block text-sm font-bold">
            Facebook
          </label>
          <input
            type="text"
            id="facebook"
            name="facebook"
            placeholder="https://facebook.com/turefugio"
            defaultValue={refugio.redes.facebook ?? ""}
            className={claseCampo}
          />
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-full bg-terracota px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-oscuro transition-colors sm:w-auto"
        >
          Guardar perfil
        </button>
      </form>
    </div>
  );
}
