"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import FotoAnimal from "@/components/FotoAnimal";
import { edadLegible } from "@/lib/tipos";
import {
  darDeBajaAnimales,
  restaurarAnimales,
  cambiarEstadoAnimalesVarios,
  eliminarAnimales,
  type AnimalDeRefugio,
} from "@/lib/acciones-refugio";
import SelectorEstadoAdopcion from "./SelectorEstadoAdopcion";

const etiquetaEstado: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "Esperando foto 📷", clase: "bg-terracota/15 text-terracota-oscuro" },
  pendiente: { texto: "Pendiente de aprobación", clase: "bg-sol text-tinta" },
  disponible: { texto: "Disponible", clase: "bg-salvia text-blanco-calido" },
  en_proceso: { texto: "En proceso", clase: "bg-sol text-tinta" },
  adoptado: { texto: "Adoptado 🎉", clase: "bg-tinta-suave text-blanco-calido" },
  rechazado: { texto: "Dado de baja", clase: "bg-crema-2 text-tinta-suave" },
};

const claseLink =
  "rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold hover:bg-crema-2 transition-colors";
const claseLinkPrimario =
  "rounded-full bg-terracota-oscuro px-4 py-1.5 text-sm font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors";
const claseBtnBaja =
  "rounded-full border-2 border-terracota px-4 py-1.5 text-sm font-bold text-terracota-oscuro hover:bg-terracota-mas-oscuro hover:text-blanco-calido transition-colors";

export default function PanelAnimales({ animales }: { animales: AnimalDeRefugio[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [estadoLote, setEstadoLote] = useState("disponible");
  const [pendiente, startTransition] = useTransition();

  const grupos = useMemo(
    () => [
      {
        clave: "publicados",
        titulo: "Publicados",
        items: animales.filter((a) => ["disponible", "en_proceso", "adoptado"].includes(a.estado)),
      },
      {
        clave: "revision",
        titulo: "En revisión del admin",
        ayuda: "Las estamos revisando; te avisamos al aprobarlas.",
        items: animales.filter((a) => a.estado === "pendiente"),
      },
      {
        clave: "foto",
        titulo: "Esperando foto",
        ayuda: "Importados con datos. Agregales una foto para publicarlos.",
        items: animales.filter((a) => a.estado === "borrador" && a.nombre.trim() !== ""),
      },
      {
        clave: "mano",
        titulo: "Para completar a mano",
        ayuda: "Les faltaba el nombre en la planilla. Completalos y agregá una foto.",
        items: animales.filter((a) => a.estado === "borrador" && a.nombre.trim() === ""),
      },
      {
        clave: "baja",
        titulo: "Dados de baja",
        items: animales.filter((a) => a.estado === "rechazado"),
      },
    ].filter((g) => g.items.length > 0),
    [animales]
  );

  function toggle(id: string) {
    setSel((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }
  function toggleGrupo(ids: string[], todos: boolean) {
    setSel((prev) => {
      const s = new Set(prev);
      ids.forEach((id) => (todos ? s.delete(id) : s.add(id)));
      return s;
    });
  }

  function ejecutar(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      setSel(new Set());
    });
  }

  const ids = [...sel];

  return (
    <div className="relative">
      {grupos.map((g) => {
        const idsGrupo = g.items.map((a) => a.id);
        const todosSel = idsGrupo.every((id) => sel.has(id));
        return (
          <div key={g.clave} className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-tinta">
                  {g.titulo} ({g.items.length})
                </h3>
                {g.ayuda && <p className="text-sm text-tinta-suave">{g.ayuda}</p>}
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-bold text-tinta-suave">
                <input
                  type="checkbox"
                  checked={todosSel}
                  onChange={() => toggleGrupo(idsGrupo, todosSel)}
                  className="h-4 w-4 accent-terracota"
                />
                Seleccionar todos
              </label>
            </div>
            <ul className="mt-3 space-y-3">
              {g.items.map((a) => (
                <FilaAnimal
                  key={a.id}
                  a={a}
                  seleccionado={sel.has(a.id)}
                  onToggle={() => toggle(a.id)}
                  onDarDeBaja={() => ejecutar(() => darDeBajaAnimales([a.id]))}
                  onRestaurar={() => ejecutar(() => restaurarAnimales([a.id]))}
                  onEliminar={() => {
                    if (confirm(`¿Eliminar a ${a.nombre || "este animal"} definitivamente? No se puede deshacer.`))
                      ejecutar(() => eliminarAnimales([a.id]));
                  }}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {sel.size > 0 && (
        <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-tinta bg-blanco-calido p-4 shadow-lg">
          <span className="font-bold text-tinta">
            {sel.size} seleccionado{sel.size === 1 ? "" : "s"}
          </span>
          {pendiente && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-tinta/30 border-t-tinta"
            />
          )}
          <div className="flex items-center gap-1">
            <select
              value={estadoLote}
              onChange={(e) => setEstadoLote(e.target.value)}
              aria-label="Estado de adopción a aplicar"
              className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
            >
              <option value="disponible">Disponible</option>
              <option value="en_proceso">En proceso</option>
              <option value="adoptado">Adoptado</option>
            </select>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => ejecutar(() => cambiarEstadoAnimalesVarios(ids, estadoLote))}
              className="rounded-full border-2 border-salvia px-4 py-1.5 text-sm font-bold text-salvia-oscuro hover:bg-salvia hover:text-blanco-calido transition-colors disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => ejecutar(() => restaurarAnimales(ids))}
            className={`${claseLink} disabled:opacity-50`}
          >
            Restaurar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => ejecutar(() => darDeBajaAnimales(ids))}
            className={`${claseBtnBaja} disabled:opacity-50`}
          >
            Dar de baja
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => {
              if (
                confirm(
                  "¿Eliminar definitivamente los seleccionados que estén dados de baja? No se puede deshacer."
                )
              )
                ejecutar(() => eliminarAnimales(ids));
            }}
            className="rounded-full bg-terracota-mas-oscuro px-4 py-1.5 text-sm font-bold text-blanco-calido hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => setSel(new Set())}
            className="ml-auto text-sm font-bold text-tinta-suave hover:text-tinta"
          >
            Limpiar selección
          </button>
        </div>
      )}
    </div>
  );
}

function FilaAnimal({
  a,
  seleccionado,
  onToggle,
  onDarDeBaja,
  onRestaurar,
  onEliminar,
}: {
  a: AnimalDeRefugio;
  seleccionado: boolean;
  onToggle: () => void;
  onDarDeBaja: () => void;
  onRestaurar: () => void;
  onEliminar: () => void;
}) {
  const aprobado = ["disponible", "en_proceso", "adoptado"].includes(a.estado);
  const sinNombre = a.estado === "borrador" && a.nombre.trim() === "";
  const esperandoFoto = a.estado === "borrador" && a.nombre.trim() !== "";

  const etiqueta = sinNombre
    ? { texto: "Para completar 📝", clase: "bg-terracota/15 text-terracota-oscuro" }
    : etiquetaEstado[a.estado] ?? etiquetaEstado.pendiente;

  const especieTexto = a.especie === "perro" ? "Perro" : a.especie === "gato" ? "Gato" : "Otro";
  const datos = [
    especieTexto,
    a.sexo === "hembra" ? "Hembra" : a.sexo === "macho" ? "Macho" : null,
    a.tamano ? a.tamano[0].toUpperCase() + a.tamano.slice(1) : null,
    a.edadMeses ? edadLegible(a.edadMeses) : null,
    a.raza || null,
    a.castrado ? "Castrado/a" : null,
  ].filter(Boolean);

  return (
    <li
      className={`rounded-2xl border-2 p-4 ${seleccionado ? "border-tinta bg-crema-2/40" : "border-crema-2 bg-blanco-calido"}`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="checkbox"
          checked={seleccionado}
          onChange={onToggle}
          aria-label={`Seleccionar ${a.nombre || "este animal"}`}
          className="h-5 w-5 shrink-0 accent-terracota"
        />
        <FotoAnimal
          especie={a.especie}
          nombre={a.nombre || "Sin nombre"}
          semilla={a.id}
          foto={a.foto}
          clase="h-16 w-20 rounded-xl shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold">
            {a.nombre || <span className="text-tinta-suave italic">(sin nombre)</span>}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${etiqueta.clase}`}
          >
            {etiqueta.texto}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {aprobado && <SelectorEstadoAdopcion id={a.id} nombre={a.nombre} estado={a.estado} />}
          {sinNombre ? (
            <Link href={`/mi-refugio/editar/${a.id}`} className={claseLinkPrimario}>
              Completar datos ✏️
            </Link>
          ) : esperandoFoto ? (
            <>
              <Link href={`/mi-refugio/editar/${a.id}`} className={claseLinkPrimario}>
                Agregar foto 📷
              </Link>
              <Link href={`/mi-refugio/editar/${a.id}`} className={claseLink}>
                Modificar
              </Link>
            </>
          ) : (
            a.estado !== "rechazado" && (
              <Link href={`/mi-refugio/editar/${a.id}`} className={claseLink}>
                Modificar
              </Link>
            )
          )}
          {aprobado && (
            <Link href={`/animales/${a.slug}`} className={claseLink}>
              Ver publicación
            </Link>
          )}
          {a.estado === "rechazado" ? (
            <>
              <button type="button" onClick={onRestaurar} className={claseLinkPrimario}>
                Deshacer baja ↩
              </button>
              <button
                type="button"
                onClick={onEliminar}
                className="rounded-full bg-terracota-mas-oscuro px-4 py-1.5 text-sm font-bold text-blanco-calido hover:opacity-90 transition-opacity"
              >
                Eliminar 🗑
              </button>
            </>
          ) : (
            <button type="button" onClick={onDarDeBaja} className={claseBtnBaja}>
              Dar de baja
            </button>
          )}
        </div>
      </div>

      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-sm font-bold text-tinta-suave hover:text-tinta">
          <span className="group-open:hidden">Ver info ▾</span>
          <span className="hidden group-open:inline">Ocultar info ▴</span>
        </summary>
        <div className="mt-2 space-y-2 border-t-2 border-crema-2 pt-2">
          {datos.length > 0 && <p className="text-sm text-tinta-suave">{datos.join(" · ")}</p>}
          {a.descripcion ? (
            <p className="text-sm whitespace-pre-line">{a.descripcion}</p>
          ) : (
            <p className="text-sm italic text-tinta-suave">Sin descripción.</p>
          )}
          {a.vacunas.length > 0 && (
            <p className="text-xs text-tinta-suave">💉 Vacunas: {a.vacunas.join(", ")}</p>
          )}
        </div>
      </details>
    </li>
  );
}
