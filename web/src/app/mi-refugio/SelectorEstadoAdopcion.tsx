"use client";

import { useRef, useState, useTransition } from "react";
import { cambiarEstadoAnimal } from "@/lib/acciones-refugio";

// Estado de adopción de un animal aprobado: al elegir una opción se guarda solo
// (sin botón "Cambiar"). Reusa la server action cambiarEstadoAnimal.
export default function SelectorEstadoAdopcion({
  id,
  nombre,
  estado,
}: {
  id: string;
  nombre: string;
  estado: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [guardando, setGuardando] = useState(false);
  const [edicion, setEdicion] = useState<{ base: string; valor: string } | null>(null);
  const [, startTransition] = useTransition();
  const valor = edicion?.base === estado ? edicion.valor : estado;

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setGuardando(true);
        startTransition(async () => {
          try {
            await cambiarEstadoAnimal(formData);
          } finally {
            setGuardando(false);
          }
        });
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`estado-${id}`} className="text-xs font-bold text-tinta-suave">
        Estado de adopción {guardando && <span className="text-salvia-oscuro">· guardando…</span>}
      </label>
      <select
        id={`estado-${id}`}
        name="estado"
        value={valor}
        aria-label={`Estado de adopción de ${nombre}`}
        onChange={(e) => {
          setEdicion({ base: estado, valor: e.target.value });
          formRef.current?.requestSubmit();
        }}
        className="rounded-xl border-2 border-crema-2 bg-blanco-calido px-3 py-1.5 text-sm"
      >
        <option value="disponible">Disponible</option>
        <option value="en_proceso">En proceso</option>
        <option value="adoptado">Adoptado 🎉</option>
      </select>
    </form>
  );
}
