// Modo vitrina: la plataforma todavía no tiene refugios reales.
// Los perfiles de ejemplo se dejan para mostrar cómo se ve una ficha.
// Lo que sí se esconde: datos de prueba sucios (berlin, GLASS, ",m").

export function modoVitrina(): boolean {
  const flag = process.env.NEXT_PUBLIC_MODO_VITRINA;
  if (flag === "0" || flag === "false") return false;
  return true;
}

const ciudadesBasura = /\bberlin\b|\btestville\b|\basdf\b/i;
const nombresBasura = /\bprueba\b|\btest\b|\bpelusa\b/i;
const fotosBasura = /glass|cockpit|unsplash\.com\/photo-1555685812/i;

export function esFotoBasura(url?: string | null): boolean {
  if (!url) return false;
  return fotosBasura.test(url);
}

export function esPublicacionBasura(p: {
  nombre?: string;
  ciudad?: string;
  provincia?: string;
  descripcion?: string;
  fotos?: string[];
}): boolean {
  const ciudad = `${p.ciudad ?? ""} ${p.provincia ?? ""}`;
  const desc = (p.descripcion ?? "").trim();
  if (ciudadesBasura.test(ciudad)) return true;
  if (nombresBasura.test(p.nombre ?? "") && ciudadesBasura.test(ciudad)) return true;
  if (/prueba/i.test(p.nombre ?? "") && desc.length < 8) return true;
  if (desc === ",m" || desc === "," || desc === ".") return true;
  if ((p.fotos ?? []).some((f) => esFotoBasura(f))) return true;
  return false;
}

export function formatearZona(ciudad?: string | null, provincia?: string | null): string {
  const c = (ciudad ?? "").replace(/\s+,/g, ",").replace(/,\s+/g, ", ").replace(/\s+/g, " ").trim();
  const p = (provincia ?? "").replace(/\s+/g, " ").trim();
  if (!c) return p;
  if (!p) return c;
  if (c.toLowerCase().endsWith(p.toLowerCase())) return c;
  return `${c}, ${p}`;
}
