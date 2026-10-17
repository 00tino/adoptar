// Proxy de Next.js 16 (antes "middleware"). Clerk intercepta acá las
// peticiones para manejar la sesión. Si no hay claves configuradas,
// se omite y la app funciona en modo demo.

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkActivo = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default clerkActivo
  ? clerkMiddleware()
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Solo estas páginas públicas pueden evitar la función cuando no hay contexto de sesión.
    "/((?!$|animales/?$|animales/(?:adoptar-|transito-)[a-z0-9-]+/?$|refugios/?$|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    { source: "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", has: [{ type: "header", key: "cookie" }] },
    { source: "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", has: [{ type: "header", key: "authorization" }] },
    { source: "/:path*", has: [{ type: "header", key: "x-clerk-auth-status" }] },
    { source: "/:path*", has: [{ type: "header", key: "x-clerk-request-data" }] },
    { source: "/:path*", has: [{ type: "header", key: "next-action" }] },
    // Retornos y sincronización de Clerk, incluidos los parámetros sin cookies.
    { source: "/:path*", has: [{ type: "query", key: "__clerk_handshake" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_db_jwt" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_synced" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_redirect_url" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_help" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_hs_reason" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_handshake_nonce" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_ticket" }] },
    { source: "/:path*", has: [{ type: "query", key: "__clerk_status" }] },
    { source: "/:path*", has: [{ type: "query", key: "__session" }] },
    { source: "/:path*", has: [{ type: "query", key: "suffixed_cookies" }] },
    { source: "/:path*", has: [{ type: "query", key: "__dev_session" }] },
    { source: "/:path*", has: [{ type: "query", key: "format" }] },
    "/(api|trpc)(.*)",
  ],
};
