import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import { clerkDisponible, usuarioActual } from "@/lib/auth";
import { supabaseDisponible } from "@/lib/supabase";
import {
  cancelarSuscripcion,
  miSuscripcion,
  sincronizarPreapproval,
} from "@/lib/acciones-suscripciones";
import { mercadoPagoDisponible } from "@/lib/acciones-donaciones";
import { nombreCausa } from "@/lib/causas";
import FormSuscripcion from "@/components/FormSuscripcion";
import BotonEnvio from "@/components/BotonEnvio";

export const metadata: Metadata = {
  title: "Donación mensual",
  description:
    "Sumate como donante mensual de AdoptAR: elegís el monto y la causa, y ayudás todos los meses a los refugios argentinos.",
};

const etiquetaEstado: Record<string, string> = {
  activa: "💚 Activa",
  pausada: "⏸️ Pausada en Mercado Pago",
};

export default async function PaginaDonacionMensual({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { resultado } = await searchParams;
  const listo =
    clerkDisponible() && supabaseDisponible() && (await mercadoPagoDisponible());
  const usuario = listo ? await usuarioActual() : null;
  let suscripcion = usuario ? await miSuscripcion() : null;

  // Si la suscripción quedó "pendiente" pero ya tiene preapproval en MP,
  // sincronizamos su estado real al vuelo (al volver del checkout). Así no
  // dependemos de que llegue el webhook para mostrarla activa: MP no siempre
  // notifica la autorización del preapproval, solo los cobros mensuales.
  if (suscripcion?.estado === "pendiente" && suscripcion.preapprovalId) {
    await sincronizarPreapproval(suscripcion.preapprovalId);
    suscripcion = await miSuscripcion();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {resultado === "gracias" && (
        <div className="mb-6 rounded-2xl bg-salvia p-6 text-center font-bold text-blanco-calido">
          💚 ¡Gracias! Tu donación mensual quedó configurada.
        </div>
      )}
      {resultado === "cambiada" && (
        <div className="mb-6 rounded-2xl bg-salvia p-6 text-center font-bold text-blanco-calido">
          Cambios guardados.
        </div>
      )}
      {resultado === "cancelada" && (
        <div className="mb-6 rounded-2xl bg-crema-2 p-6 text-center font-bold">
          Tu donación mensual quedó cancelada. ¡Gracias por haber ayudado! 🐾
        </div>
      )}

      <h1 className="font-display text-4xl font-black">Donación mensual 💙</h1>
      <p className="mt-2 max-w-2xl text-tinta-suave">
        Un aporte chico todos los meses sostiene cirugías, alimento y rescates
        de forma constante — es la ayuda que más le sirve a los refugios.
      </p>

      {!listo ? (
        <p className="mt-8 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-6 text-tinta-suave">
          La donación mensual no está disponible todavía.
        </p>
      ) : !usuario ? (
        <div className="mt-8 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-8 text-center">
          <p className="font-bold">
            Iniciá sesión para configurar tu donación mensual
          </p>
          <p className="mt-1 text-sm text-tinta-suave">
            Así después podés cambiar el monto o cancelarla vos.
          </p>
          <SignInButton mode="modal">
            <button className="mt-4 rounded-full border-2 border-tinta px-6 py-2.5 font-bold text-tinta transition-colors hover:bg-tinta hover:text-crema">
              Ingresar
            </button>
          </SignInButton>
        </div>
      ) : suscripcion && suscripcion.estado !== "pendiente" ? (
        <section className="mt-8">
          <div className="rounded-2xl border-2 border-salvia bg-salvia/10 p-6">
            <h2 className="font-display text-2xl font-bold">Mi donación mensual</h2>
            <p className="mt-2">
              {etiquetaEstado[suscripcion.estado] ?? suscripcion.estado} —{" "}
              <strong>${suscripcion.monto.toLocaleString("es-AR")} por mes</strong>
            </p>
            <p className="mt-1 text-sm text-tinta-suave">
              Destino:{" "}
              {suscripcion.causas
                .map((c) => (c === "general" ? "💛 Donde más se necesite" : nombreCausa(c)))
                .join(", ")}
            </p>
          </div>

          <h2 className="mt-10 font-display text-2xl font-bold">
            Cambiar monto o causa
          </h2>
          <div className="mt-4">
            <FormSuscripcion
              editar
              montoInicial={suscripcion.monto}
              causasIniciales={suscripcion.causas}
            />
          </div>

          <form action={cancelarSuscripcion} className="mt-10">
            <BotonEnvio
              textoEnviando="Cancelando…"
              className="rounded-full border-2 border-terracota px-6 py-2.5 text-sm font-bold text-terracota transition-colors hover:bg-terracota hover:text-blanco-calido"
            >
              Cancelar mi donación mensual
            </BotonEnvio>
          </form>
        </section>
      ) : (
        <div className="mt-8">
          {/* Suscripción "pendiente": se creó pero nunca se autorizó en MP,
              así que NO hubo ningún cobro. La aclaramos y dejamos retomar o descartar. */}
          {suscripcion?.estado === "pendiente" && (
            <div className="mb-8 rounded-2xl border-2 border-sol/60 bg-sol/10 p-6">
              <h2 className="font-display text-xl font-bold">
                ⏳ Tenés una donación mensual a medias
              </h2>
              <p className="mt-1 text-sm text-tinta-suave">
                La empezaste por{" "}
                <strong>${suscripcion.monto.toLocaleString("es-AR")} por mes</strong>{" "}
                pero no llegaste a autorizarla en Mercado Pago, así que{" "}
                <strong>no se hizo ningún cobro</strong>. Podés volver a intentarlo
                acá abajo, o descartarla.
              </p>
              <form action={cancelarSuscripcion} className="mt-4">
                <BotonEnvio
                  textoEnviando="Descartando…"
                  className="rounded-full border-2 border-terracota px-5 py-2 text-sm font-bold text-terracota transition-colors hover:bg-terracota hover:text-blanco-calido"
                >
                  Descartar y empezar de cero
                </BotonEnvio>
              </form>
            </div>
          )}
          <FormSuscripcion
            montoInicial={suscripcion?.monto}
            causasIniciales={suscripcion?.causas}
          />
        </div>
      )}
    </div>
  );
}
