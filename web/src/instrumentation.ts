// Hook oficial de Next.js para capturar errores del servidor (500s).
// Centraliza el monitoreo: antes los 500 solo quedaban en los logs crudos de
// Vercel; ahora pasan por `registrarError` con un formato uniforme.
// Docs: node_modules/next/dist/docs/01-app/.../instrumentation.md

import type { Instrumentation } from "next";
import { registrarError } from "./lib/monitoreo";

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const error = err as { message?: string; stack?: string; digest?: string };
  await registrarError({
    contexto: `${context.routeType}:${context.routePath}`,
    mensaje: error.message ?? String(err),
    stack: error.stack,
    ruta: request.path,
    metodo: request.method,
    digest: error.digest,
  });
};
