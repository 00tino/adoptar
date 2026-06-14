"use client";

// Chat de la publicación: el interesado escribe y quien publica responde.
// Refresca los mensajes cada 5 segundos (simple y suficiente para el MVP;
// se puede migrar a Supabase Realtime más adelante sin cambiar la UI).

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { enviarMensaje, type MensajeChat } from "@/lib/acciones-chat";

export default function ChatAnimal({ animalId }: { animalId: string }) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, startTransition] = useTransition();
  const fondoRef = useRef<HTMLDivElement>(null);

  const refrescar = useCallback(async () => {
    try {
      // Polling contra un Route Handler estable (su URL no cambia en cada
      // deploy, a diferencia del id de una server action).
      const res = await fetch(`/api/chat/${animalId}`, { cache: "no-store" });
      if (!res.ok) return;
      const { mensajes } = (await res.json()) as { mensajes: MensajeChat[] };
      setMensajes(mensajes);
    } catch {
      // sin sesión o sin red: no rompemos la página
    }
  }, [animalId]);

  useEffect(() => {
    refrescar();
    const intervalo = setInterval(refrescar, 5000);
    return () => clearInterval(intervalo);
  }, [refrescar]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    fondoRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    startTransition(async () => {
      await enviarMensaje(animalId, t);
      await refrescar();
    });
  }

  return (
    <div className="mt-4 rounded-2xl bg-blanco-calido border-2 border-crema-2 overflow-hidden">
      <div className="max-h-72 overflow-y-auto p-4 space-y-3">
        {mensajes.length === 0 && (
          <p className="text-sm text-tinta-suave text-center py-4">
            Todavía no hay mensajes. ¡Rompé el hielo! 🐾
          </p>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className={`flex ${m.esMio ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.esMio
                  ? "bg-salvia text-blanco-calido rounded-br-sm"
                  : "bg-crema-2 text-tinta rounded-bl-sm"
              }`}
            >
              {!m.esMio && <p className="text-xs font-bold opacity-70">{m.autor}</p>}
              <p>{m.contenido}</p>
            </div>
          </div>
        ))}
        <div ref={fondoRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="flex gap-2 border-t-2 border-crema-2 p-3"
      >
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí tu consulta…"
          aria-label="Mensaje"
          maxLength={2000}
          className="flex-1 rounded-xl border-2 border-crema-2 px-4 py-2 text-sm bg-blanco-calido"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="rounded-xl bg-terracota-oscuro text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-mas-oscuro transition-colors disabled:opacity-50"
        >
          {enviando ? "…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
