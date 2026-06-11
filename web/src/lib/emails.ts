// Emails automáticos con Resend (capa gratuita: 3.000/mes).
// Si RESEND_API_KEY no está configurada, las funciones no hacen nada
// (la app sigue funcionando, solo no manda emails).

import { Resend } from "resend";

const REMITENTE = "AdoptAR <onboarding@resend.dev>";

/** Escapa texto que viene de usuarios antes de meterlo en HTML de emails */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// ↑ Cuando el dominio adoptaar.com esté verificado en Resend,
//   cambiar por "AdoptAR <hola@adoptaar.com>".

export async function enviarEmail(opciones: {
  para: string;
  asunto: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) return; // Resend no configurado todavía
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: REMITENTE,
      to: opciones.para,
      subject: opciones.asunto,
      html: opciones.html,
    });
  } catch (e) {
    // Un email fallido no debe romper la acción del admin
    console.error("Error enviando email:", e);
  }
}

function plantilla(titulo: string, cuerpo: string): string {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#faf4ea;border-radius:16px;padding:32px">
    <h1 style="color:#2e2118;font-size:24px">🐾 AdoptAR</h1>
    <h2 style="color:#d95d28">${titulo}</h2>
    <p style="color:#5c4a3a;font-size:16px;line-height:1.6">${cuerpo}</p>
    <p style="color:#5c4a3a;font-size:13px;margin-top:32px">— El equipo de AdoptAR · adoptaar.com</p>
  </div>`;
}

export async function emailRefugioAprobado(para: string, nombreCrudo: string) {
  const nombre = escaparHtml(nombreCrudo);
  await enviarEmail({
    para,
    asunto: "¡Tu refugio fue aprobado en AdoptAR! 🎉",
    html: plantilla(
      `¡${nombre} ya es parte de AdoptAR!`,
      "Revisamos tu solicitud y fue aprobada. Ya podés iniciar sesión y publicar tus animales en adopción. ¡Gracias por la labor que hacés!"
    ),
  });
}

export async function emailRefugioRechazado(para: string, nombreCrudo: string) {
  const nombre = escaparHtml(nombreCrudo);
  await enviarEmail({
    para,
    asunto: "Sobre tu solicitud en AdoptAR",
    html: plantilla(
      `Tu solicitud para ${nombre} no fue aprobada`,
      "Por ahora no pudimos verificar los datos del refugio. Si creés que es un error o querés enviar más información, respondé este email y lo revisamos de nuevo."
    ),
  });
}
