"use client";

import { useActionState, useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { reportarPublicacion } from "@/lib/acciones-reportes";
import BotonEnvio from "./BotonEnvio";

export default function FormularioReporte({ animalId, logueado }: { animalId: string; logueado: boolean }) {
  const [estado, accion] = useActionState(reportarPublicacion, {});
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  return (
    <details className="mt-4 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-4">
      <summary className="min-h-11 cursor-pointer py-3 font-bold">Reportar esta publicación</summary>
      {estado.mensaje ? <p role="status" className="mt-3 text-salvia-oscuro">{estado.mensaje}</p> : logueado ? (
        <form action={accion} className="mt-3 space-y-4">
          <p className="text-sm text-tinta-suave">Tu reporte es privado. Solo lo ve el equipo de moderación.</p>
          <input type="hidden" name="animal_id" value={animalId} />
          <label className="block text-sm font-bold">Motivo
            <select name="motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border-2 border-crema-2 bg-crema px-3 py-2">
              <option value="" disabled>Elegí un motivo</option>
              <option value="fraude">Posible estafa o venta encubierta</option>
              <option value="maltrato">Maltrato o riesgo para el animal</option>
              <option value="datos_incorrectos">Datos incorrectos o publicación duplicada</option>
              <option value="otro">Otro motivo</option>
            </select>
          </label>
          <label className="block text-sm font-bold">¿Qué pasó?
            <textarea name="detalle" required minLength={10} maxLength={1500} rows={4} value={detalle} onChange={(e) => setDetalle(e.target.value)} aria-describedby="reporte-ayuda" className="mt-1 block w-full rounded-xl border-2 border-crema-2 bg-crema p-3" />
          </label>
          <p id="reporte-ayuda" className="text-sm text-tinta-suave">Contanos qué viste, sin incluir datos sensibles.</p>
          {estado.error && <p role="alert" className="text-sm font-bold text-terracota-oscuro">{estado.error}</p>}
          <BotonEnvio className="min-h-11 rounded-full bg-tinta px-5 py-3 font-bold text-crema">Enviar reporte</BotonEnvio>
        </form>
      ) : (
        <div className="mt-3">
          <p className="mb-3 text-sm">Iniciá sesión para enviar un reporte privado al equipo.</p>
          <SignInButton mode="modal"><button className="min-h-11 rounded-full bg-tinta px-5 py-3 font-bold text-crema">Iniciar sesión</button></SignInButton>
        </div>
      )}
    </details>
  );
}
