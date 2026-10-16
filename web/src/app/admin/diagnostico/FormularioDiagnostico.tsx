"use client";

import { useActionState, useState } from "react";
import { probarServicios } from "@/lib/acciones-diagnostico";
import BotonEnvio from "@/components/BotonEnvio";

export default function FormularioDiagnostico({ tipo, titulo, emailInicial = "" }: { tipo: "correo" | "monitoreo" | "mercadopago"; titulo: string; emailInicial?: string }) {
  const [estado, accion] = useActionState(probarServicios, {});
  const [email, setEmail] = useState(emailInicial);
  return (
    <form action={accion} className="rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5">
      <h3 className="font-display text-xl font-bold">{titulo}</h3>
      <input type="hidden" name="tipo" value={tipo} />
      {tipo === "correo" && <label className="mt-4 block font-bold">Email de prueba
        <input type="email" name="email" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border-2 border-crema-2 bg-crema p-3" />
      </label>}
      <p className="mt-3 text-sm text-tinta-suave">{tipo === "correo" ? "Se enviará un mensaje identificado como prueba a esta dirección." : tipo === "monitoreo" ? "Se enviará un aviso identificado como prueba al destino de monitoreo configurado." : "Consulta la cuenta cobradora configurada, sin mostrar credenciales ni crear pagos."}</p>
      <BotonEnvio className="mt-4 min-h-11 rounded-full bg-tinta px-5 py-3 font-bold text-crema">{tipo === "mercadopago" ? "Consultar cuenta" : "Enviar prueba"}</BotonEnvio>
      {estado.error && <p role="alert" className="mt-3 font-bold text-terracota-oscuro">{estado.error}</p>}
      {estado.mensaje && <p role="status" className="mt-3 font-bold text-salvia-oscuro">{estado.mensaje}</p>}
    </form>
  );
}
