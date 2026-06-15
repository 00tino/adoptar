"use client";

import { useFormStatus } from "react-dom";

// Botón de submit con feedback de carga: subir fotos + guardar puede tardar
// unos segundos, así el refugio ve que está procesando y no vuelve a tocar.
export default function BotonGuardar({ etiqueta }: { etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-terracota-oscuro text-blanco-calido py-3 font-bold hover:bg-terracota-mas-oscuro transition-colors disabled:opacity-70 disabled:cursor-wait"
    >
      {pending && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-blanco-calido/40 border-t-blanco-calido"
        />
      )}
      {pending ? "Guardando…" : etiqueta}
    </button>
  );
}
