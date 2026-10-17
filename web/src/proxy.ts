// Proxy de Next.js 16 (antes "middleware"). Clerk intercepta acá las
// peticiones para manejar la sesión. Si no hay claves configuradas,
// se omite y la app funciona en modo demo.

import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";

const clerkActivo = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

let manejarClerk: Promise<NextMiddleware> | undefined;

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Esta marca solo puede originarse acá; nunca se acepta la enviada por un cliente.
  request.headers.delete("x-adoptar-visita-anonima");
  if (!clerkActivo) return NextResponse.next();

  const ruta = request.nextUrl.pathname;
  const publica = ["/", "/animales", "/refugios"].includes(ruta)
    || /^\/animales\/(?:adoptar-|transito-)[a-z0-9-]+$/.test(ruta);
  const ingresoClerk = [...request.nextUrl.searchParams.keys()]
    .some((clave) => clave.startsWith("__clerk") || clave === "__session" || clave === "suffixed_cookies" || clave === "__dev_session");
  if (request.method === "GET" && publica && !ingresoClerk
    && !request.headers.has("cookie") && !request.headers.has("authorization")) {
    const cabeceras = new Headers(request.headers);
    for (const nombre of [...cabeceras.keys()]) {
      if (nombre.startsWith("x-clerk-")) cabeceras.delete(nombre);
    }
    cabeceras.set("x-adoptar-visita-anonima", "1");
    return NextResponse.next({ request: { headers: cabeceras } });
  }

  manejarClerk ??= import("@clerk/nextjs/server").then(({ clerkMiddleware }) => clerkMiddleware());
  return (await manejarClerk)(request, event);
}

export const config = {
  matcher: [
    // Todas las rutas excepto archivos estáticos e internos de Next
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
