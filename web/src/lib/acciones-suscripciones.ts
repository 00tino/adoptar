"use server";

// Donación mensual con MercadoPago Suscripciones (preapproval, sin plan).
// El donante elige monto y causas; creamos un preapproval con su email y
// lo mandamos al checkout de MP. Los cobros recurrentes llegan al webhook
// como pagos con external_reference "sus:<id>" y generan filas en
// `donaciones`, así suman a las campañas y estadísticas existentes.

import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { campoTexto, limitarPorIp } from "./limites";
import { asegurarUsuario, exigirUsuarioActivo } from "./usuarios";
import { esCausa } from "./causas";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const URL_BASE = process.env.NEXT_PUBLIC_URL_BASE ?? "http://localhost:3000";

function clienteMp() {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error("Mercado Pago no está configurado todavía.");
  }
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

export interface Suscripcion {
  id: string;
  monto: number;
  causas: string[];
  estado: "pendiente" | "activa" | "pausada" | "cancelada";
  preapprovalId: string | null;
  creadoEl: string;
}

/** Lee las causas elegidas del formulario ("general" = donde más se necesite) */
function causasDeFormulario(formData: FormData): string[] {
  const crudas = formData.getAll("causas").map(String);
  if (crudas.includes("general")) return ["general"];
  const causas = [...new Set(crudas.filter(esCausa))];
  if (causas.length === 0) {
    throw new Error("Elegí al menos una causa (o «donde más se necesite»).");
  }
  return causas;
}

function montoDeFormulario(formData: FormData): number {
  const monto = Math.round(Number(formData.get("monto")));
  if (!Number.isFinite(monto) || monto < 500 || monto > 1_000_000) {
    throw new Error("El monto mensual tiene que estar entre $500 y $1.000.000.");
  }
  return monto;
}

/** Suscripción del usuario logueado (la más reciente no cancelada), o null */
export async function miSuscripcion(): Promise<Suscripcion | null> {
  const yo = await asegurarUsuario();
  if (!yo) return null;
  const sb = clienteServidor();
  const { data } = await sb
    .from("suscripciones")
    .select("*")
    .eq("usuario_id", yo.id)
    .neq("estado", "cancelada")
    .order("creado_el", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    monto: Number(data.monto),
    causas: Array.isArray(data.causas) ? data.causas : ["general"],
    estado: data.estado,
    preapprovalId: data.preapproval_id,
    creadoEl: data.creado_el,
  };
}

/** Crea la suscripción y redirige al checkout de MP para autorizarla */
export async function crearSuscripcion(formData: FormData) {
  await limitarPorIp("suscripcion", 10, 60);
  const yo = await exigirUsuarioActivo();
  const monto = montoDeFormulario(formData);
  const causas = causasDeFormulario(formData);

  const sb = clienteServidor();
  const existente = await miSuscripcion();
  if (existente && existente.estado !== "pendiente") {
    throw new Error("Ya tenés una donación mensual activa. Podés cambiarla desde acá.");
  }

  // Limpiamos intentos pendientes abandonados (creados pero nunca autorizados,
  // sin ningún cobro): así no se acumulan ni confunden el estado de "Mi donación".
  await sb
    .from("suscripciones")
    .update({ estado: "cancelada", actualizado_el: new Date().toISOString() })
    .eq("usuario_id", yo.id)
    .eq("estado", "pendiente");

  // Fila propia primero, para tener el id como external_reference
  const { data: fila, error } = await sb
    .from("suscripciones")
    .insert({ usuario_id: yo.id, monto, causas, estado: "pendiente" })
    .select("id")
    .single();
  if (error) throw new Error(`No pudimos crear la suscripción: ${error.message}`);

  const preapproval = await new PreApproval(clienteMp()).create({
    body: {
      reason: "Donación mensual a AdoptAR 🐾",
      external_reference: `sus:${fila.id}`,
      payer_email: yo.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: monto,
        currency_id: "ARS",
      },
      back_url: `${URL_BASE}/donaciones/mensual?resultado=gracias`,
      status: "pending",
    },
  });

  if (!preapproval.id || !preapproval.init_point) {
    throw new Error("No pudimos iniciar la suscripción en Mercado Pago.");
  }
  await sb
    .from("suscripciones")
    .update({ preapproval_id: preapproval.id })
    .eq("id", fila.id);

  redirect(preapproval.init_point);
}

/** Cambia el monto y/o las causas de la suscripción activa */
export async function cambiarSuscripcion(formData: FormData) {
  await limitarPorIp("suscripcion", 10, 60);
  await exigirUsuarioActivo();
  const sus = await miSuscripcion();
  if (!sus?.preapprovalId) throw new Error("No tenés una donación mensual activa.");

  const monto = montoDeFormulario(formData);
  const causas = causasDeFormulario(formData);

  if (monto !== sus.monto) {
    await new PreApproval(clienteMp()).update({
      id: sus.preapprovalId,
      body: {
        auto_recurring: {
          transaction_amount: monto,
          currency_id: "ARS",
        },
      },
    });
  }

  const sb = clienteServidor();
  const { error } = await sb
    .from("suscripciones")
    .update({ monto, causas, actualizado_el: new Date().toISOString() })
    .eq("id", sus.id);
  if (error) throw new Error(error.message);

  redirect("/donaciones/mensual?resultado=cambiada");
}

/** Cancela la suscripción en MP y en nuestra base */
export async function cancelarSuscripcion() {
  await limitarPorIp("suscripcion", 10, 60);
  await exigirUsuarioActivo();
  const sus = await miSuscripcion();
  if (!sus) throw new Error("No tenés una donación mensual activa.");

  if (sus.preapprovalId) {
    // Best-effort: si el preapproval estaba pendiente/incompleto y MP rechaza
    // la cancelación, igual marcamos la fila local como cancelada para que el
    // usuario nunca quede trabado con una suscripción que no autorizó.
    try {
      await new PreApproval(clienteMp()).update({
        id: sus.preapprovalId,
        body: { status: "cancelled" },
      });
    } catch (e) {
      console.error("No se pudo cancelar el preapproval en MP:", e);
    }
  }
  const sb = clienteServidor();
  await sb
    .from("suscripciones")
    .update({ estado: "cancelada", actualizado_el: new Date().toISOString() })
    .eq("id", sus.id);

  redirect("/donaciones/mensual?resultado=cancelada");
}

// ---------- Usado por el webhook (sin sesión) ----------

/** Sincroniza el estado local cuando MP avisa un cambio en el preapproval */
export async function sincronizarPreapproval(preapprovalId: string) {
  const preapproval = await new PreApproval(clienteMp())
    .get({ id: preapprovalId })
    .catch(() => null);
  if (!preapproval?.id) return;

  const estado =
    preapproval.status === "authorized" ? "activa"
    : preapproval.status === "paused" ? "pausada"
    : preapproval.status === "cancelled" ? "cancelada"
    : "pendiente";

  const sb = clienteServidor();
  await sb
    .from("suscripciones")
    .update({ estado, actualizado_el: new Date().toISOString() })
    .eq("preapproval_id", preapproval.id);
}

/**
 * Registra un cobro recurrente acreditado: crea filas en `donaciones`
 * repartiendo el monto entre las causas de la suscripción (las causas sin
 * campañas activas, o "general", van a Plataforma). Idempotente por pago.
 */
export async function registrarCobroSuscripcion(
  suscripcionId: string,
  pagoId: string,
  total: number
) {
  const sb = clienteServidor();

  // Dedupe: si el pago ya generó filas, no lo repetimos
  const { count } = await sb
    .from("donaciones")
    .select("id", { count: "exact", head: true })
    .eq("mp_pago_id", pagoId);
  if ((count ?? 0) > 0) return;

  const { data: sus } = await sb
    .from("suscripciones")
    .select("causas,usuario_id,usuarios(nombre)")
    .eq("id", suscripcionId)
    .maybeSingle();
  if (!sus) return;
  const causas: string[] = Array.isArray(sus.causas) ? sus.causas : ["general"];
  const usuario = Array.isArray(sus.usuarios) ? sus.usuarios[0] : sus.usuarios;
  const donorNombre =
    campoTexto((usuario as { nombre?: string } | null)?.nombre, 80) || null;

  const { data: activas } = await sb
    .from("campanas")
    .select("id,causa")
    .eq("estado", "activa");
  const porCausa = new Map<string, string[]>();
  for (const c of activas ?? []) {
    const causa = c.causa ?? "plataforma";
    porCausa.set(causa, [...(porCausa.get(causa) ?? []), c.id]);
  }
  const plataforma = porCausa.get("plataforma") ?? [];

  const reparto = (monto: number, partes: number) => {
    const base = Math.floor(monto / partes);
    const resto = monto - base * partes;
    return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
  };

  const filas: Record<string, unknown>[] = [];
  const porCausaElegida = reparto(Math.round(total), causas.length);
  causas.forEach((causa, i) => {
    const destinos =
      causa !== "general" && porCausa.get(causa)?.length
        ? { ids: porCausa.get(causa)!, causa }
        : { ids: plataforma.length ? plataforma : (activas ?? []).map((c) => c.id), causa: "plataforma" };
    // Sin ninguna campaña activa, el cobro queda "en caja" para su causa
    if (destinos.ids.length === 0) {
      filas.push({
        campana_id: null,
        donor_nombre: donorNombre,
        monto: porCausaElegida[i],
        metodo: "mercadopago",
        anonima: !donorNombre,
        estado: "acreditada",
        causa: causa === "general" ? "plataforma" : causa,
        mp_pago_id: pagoId,
      });
      return;
    }
    reparto(porCausaElegida[i], destinos.ids.length).forEach((monto, j) => {
      if (monto === 0) return;
      filas.push({
        campana_id: destinos.ids[j],
        donor_nombre: donorNombre,
        monto,
        metodo: "mercadopago",
        anonima: !donorNombre,
        estado: "acreditada",
        causa: destinos.causa,
        mp_pago_id: pagoId,
      });
    });
  });

  if (filas.length > 0) await sb.from("donaciones").insert(filas);
}
