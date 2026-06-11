"use server";

// Donaciones con Mercado Pago Checkout Pro.
// Flujo: el donante elige monto → creamos una "preferencia" de pago →
// lo mandamos al checkout de Mercado Pago → al volver registramos el estado.
// Si MP_ACCESS_TOKEN no está configurado, el botón de MP queda oculto
// y solo se ofrece transferencia bancaria.

import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { campoTexto, limitarPorIp } from "./limites";

export async function mercadoPagoDisponible(): Promise<boolean> {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE ?? "http://localhost:3000";

/** Crea la preferencia de pago y redirige al checkout de Mercado Pago */
export async function donarConMercadoPago(formData: FormData) {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error("Mercado Pago no está configurado todavía.");
  }

  await limitarPorIp("donar", 10, 10); // máx 10 intentos / 10 min por IP

  const campanaId = String(formData.get("campana_id"));
  const monto = Math.round(Number(formData.get("monto")));
  const donorNombre = campoTexto(formData.get("donor_nombre"), 80) || null;
  const anonima = !donorNombre;
  if (!campanaId || !Number.isFinite(monto) || monto < 100 || monto > 10_000_000) {
    throw new Error("El monto tiene que estar entre $100 y $10.000.000.");
  }

  const sb = clienteServidor();
  const { data: campana } = await sb
    .from("campanas")
    .select("id,titulo")
    .eq("id", campanaId)
    .eq("estado", "activa")
    .single();
  if (!campana) throw new Error("La campaña no existe o no está activa.");

  // Registramos la donación como pendiente; se acredita cuando MP confirma
  const { data: donacion, error } = await sb
    .from("donaciones")
    .insert({
      campana_id: campanaId,
      donor_nombre: donorNombre,
      monto,
      metodo: "mercadopago",
      anonima,
      estado: "pendiente",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preferencia = await new Preference(mp).create({
    body: {
      items: [
        {
          id: donacion.id,
          title: `Donación: ${campana.titulo} — AdoptAR`,
          quantity: 1,
          unit_price: monto,
          currency_id: "ARS",
        },
      ],
      external_reference: donacion.id,
      back_urls: {
        success: `${URL_BASE}/donaciones?resultado=gracias`,
        failure: `${URL_BASE}/donaciones?resultado=error`,
        pending: `${URL_BASE}/donaciones?resultado=pendiente`,
      },
      // MP solo acepta auto_return y webhooks con URLs públicas (https).
      // En desarrollo local se omiten; al desplegar en Vercel se activan solos.
      ...(URL_BASE.startsWith("https")
        ? {
            auto_return: "approved",
            notification_url: `${URL_BASE}/api/mercadopago/webhook`,
          }
        : {}),
    },
  });

  if (!preferencia.init_point) throw new Error("No pudimos iniciar el pago.");
  redirect(preferencia.init_point);
}
