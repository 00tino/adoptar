// Monitoreo de errores propio, sin dependencias ni costo.
// Agrupa los errores 500 con un prefijo reconocible para poder filtrarlos en
// los logs de Vercel (buscar "[ERROR500]"). Si algún día se quiere Sentry u
// otro proveedor, basta con setear ERROR_WEBHOOK_URL (p. ej. un webhook de
// Slack/Discord o el endpoint de ingestión) y los errores se reenvían ahí.

interface DatosError {
  contexto: string;
  mensaje: string;
  stack?: string;
  ruta?: string;
  metodo?: string;
  digest?: string;
}

const ultimosAvisosCorreo = new Map<string, number>();

/** Registra un error 500 de forma estructurada (y opcionalmente lo reenvía). */
export async function registrarError(datos: DatosError): Promise<boolean> {
  const registro = {
    nivel: "error",
    ts: new Date().toISOString(),
    ...datos,
  };
  // Una sola línea JSON con prefijo: fácil de buscar/agrupar en Vercel.
  console.error("[ERROR500]", JSON.stringify(registro));

  // Reenvío opcional a un proveedor externo (gratis: webhook de Slack/Discord).
  const url = process.env.ERROR_WEBHOOK_URL;
  if (url) {
    try {
      const mensaje = `🛑 *${registro.contexto}* — ${registro.mensaje}${
        registro.ruta ? `\nRuta: ${registro.metodo ?? ""} ${registro.ruta}` : ""
      }`;
      const host = new URL(url).hostname;
      const discord = host === "discord.com" || host.endsWith(".discord.com") || host === "discordapp.com";
      const respuesta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discord ? { content: mensaje.slice(0, 2000), allowed_mentions: { parse: [] } } : { text: mensaje }),
        signal: AbortSignal.timeout(5000),
      });
      if (!respuesta.ok) console.error("[ERROR500] Webhook de monitoreo rechazado:", respuesta.status);
      return respuesta.ok;
    } catch {
      // El monitoreo nunca debe romper la request.
      return false;
    }
  }

  const para = process.env.ERROR_ALERT_EMAIL;
  if (!para || process.env.NEXT_RUNTIME !== "nodejs") return false;
  // Protección básica ante ráfagas; en Vercel el límite es por instancia.
  const ahora = Date.now();
  const anterior = ultimosAvisosCorreo.get(datos.contexto);
  if (anterior != null && ahora - anterior < 15 * 60_000) return false;
  if (ultimosAvisosCorreo.size >= 1000) ultimosAvisosCorreo.clear();
  ultimosAvisosCorreo.set(datos.contexto, ahora);
  try {
    const { enviarEmail, escaparHtml } = await import("./emails");
    const enviado = await enviarEmail({
      para,
      asunto: `[AdoptAR] ${datos.contexto.slice(0, 100)}`,
      html: `<h1>Alerta de AdoptAR</h1><p>${escaparHtml(datos.contexto)}</p>` +
        `<p>${escaparHtml(datos.mensaje.slice(0, 1000))}</p>` +
        `<p>Ruta: ${escaparHtml((datos.ruta ?? "").split("?")[0])}</p>` +
        `<p>${registro.ts}</p><p>Los errores repetidos del mismo contexto se agrupan durante 15 minutos por instancia.</p>`,
    });
    if (!enviado) ultimosAvisosCorreo.delete(datos.contexto);
    return enviado;
  } catch {
    ultimosAvisosCorreo.delete(datos.contexto);
    return false;
  }
}
