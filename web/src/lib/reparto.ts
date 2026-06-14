// Reparto entero de un monto en N partes lo más parejo posible, sin perder ni
// inventar centavos: las primeras `resto` partes reciben un peso extra.
// Usado para distribuir un cobro entre causas/campañas (ver acciones-suscripciones).
export function repartir(monto: number, partes: number): number[] {
  if (partes <= 0) return [];
  const base = Math.floor(monto / partes);
  const resto = monto - base * partes;
  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}
