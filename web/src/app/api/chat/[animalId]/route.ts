// Endpoint estable para el polling del chat.
// El componente `ChatAnimal` refresca los mensajes cada pocos segundos. Antes
// lo hacía con una server action, pero el id de las server actions cambia en
// cada deploy: las pestañas abiertas quedaban pegándole a un id viejo y tiraban
// `404 Failed to find Server Action` en loop. Un Route Handler tiene una URL
// fija que sobrevive a los deploys, así que el polling se recupera solo.

import { NextResponse } from "next/server";
import { obtenerMensajes } from "@/lib/acciones-chat";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ animalId: string }> }
) {
  const { animalId } = await params;
  try {
    const mensajes = await obtenerMensajes(animalId);
    return NextResponse.json({ mensajes });
  } catch {
    // Sin sesión o sin red: no rompemos el polling, devolvemos vacío.
    return NextResponse.json({ mensajes: [] });
  }
}
