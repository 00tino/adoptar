"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Campana } from "@/lib/tipos";

export default function CampanasPortada() {
  const [campanas, setCampanas] = useState<Campana[] | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    const control = new AbortController();
    fetch("/api/campanas-publicas", { cache: "no-store", signal: control.signal })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudieron consultar las campañas");
        return respuesta.json();
      })
      .then((datos: { campanas: Campana[] }) => setCampanas(datos.campanas))
      .catch(() => { if (!control.signal.aborted) setFallo(true); });
    return () => control.abort();
  }, []);

  if (fallo) return <p className="mt-6"><Link href="/donaciones" className="font-bold text-terracota-oscuro underline">Ver las campañas y sus montos actualizados</Link></p>;
  if (!campanas) return <p role="status" className="mt-6 min-h-48 rounded-2xl border-2 border-crema-2 p-6 text-tinta-suave">Consultando campañas y montos actualizados…</p>;
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      {campanas.map((c) => (
        <div key={c.id} className="rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6">
          <h3 className="font-display text-xl font-bold">{c.titulo}</h3>
          <p className="mt-2 text-sm text-tinta-suave">{c.descripcion}</p>
          {c.metaMonto && (
            <div className="mt-4">
              <div className="h-3 rounded-full bg-crema-2 overflow-hidden">
                <div className="h-full bg-salvia" style={{ width: `${Math.min(100, (c.recaudado / c.metaMonto) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs font-bold text-salvia-oscuro">${c.recaudado.toLocaleString("es-AR")} de ${c.metaMonto.toLocaleString("es-AR")}</p>
            </div>
          )}
          <Link href="/donaciones" className="mt-4 inline-block rounded-full bg-terracota-oscuro text-blanco-calido px-5 py-2 text-sm font-bold hover:bg-terracota-mas-oscuro transition-colors">Donar 💛</Link>
        </div>
      ))}
    </div>
  );
}
