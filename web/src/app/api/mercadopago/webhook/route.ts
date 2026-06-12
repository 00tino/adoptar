// Webhook de Mercado Pago: nos avisa cuando un pago se aprueba y
// marcamos la donación como "acreditada" (suma a la barra de progreso).

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import {
  registrarCobroSuscripcion,
  sincronizarPreapproval,
} from "@/lib/acciones-suscripciones";

export async function POST(req: NextRequest) {
  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const cuerpo = await req.json().catch(() => null);
  const pagoId = cuerpo?.data?.id;

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
    if (ref.startsWith("sus:")) {
      // Cobro recurrente de una donación mensual: genera filas en donaciones
      await registrarCobroSuscripcion(
        ref.slice("sus:".length),
        String(pago.id),
        Number(pago.transaction_amount ?? 0)
      );
    } else if (ref.startsWith("grupo:")) {
      // Checkout multi-causa: acredita todas las filas del grupo
      await sb
        .from("donaciones")
        .update({ estado: "acreditada" })
        .eq("grupo_id", ref.slice("grupo:".length));
    } else {
      await sb.from("donaciones").update({ estado: "acreditada" }).eq("id", ref);
    }
  }

  return NextResponse.json({ ok: true });
}
