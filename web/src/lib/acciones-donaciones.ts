"use server";

// Donaciones con Mercado Pago Checkout Pro.
// Flujo: el donante elige monto → creamos una "preferencia" de pago →
// lo mandamos al checkout de Mercado Pago → al volver registramos el estado.
// Si MP_ACCESS_TOKEN no está configurado, el botón de MP queda oculto
// y solo se ofrece transferencia bancaria.

import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { campoTexto, limitarPorIp } from "./limites";
import { CAUSAS, esCausa, nombreCausa, type CausaId } from "./causas";

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

// ---------- Donación por causa (multi-selección) ----------

/** Cuántas campañas activas tiene cada causa (para las tarjetas de la UI) */
export async function campanasActivasPorCausa(): Promise<Record<string, number>> {
  const sb = clienteServidor();
  const { data } = await sb.from("campanas").select("causa").eq("estado", "activa");
  const conteo: Record<string, number> = {};
  for (const c of CAUSAS) conteo[c.id] = 0;
  for (const f of data ?? []) {
    const causa = (f as { causa?: string }).causa ?? "plataforma";
    conteo[causa] = (conteo[causa] ?? 0) + 1;
  }
  return conteo;
}

/** Reparte `monto` en partes enteras casi iguales (el resto va a las primeras) */
function repartirEntero(monto: number, partes: number): number[] {
  const base = Math.floor(monto / partes);
  const resto = monto - base * partes;
  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}

/**
 * Donación a una o varias causas en un solo checkout de Mercado Pago.
 * El donante elige partes iguales o un monto por causa. Acá solo se
 * registran filas pendientes; el webhook las acredita cuando MP confirma.
 */
export async function donarPorCausas(formData: FormData) {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error("Mercado Pago no está configurado todavía.");
  }
  await limitarPorIp("donar", 10, 10);

  const causasElegidas = [
    ...new Set(formData.getAll("causas").map(String).filter(esCausa)),
  ];
  if (causasElegidas.length === 0) {
    throw new Error("Elegí al menos una causa.");
  }

  const donorNombre = campoTexto(formData.get("donor_nombre"), 80) || null;
  const modo = String(formData.get("modo")) === "montos" ? "montos" : "iguales";

  // Monto por causa: partes iguales del total, o lo que puso en cada input
  const montosPorCausa = new Map<CausaId, number>();
  if (modo === "iguales") {
    const total = Math.round(Number(formData.get("monto")));
    if (!Number.isFinite(total) || total < 100 || total > 10_000_000) {
      throw new Error("El monto tiene que estar entre $100 y $10.000.000.");
    }
    repartirEntero(total, causasElegidas.length).forEach((m, i) =>
      montosPorCausa.set(causasElegidas[i], m)
    );
  } else {
    let total = 0;
    for (const causa of causasElegidas) {
      const monto = Math.round(Number(formData.get(`monto_${causa}`)));
      if (!Number.isFinite(monto) || monto < 100) {
        throw new Error(`Poné al menos $100 para ${nombreCausa(causa)}.`);
      }
      montosPorCausa.set(causa, monto);
      total += monto;
    }
    if (total > 10_000_000) {
      throw new Error("El total no puede superar los $10.000.000.");
    }
  }

  // Campañas activas agrupadas por causa
  const sb = clienteServidor();
  const { data: activas } = await sb
    .from("campanas")
    .select("id,causa")
    .eq("estado", "activa");
  const porCausa = new Map<string, string[]>();
  for (const c of activas ?? []) {
    const causa = c.causa ?? "plataforma";
    porCausa.set(causa, [...(porCausa.get(causa) ?? []), c.id]);
  }

  // Una fila de donación por campaña destino, agrupadas por grupo_id.
  // Si la causa no tiene campañas activas, la fila queda "en caja"
  // (campana_id null) hasta que el admin la reasigne a una campaña nueva.
  const grupoId = randomUUID();
  const filas: Record<string, unknown>[] = [];
  for (const causa of causasElegidas) {
    const destinos = porCausa.get(causa) ?? [];
    if (destinos.length === 0) {
      filas.push({
        campana_id: null,
        donor_nombre: donorNombre,
        monto: montosPorCausa.get(causa)!,
        metodo: "mercadopago",
        anonima: !donorNombre,
        estado: "pendiente",
        causa,
        grupo_id: grupoId,
      });
      continue;
    }
    repartirEntero(montosPorCausa.get(causa)!, destinos.length).forEach(
      (monto, i) => {
        if (monto === 0) return;
        filas.push({
          campana_id: destinos[i],
          donor_nombre: donorNombre,
          monto,
          metodo: "mercadopago",
          anonima: !donorNombre,
          estado: "pendiente",
          causa,
          grupo_id: grupoId,
        });
      }
    );
  }

  const { error } = await sb.from("donaciones").insert(filas);
  if (error) throw new Error(`No pudimos registrar la donación: ${error.message}`);

  const total = [...montosPorCausa.values()].reduce((a, b) => a + b, 0);
  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preferencia = await new Preference(mp).create({
    body: {
      items: [
        {
          id: grupoId,
          title: `Donación a AdoptAR — ${causasElegidas
            .map((c) => nombreCausa(c))
            .join(", ")}`,
          quantity: 1,
          unit_price: total,
          currency_id: "ARS",
        },
      ],
      external_reference: `grupo:${grupoId}`,
      back_urls: {
        success: `${URL_BASE}/donaciones?resultado=gracias`,
        failure: `${URL_BASE}/donaciones?resultado=error`,
        pending: `${URL_BASE}/donaciones?resultado=pendiente`,
      },
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
