// Webhook de Mercado Pago: nos avisa cuando un pago se aprueba y
// marcamos la donación como "acreditada" (suma a la barra de progreso).
// Además agradecemos al donante por email y avisamos al refugio.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import {
  registrarCobroSuscripcion,
  sincronizarPreapproval,
} from "@/lib/acciones-suscripciones";
import { emailDonacionRecibida, emailGraciasDonante } from "@/lib/emails";
import { crearNotificacion } from "@/lib/notificaciones";

/**
 * Valida la firma del webhook (header `x-signature`).
 * El secret se obtiene en el panel de MP: Tus integraciones → tu aplicación
 * → Webhooks → "Clave secreta", y va en la env MP_WEBHOOK_SECRET (Vercel).
 * Formato del header: "ts=<timestamp>,v1=<hmac>"; el HMAC-SHA256 se calcula
 * sobre el manifest "id:<data.id en minúsculas>;request-id:<x-request-id>;ts:<ts>;"
 * Si el secret no está configurado, logueamos y seguimos (como antes).
 */
function firmaValida(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "MP_WEBHOOK_SECRET no configurado: el webhook acepta sin validar la firma."
    );
    return true;
  }
  const firma = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const partes = new Map(
    firma.split(",").map((p) => p.trim().split("=", 2) as [string, string])
  );
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  } catch {
    return false;
  }
}

interface FilaAcreditada {
  donor_nombre: string | null;
  monto: number;
  campanas: {
    titulo?: string;
    refugios?: { nombre?: string; email?: string | null; usuario_id?: string | null } | null;
  } | null;
}

/** Agradece al donante y avisa a los refugios de las campañas que recibieron */
async function notificarAcreditadas(
  filas: FilaAcreditada[],
  emailDonante: string | null
) {
  if (filas.length === 0) return;

  // Un solo email de gracias por el total (aunque el pago se reparta en filas)
  const total = filas.reduce((suma, f) => suma + Number(f.monto), 0);
  const nombreDonante = filas[0].donor_nombre;
  if (emailDonante && nombreDonante) {
    await emailGraciasDonante(emailDonante, nombreDonante, total);
  }

  // Aviso por campaña al refugio dueño (acumulando si recibió varias filas)
  const porCampana = new Map<
    string,
    { monto: number; refugio: NonNullable<FilaAcreditada["campanas"]>["refugios"] }
  >();
  for (const f of filas) {
    const campana = Array.isArray(f.campanas) ? f.campanas[0] : f.campanas;
    if (!campana?.titulo) continue;
    const reg = porCampana.get(campana.titulo) ?? { monto: 0, refugio: campana.refugios };
    reg.monto += Number(f.monto);
    porCampana.set(campana.titulo, reg);
  }
  for (const [titulo, { monto, refugio }] of porCampana) {
    const r = Array.isArray(refugio) ? refugio[0] : refugio;
    if (!r) continue;
    if (r.email && r.nombre) {
      await emailDonacionRecibida(r.email, r.nombre, titulo, monto);
    }
    await crearNotificacion(
      r.usuario_id ?? null,
      "donacion",
      `Tu campaña "${titulo}" recibió una donación de $${monto.toLocaleString("es-AR")} 💛`
    );
  }
}

const SELECT_ACREDITADA =
  "donor_nombre,monto,campanas(titulo,refugios(nombre,email,usuario_id))";

export async function POST(req: NextRequest) {
  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const cuerpo = await req.json().catch(() => null);
  const pagoId = cuerpo?.data?.id;

  if (pagoId && !firmaValida(req, String(pagoId))) {
    return NextResponse.json({ ok: false, error: "firma inválida" }, { status: 401 });
  }

  // Cambios de estado de una suscripción (autorizada, pausada, cancelada)
  if (cuerpo?.type === "subscription_preapproval" && pagoId) {
    await sincronizarPreapproval(String(pagoId));
    return NextResponse.json({ ok: true });
  }

  if (cuerpo?.type !== "payment" || !pagoId) {
    return NextResponse.json({ ok: true }); // evento que no nos interesa
  }

  // Consultamos el pago directo a MP (nunca confiamos en el cuerpo del webhook)
  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const pago = await new Payment(mp).get({ id: pagoId }).catch(() => null);
  if (!pago) return NextResponse.json({ ok: true });

  if (pago.status === "approved" && pago.external_reference) {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const ref = pago.external_reference;
    const emailDonante = pago.payer?.email ?? null;

    if (ref.startsWith("sus:")) {
      // Cobro recurrente de una donación mensual: genera filas en donaciones
      await registrarCobroSuscripcion(
        ref.slice("sus:".length),
        String(pago.id),
        Number(pago.transaction_amount ?? 0)
      );
    } else if (ref.startsWith("grupo:")) {
      // Checkout multi-causa: acredita todas las filas del grupo
      const grupoId = ref.slice("grupo:".length);
      const { data } = await sb
        .from("donaciones")
        .update({ estado: "acreditada" })
        .eq("grupo_id", grupoId)
        .neq("estado", "acreditada")
        .select(SELECT_ACREDITADA);
      await notificarAcreditadas((data ?? []) as unknown as FilaAcreditada[], emailDonante);
    } else {
      const { data } = await sb
        .from("donaciones")
        .update({ estado: "acreditada" })
        .eq("id", ref)
        .neq("estado", "acreditada")
        .select(SELECT_ACREDITADA);
      await notificarAcreditadas((data ?? []) as unknown as FilaAcreditada[], emailDonante);
    }
  }

  return NextResponse.json({ ok: true });
}
