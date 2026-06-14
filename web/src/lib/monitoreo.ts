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

/** Registra un error 500 de forma estructurada (y opcionalmente lo reenvía). */
export async function registrarError(datos: DatosError): Promise<void> {
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
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🛑 *${registro.contexto}* — ${registro.mensaje}${
            registro.ruta ? `\nRuta: ${registro.metodo ?? ""} ${registro.ruta}` : ""
          }`,
        }),
      });
    } catch {
      // El monitoreo nunca debe romper la request.
    }
  }
}
