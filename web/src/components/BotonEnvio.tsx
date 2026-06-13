"use client";

import { useFormStatus } from "react-dom";

// Botón de submit que se deshabilita y muestra "procesando" mientras la
// server action corre, así no se puede apretar dos veces (doble cancelación,
// doble alta, etc.). Tiene que ir DENTRO de un <form>.
export default function BotonEnvio({
  children,
  className,
  textoEnviando = "Procesando…",
  deshabilitado = false,
}: {
  children: React.ReactNode;
  className: string;
  textoEnviando?: string;
  deshabilitado?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || deshabilitado}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? textoEnviando : children}
    </button>
  );
}
