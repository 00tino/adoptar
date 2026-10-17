import { after, NextResponse } from "next/server";
import { obtenerCampanasActivas } from "@/lib/datos";
import { registrarError } from "@/lib/monitoreo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ campanas: await obtenerCampanasActivas(2) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    after(async () => {
      await registrarError({ contexto: "api:campanas-publicas", mensaje: error instanceof Error ? error.message : String(error), ruta: "/api/campanas-publicas", metodo: "GET" });
    });
    return NextResponse.json({ error: "No pudimos consultar las campañas." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
