"use client";

// Corazón para guardar/quitar un animal de favoritos. Para usuarios sin sesión
// abre el modal de ingreso. Con sesión, togglea con feedback optimista.

import { useState, useTransition } from "react";
import { SignInButton } from "@clerk/nextjs";
import { alternarFavorito } from "@/lib/acciones-favoritos";

export default function BotonFavorito({
  animalId,
  inicial,
  logueado,
  variante = "card",
}: {
  animalId: string;
  inicial: boolean;
  logueado: boolean;
  variante?: "card" | "detalle";
}) {
  const [fav, setFav] = useState(inicial);
  const [pendiente, startTransition] = useTransition();

  const claseBase =
    variante === "detalle"
      ? "inline-flex items-center gap-2 rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors"
      : "absolute top-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full text-lg shadow transition-colors";

  if (!logueado) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          aria-label="Guardar en favoritos (iniciá sesión)"
          title="Iniciá sesión para guardar favoritos"
          className={`${claseBase} ${
            variante === "detalle"
              ? "border-crema-2 bg-blanco-calido hover:border-terracota"
              : "bg-blanco-calido/90 hover:bg-blanco-calido"
          }`}
        >
          🤍{variante === "detalle" && " Guardar"}
        </button>
      </SignInButton>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
      disabled={pendiente}
      onClick={() => {
        const nuevo = !fav;
        setFav(nuevo); // optimista
        startTransition(async () => {
          const fd = new FormData();
          fd.set("animal_id", animalId);
          try {
            await alternarFavorito(fd);
          } catch {
            setFav(!nuevo); // revertir si falla
          }
        });
      }}
      className={`${claseBase} ${
        variante === "detalle"
          ? fav
            ? "border-terracota bg-terracota/10 text-terracota"
            : "border-crema-2 bg-blanco-calido hover:border-terracota"
          : "bg-blanco-calido/90 hover:bg-blanco-calido"
      } disabled:opacity-60`}
    >
      {fav ? "❤️" : "🤍"}
      {variante === "detalle" && (fav ? " En favoritos" : " Guardar")}
    </button>
  );
}
