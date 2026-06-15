import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  miRefugio,
  misAnimales,
  darDeBajaAnimal,
  postulacionesDeRefugio,
  cambiarEstadoPostulacion,
} from "@/lib/acciones-refugio";
import { edadLegible } from "@/lib/tipos";
import FotoAnimal from "@/components/FotoAnimal";
import Pestanas from "./Pestanas";
import SelectorEstadoAdopcion from "./SelectorEstadoAdopcion";

export const metadata: Metadata = {
  title: "Mi refugio",
  robots: { index: false },
};

// Panel del refugio: gestión de sus propios animales sin depender del admin.

const etiquetaEstado: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "Esperando foto 📷", clase: "bg-terracota/15 text-terracota-oscuro" },
  pendiente: { texto: "Pendiente de aprobación", clase: "bg-sol text-tinta" },
  disponible: { texto: "Disponible", clase: "bg-salvia text-blanco-calido" },
  en_proceso: { texto: "En proceso", clase: "bg-sol text-tinta" },
  adoptado: { texto: "Adoptado 🎉", clase: "bg-tinta-suave text-blanco-calido" },
  rechazado: { texto: "Dado de baja", clase: "bg-crema-2 text-tinta-suave" },
};

export default async function PaginaMiRefugio({
  searchParams,
}: {
  searchParams: Promise<{ publicado?: string; editado?: string }>;
}) {
  const refugio = await miRefugio();
  if (!refugio) redirect("/registrar-refugio");

  const { publicado, editado } = await searchParams;
  const [animales, postulaciones] = await Promise.all([
    misAnimales(),
    postulacionesDeRefugio(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black">{refugio.nombre}</h1>
          <p className="mt-1 text-tinta-suave">
            {refugio.estado === "estrella" ? (
              <>⭐ Refugio estrella: tus publicaciones salen sin aprobación previa.</>
            ) : (
              <>✅ Refugio verificado: tus publicaciones pasan por la cola del admin.</>
            )}
          </p>
        </div>
        <Link
          href="/mi-refugio/publicar"
          className="rounded-full bg-terracota-oscuro text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-mas-oscuro transition-colors"
        >
          Publicar animal 🐾
        </Link>
      </div>

      <Pestanas activa="/mi-refugio" />

      {(publicado || editado) && (
        <p className="mt-6 rounded-2xl bg-salvia/20 border-2 border-salvia px-5 py-3 font-bold text-salvia-oscuro">
          {publicado
            ? refugio.estado === "estrella"
              ? "¡Publicado! Ya está visible en el catálogo."
              : "¡Enviado! Entra a la cola de aprobación del admin."
            : "Cambios guardados."}
        </p>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">
          Tus animales ({animales.length})
        </h2>

        {animales.some((a) => a.estado === "borrador") && (
          <p className="mt-4 rounded-2xl bg-terracota/10 border-2 border-terracota/40 px-5 py-3 text-sm text-terracota-oscuro">
            📷 Tenés animales importados <strong>esperando foto</strong>. No se
            ven en el catálogo hasta que les agregues al menos una. Tocá
            “Agregar foto” en cada uno.
          </p>
        )}

        {animales.length === 0 ? (
          <p className="mt-4 text-tinta-suave">
            Todavía no publicaste ningún animal. ¡Empezá con el botón de arriba!
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {animales.map((a) => {
              const etiqueta = etiquetaEstado[a.estado] ?? etiquetaEstado.pendiente;
              const aprobado = ["disponible", "en_proceso", "adoptado"].includes(a.estado);
              const especieTexto =
                a.especie === "perro" ? "Perro" : a.especie === "gato" ? "Gato" : "Otro";
              const datos = [
                especieTexto,
                a.sexo === "hembra" ? "Hembra" : a.sexo === "macho" ? "Macho" : null,
                a.tamano ? a.tamano[0].toUpperCase() + a.tamano.slice(1) : null,
                a.edadMeses ? edadLegible(a.edadMeses) : null,
                a.raza || null,
                a.castrado ? "Castrado/a" : null,
              ].filter(Boolean);
              return (
                <li key={a.id}>
                  <details className="group rounded-2xl bg-blanco-calido border-2 border-crema-2 overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-center gap-4 p-4 hover:bg-crema-2/40 transition-colors">
                      <FotoAnimal
                        especie={a.especie}
                        nombre={a.nombre}
                        semilla={a.id}
                        foto={a.foto}
                        clase="h-16 w-20 rounded-xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-xl font-bold">{a.nombre}</p>
                        <span
                          className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${etiqueta.clase}`}
                        >
                          {etiqueta.texto}
                        </span>
                      </div>
                      <span
                        aria-hidden
                        className="shrink-0 text-tinta-suave transition-transform group-open:rotate-180"
                      >
                        ▾
                      </span>
                    </summary>

                    <div className="border-t-2 border-crema-2 p-4 space-y-3">
                      {datos.length > 0 && (
                        <p className="text-sm text-tinta-suave">{datos.join(" · ")}</p>
                      )}
                      {a.descripcion ? (
                        <p className="text-sm whitespace-pre-line">{a.descripcion}</p>
                      ) : (
                        <p className="text-sm italic text-tinta-suave">Sin descripción.</p>
                      )}
                      {a.vacunas.length > 0 && (
                        <p className="text-xs text-tinta-suave">
                          💉 Vacunas: {a.vacunas.join(", ")}
                        </p>
                      )}

                      <div className="flex flex-wrap items-end gap-2 pt-1">
                        {aprobado && (
                          <SelectorEstadoAdopcion id={a.id} nombre={a.nombre} estado={a.estado} />
                        )}
                        <Link
                          href={`/mi-refugio/editar/${a.id}`}
                          className={
                            a.estado === "borrador"
                              ? "rounded-full bg-terracota-oscuro px-4 py-1.5 text-sm font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors"
                              : "rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold hover:bg-crema-2 transition-colors"
                          }
                        >
                          {a.estado === "borrador" ? "Agregar foto 📷" : "Modificar"}
                        </Link>
                        {aprobado && (
                          <Link
                            href={`/animales/${a.slug}`}
                            className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold text-tinta-suave hover:bg-crema-2 transition-colors"
                          >
                            Ver publicación
                          </Link>
                        )}
                        {a.estado !== "rechazado" && (
                          <form action={darDeBajaAnimal}>
                            <input type="hidden" name="id" value={a.id} />
                            <button
                              type="submit"
                              className="rounded-full border-2 border-terracota px-4 py-1.5 text-sm font-bold text-terracota-oscuro hover:bg-terracota-mas-oscuro hover:text-blanco-calido transition-colors"
                            >
                              Dar de baja
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Postulaciones postulaciones={postulaciones} />
    </div>
  );
}

const etiquetaPostulacion: Record<string, { texto: string; clase: string }> = {
  postulado: { texto: "Nueva", clase: "bg-sol text-tinta" },
  en_proceso: { texto: "En proceso", clase: "bg-salvia text-blanco-calido" },
  aceptada: { texto: "Aceptada 🎉", clase: "bg-salvia-oscuro text-blanco-calido" },
  rechazada: { texto: "Rechazada", clase: "bg-crema-2 text-tinta-suave" },
};

function Postulaciones({
  postulaciones,
}: {
  postulaciones: Awaited<ReturnType<typeof postulacionesDeRefugio>>;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold">
        Postulaciones de adopción ({postulaciones.length})
      </h2>
      {postulaciones.length === 0 ? (
        <p className="mt-4 text-tinta-suave">
          Todavía no recibiste postulaciones. Cuando alguien se postule por uno
          de tus animales, va a aparecer acá.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {postulaciones.map((p) => {
            const etiqueta = etiquetaPostulacion[p.estado] ?? etiquetaPostulacion.postulado;
            return (
              <li
                key={p.id}
                className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">
                    {p.nombre}{" "}
                    <span className="font-normal text-tinta-suave">
                      → quiere adoptar a{" "}
                      <Link href={`/animales/${p.animalSlug}`} className="font-bold hover:text-terracota-oscuro">
                        {p.animalNombre}
                      </Link>
                    </span>
                  </p>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${etiqueta.clase}`}>
                    {etiqueta.texto}
                  </span>
                </div>
                <p className="mt-2 text-sm text-tinta-suave">
                  📧 <a href={`mailto:${p.email}`} className="underline">{p.email}</a>
                  {p.telefono && <> · 📞 {p.telefono}</>}
                  {p.vivienda && <> · 🏠 {p.vivienda}</>}
                </p>
                {p.mensaje && <p className="mt-2 text-sm whitespace-pre-line">{p.mensaje}</p>}
                <form action={cambiarEstadoPostulacion} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="sr-only" htmlFor={`post-${p.id}`}>Estado de la postulación</label>
                  <select
                    id={`post-${p.id}`}
                    name="estado"
                    defaultValue={p.estado}
                    className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
                  >
                    <option value="postulado">Nueva</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="rechazada">Rechazada</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-full border-2 border-salvia px-4 py-1.5 text-sm font-bold text-salvia-oscuro hover:bg-salvia hover:text-blanco-calido transition-colors"
                  >
                    Actualizar
                  </button>
                  <Link
                    href={`/animales/${p.animalSlug}#chat`}
                    className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold text-tinta-suave hover:border-terracota transition-colors"
                  >
                    Chatear 💬
                  </Link>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
