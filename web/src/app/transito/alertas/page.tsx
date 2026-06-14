import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { usuarioActual } from "@/lib/auth";
import {
  misAlertas,
  alternarAlerta,
  borrarAlerta,
} from "@/lib/acciones-alertas";
import FormularioAlerta from "@/components/FormularioAlerta";

export const metadata: Metadata = {
  title: "Alertas de tránsito por cercanía",
  description:
    "Activá una alerta y recibí un email cada vez que se publique un animal que necesita hogar de tránsito cerca tuyo.",
  robots: { index: false },
};

// Centro aproximado por defecto (Buenos Aires) cuando el usuario aún no eligió.
const CENTRO_DEFECTO = { lat: -34.6037, lng: -58.3816, radioKm: 25 };

export default async function PaginaAlertasTransito() {
  const user = await usuarioActual();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-6xl">💛</p>
        <h1 className="mt-4 font-display text-3xl font-black">
          Alertas de tránsito por cercanía
        </h1>
        <p className="mt-3 text-tinta-suave">
          Iniciá sesión para activar una alerta y recibir un email cuando se
          publique un animal que necesita tránsito cerca tuyo.
        </p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <button className="rounded-xl bg-terracota text-blanco-calido px-6 py-3 font-bold hover:bg-terracota-oscuro transition-colors">
              Iniciar sesión
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const alertas = await misAlertas();
  const actual = alertas[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/transito" className="text-sm font-bold text-terracota hover:underline">
        ← Volver a tránsito
      </Link>
      <h1 className="mt-3 font-display text-4xl font-black">
        Alertas de tránsito por cercanía 💛
      </h1>
      <p className="mt-2 text-tinta-suave">
        Elegí tu zona y un radio. Cada vez que se publique un animal que necesita
        hogar de tránsito dentro de esa zona, te llega un email con todos sus
        datos.
      </p>

      {actual && (
        <div className="mt-6 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5">
          <p className="font-bold">
            {actual.activa ? "✅ Alerta activa" : "⏸️ Alerta pausada"}
          </p>
          <p className="text-sm text-tinta-suave">
            Radio de {actual.radioKm} km alrededor de la zona elegida.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <form action={alternarAlerta}>
              <input type="hidden" name="id" value={actual.id} />
              <input type="hidden" name="activa" value={String(!actual.activa)} />
              <button className="rounded-full border-2 border-crema-2 px-4 py-2 text-sm font-bold hover:border-tinta transition-colors">
                {actual.activa ? "Pausar" : "Reactivar"}
              </button>
            </form>
            <form action={borrarAlerta}>
              <input type="hidden" name="id" value={actual.id} />
              <button className="rounded-full border-2 border-crema-2 px-4 py-2 text-sm font-bold text-terracota hover:border-terracota transition-colors">
                Eliminar
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5 sm:p-6">
        <h2 className="font-display text-2xl font-black mb-4">
          {actual ? "Actualizar mi alerta" : "Crear mi alerta"}
        </h2>
        <FormularioAlerta
          latInicial={actual?.lat ?? CENTRO_DEFECTO.lat}
          lngInicial={actual?.lng ?? CENTRO_DEFECTO.lng}
          radioInicial={actual?.radioKm ?? CENTRO_DEFECTO.radioKm}
        />
      </div>
    </div>
  );
}
