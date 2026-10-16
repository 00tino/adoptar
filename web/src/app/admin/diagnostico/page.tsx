import type { Metadata } from "next";
import { usuarioActual } from "@/lib/auth";
import FormularioDiagnostico from "./FormularioDiagnostico";

export const metadata: Metadata = { title: "Pruebas de servicios — Admin", robots: { index: false, follow: false } };

export default async function PaginaDiagnostico() {
  const usuario = await usuarioActual();
  const correo = process.env.GMAIL_APP_PASSWORD ? "Gmail SMTP configurado" : process.env.RESEND_API_KEY ? "Resend configurado" : "Sin proveedor de correo";
  const monitoreo = process.env.ERROR_WEBHOOK_URL ? "Webhook configurado" : process.env.ERROR_ALERT_EMAIL ? "Alertas por email configuradas" : "Sin destino de monitoreo";
  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">Pruebas de servicios</h2>
      <p className="mt-3 text-tinta-suave">{correo} · {monitoreo}</p>
      <p className="mt-2 text-sm text-tinta-suave">La aceptación del proveedor se comprueba por separado de la recepción del mensaje.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <FormularioDiagnostico tipo="correo" titulo="Correo real" emailInicial={usuario?.primaryEmailAddress?.emailAddress ?? ""} />
        <FormularioDiagnostico tipo="monitoreo" titulo="Aviso de monitoreo" />
      </div>
    </div>
  );
}
