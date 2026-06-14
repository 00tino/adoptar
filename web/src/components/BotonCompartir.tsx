"use client";

// Botón de compartir: usa la Web Share API nativa (móvil) y cae a copiar el
// link al portapapeles en desktop. 100% del lado del cliente, sin costo.

import { useState } from "react";

export default function BotonCompartir({
  titulo,
  texto,
  className,
}: {
  titulo: string;
  texto?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const compartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto ?? titulo, url });
        return;
      } catch {
        // El usuario canceló: no hacemos nada
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles disponible */
    }
  };

  return (
    <button
      type="button"
      onClick={compartir}
      className={
        className ??
        "rounded-full border-2 border-crema px-5 py-2 font-bold text-sm hover:bg-crema hover:text-tinta transition-colors"
      }
    >
      {copiado ? "¡Link copiado! ✅" : "Compartir 🔗"}
    </button>
  );
}
