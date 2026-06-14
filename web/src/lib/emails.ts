// Emails automáticos con Resend (capa gratuita: 3.000/mes).
// Si RESEND_API_KEY no está configurada, las funciones no hacen nada
// (la app sigue funcionando, solo no manda emails).

import { Resend } from "resend";

const REMITENTE = "AdoptAR <hola@adoptar.dpdns.org>";
// Casilla real de contacto: como reply-to da una señal de legitimidad a Gmail
// y permite que la gente conteste a un humano.
const RESPONDER_A = "adoptar.argentina.ayuda@gmail.com";

/** Convierte el HTML de un email a texto plano legible (parte text/plain).
 *  Una versión de texto reduce mucho el riesgo de que Gmail lo marque spam. */
function htmlAPlano(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(p|div|h1|h2|h3|li|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

/** Escapa texto que viene de usuarios antes de meterlo en HTML de emails */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
export async function enviarEmail(opciones: {
  para: string;
  asunto: string;
  html: string;
  texto?: string;
}) {
  if (!process.env.RESEND_API_KEY) return; // Resend no configurado todavía
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: REMITENTE,
      to: opciones.para,
      replyTo: RESPONDER_A,
      subject: opciones.asunto,
      html: opciones.html,
      // Parte de texto plano: clave para que Gmail no lo marque "unsolicited".
      text: opciones.texto ?? htmlAPlano(opciones.html),
      headers: {
        // Gmail (reglas de remitentes 2024) espera List-Unsubscribe en correos
        // automáticos. Da de baja con un solo clic y mejora la entregabilidad.
        "List-Unsubscribe": `<mailto:${RESPONDER_A}?subject=baja>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
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
    <p style="color:#5c4a3a;font-size:13px;margin-top:32px">— El equipo de AdoptAR · adoptar.dpdns.org</p>
  </div>`;
}

/** Agradecimiento al donante cuando su pago queda acreditado */
export async function emailGraciasDonante(
  para: string,
  nombreCrudo: string,
  monto: number
) {
  const nombre = escaparHtml(nombreCrudo);
  await enviarEmail({
    para,
    asunto: "¡Gracias por tu donación! 💛",
    html: plantilla(
      `¡Gracias, ${nombre}!`,
      `Tu donación de $${monto.toLocaleString("es-AR")} ya está acreditada. ` +
        "Gracias a aportes como el tuyo los refugios pueden seguir rescatando, " +
        "curando y alimentando animales. Podés ver las campañas activas en " +
        '<a href="https://adoptar.dpdns.org/donaciones" style="color:#d95d28">adoptar.dpdns.org/donaciones</a>.'
    ),
  });
}

/** Aviso al refugio cuando una de sus campañas recibe una donación acreditada */
export async function emailDonacionRecibida(
  para: string,
  nombreRefugioCrudo: string,
  tituloCampanaCrudo: string,
  monto: number
) {
  const nombreRefugio = escaparHtml(nombreRefugioCrudo);
  const tituloCampana = escaparHtml(tituloCampanaCrudo);
  await enviarEmail({
    para,
    asunto: `Tu campaña "${tituloCampana}" recibió una donación 🎉`,
    html: plantilla(
      `¡Buenas noticias, ${nombreRefugio}!`,
      `Tu campaña <strong>${tituloCampana}</strong> recibió una donación de ` +
        `$${monto.toLocaleString("es-AR")} que ya está acreditada. ` +
        "Podés seguir lo recaudado desde tu panel en AdoptAR."
    ),
  });
}

/** Avisa a quien activó una alerta de tránsito que hay un animal nuevo cerca */
export async function emailAlertaTransito(
  para: string,
  animal: {
    nombre: string;
    especie: string;
    ciudad: string;
    provincia: string;
    descripcion: string;
    foto: string | null;
    slug: string;
  }
) {
  const nombre = escaparHtml(animal.nombre);
  const especie = escaparHtml(animal.especie);
  const lugar = escaparHtml([animal.ciudad, animal.provincia].filter(Boolean).join(", "));
  const descripcion = escaparHtml(animal.descripcion).slice(0, 600);
  const url = `https://adoptar.dpdns.org/animales/${animal.slug}`;
  const imagen = animal.foto
    ? `<img src="${escaparHtml(animal.foto)}" alt="${nombre}" style="width:100%;max-width:456px;border-radius:12px;margin:8px 0" />`
    : "";
  await enviarEmail({
    para,
    asunto: `🐾 ${nombre} necesita tránsito cerca tuyo`,
    html: plantilla(
      `${nombre} necesita un hogar de tránsito`,
      `Se publicó un animal en tránsito dentro de la zona que elegiste:<br><br>` +
        `<strong>${nombre}</strong> · ${especie} · 📍 ${lugar}` +
        imagen +
        `<br>${descripcion}<br><br>` +
        `<a href="${url}" style="display:inline-block;background:#d95d28;color:#fff;` +
        `padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:bold">` +
        `Ver la ficha completa →</a>` +
        `<br><br><span style="font-size:13px">Recibís este aviso porque activaste ` +
        `una alerta de tránsito. Podés desactivarla en ` +
        `<a href="https://adoptar.dpdns.org/transito/alertas" style="color:#d95d28">tus alertas</a>.</span>`
    ),
  });
}

/** Avisa al refugio/particular que alguien se postuló para adoptar un animal */
export async function emailNuevaPostulacion(
  para: string,
  datos: {
    animal: string;
    nombre: string;
    email: string;
    telefono: string | null;
    vivienda: string | null;
    mensaje: string;
  }
) {
  const animal = escaparHtml(datos.animal);
  const nombre = escaparHtml(datos.nombre);
  const correo = escaparHtml(datos.email);
  const telefono = datos.telefono ? escaparHtml(datos.telefono) : "—";
  const vivienda = datos.vivienda ? escaparHtml(datos.vivienda) : "—";
  const mensaje = escaparHtml(datos.mensaje).slice(0, 1500) || "—";
  await enviarEmail({
    para,
    asunto: `Nueva postulación para adoptar a ${animal} 🐾`,
    html: plantilla(
      `Alguien quiere adoptar a ${animal}`,
      `<strong>${nombre}</strong> se postuló para adoptar a ${animal}.<br><br>` +
        `📧 Email: ${correo}<br>` +
        `📞 Teléfono: ${telefono}<br>` +
        `🏠 Vivienda: ${vivienda}<br><br>` +
        `<em>Mensaje:</em><br>${mensaje}<br><br>` +
        `Podés gestionar las postulaciones desde tu panel en ` +
        `<a href="https://adoptar.dpdns.org/mi-refugio" style="color:#d95d28">Mi refugio</a>.`
    ),
  });
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
