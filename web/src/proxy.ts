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
    // Todas las rutas excepto archivos estáticos e internos de Next
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
