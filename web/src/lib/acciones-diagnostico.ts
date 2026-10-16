"use server";

import { esAdmin } from "./auth";
import { campoTexto, limitarPorIp } from "./limites";
import { enviarEmail } from "./emails";
import { registrarError } from "./monitoreo";

export async function probarServicios(_anterior: { error?: string; mensaje?: string }, formData: FormData): Promise<{ error?: string; mensaje?: string }> {
  if (!(await esAdmin())) return { error: "Solo el administrador puede hacer estas pruebas." };
  try {
    await limitarPorIp("diagnostico-servicios", 5, 60);
    const tipo = String(formData.get("tipo") ?? "");
    if (tipo === "mercadopago") {
      const token = process.env.MP_ACCESS_TOKEN;
      if (!token) return { error: "Mercado Pago no tiene una credencial configurada." };
      const respuesta = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
      });
      if (!respuesta.ok) return { error: "Mercado Pago no aceptó la credencial configurada." };
      const cuenta = await respuesta.json();
      if (!cuenta.id || !Array.isArray(cuenta.tags)) return { error: "No pudimos determinar el tipo de cuenta cobradora." };
      const tipoCuenta = cuenta.tags.includes("test_user") ? "DE PRUEBA" : "REAL";
      return { mensaje: `Cuenta ${tipoCuenta}: ${cuenta.nickname ?? "sin alias"} · ID ${cuenta.id} · País ${cuenta.country_id ?? "sin informar"}. Solo se consultó la identidad; no se creó ningún pago.` };
    }
    if (tipo === "correo") {
      const para = campoTexto(formData.get("email"), 120);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)) return { error: "Ingresá un email válido." };
      const enviado = await enviarEmail({
        para,
        asunto: "[AdoptAR] Prueba de correo real",
        html: `<h1>Prueba de correo de AdoptAR</h1><p>Este mensaje comprueba el envío desde el sitio publicado.</p><p>Fecha: ${new Date().toISOString()}</p><p>Si lo recibiste, el envío llegó a tu casilla. Revisá también si fue a spam.</p>`,
      });
      return enviado ? { mensaje: "El proveedor aceptó el correo. Confirmá si llegó a tu bandeja o a spam." }
        : { error: "El proveedor no aceptó el correo. Revisá la configuración y los logs." };
    }
    if (tipo === "monitoreo") {
      const enviado = await registrarError({ contexto: "PRUEBA:monitoreo", mensaje: "Aviso de prueba autorizado desde el panel de AdoptAR.", ruta: "/admin/diagnostico", metodo: "POST" });
      return enviado ? { mensaje: "El proveedor aceptó el aviso de prueba. Confirmá la recepción en el destino configurado." }
        : { error: "No se envió el aviso: revisá la configuración, el proveedor o esperá 15 minutos si ya hiciste esta prueba." };
    }
    return { error: "Elegí una prueba válida." };
  } catch {
    return { error: "No pudimos completar la prueba. Probá de nuevo más tarde." };
  }
}
