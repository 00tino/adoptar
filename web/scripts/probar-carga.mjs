// Solo HTML público de AdoptAR: sin cookies, imágenes, pagos ni escrituras.
// Ejecutar manualmente: node scripts/probar-carga.mjs --ejecutar /ruta/informe.json
import { writeFile } from "node:fs/promises";
import { setTimeout as esperar } from "node:timers/promises";

const origen = "https://adoptar.dpdns.org";
const rutas = [
  { ruta: "/", texto: "Hay un amigo esperándote" },
  { ruta: "/animales", texto: "Luna" },
  { ruta: "/animales/adoptar-perra-luna-avellaneda-demo", texto: "La historia de Luna" },
  { ruta: "/refugios", texto: "Refugios verificados" },
];
const etapas = [
  { concurrencia: 1, tandas: 8 },
  { concurrencia: 5, tandas: 4 },
  { concurrencia: 10, tandas: 3 },
  { concurrencia: 20, tandas: 3 },
];
const limites = { solicitudes: 122, bytesHtml: 64 * 1024 * 1024, duracionMs: 120000, timeoutMs: 8000, p95Ms: 5000 };

if (process.argv[2] !== "--ejecutar" || !process.argv[3] || process.argv.length !== 4) {
  console.log(JSON.stringify({ origen, rutas, etapas, limites, uso: "node scripts/probar-carga.mjs --ejecutar /ruta/informe.json" }, null, 2));
  process.exit(process.argv.length === 2 ? 0 : 1);
}

const inicio = performance.now();
let bytesHtml = 0;
let solicitudes = 0;
let activas = 0;
let picoActivas = 0;
let motivoParada = null;
const muestras = [];
const resultados = [];
const percentil = (valores, p) => {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados.length ? ordenados[Math.ceil(ordenados.length * p) - 1] : null;
};

async function pedir(objetivo, etapa) {
  const muestra = { etapa, ruta: objetivo.ruta, estado: null, ttfbMs: null, totalMs: null, bytesHtml: 0, cacheVercel: null, regionVercel: null, error: null };
  const salida = performance.now();
  const control = new AbortController();
  const timeout = setTimeout(() => control.abort(), Math.max(1, Math.min(limites.timeoutMs, limites.duracionMs - (performance.now() - inicio))));
  solicitudes++;
  activas++;
  picoActivas = Math.max(picoActivas, activas);
  try {
    const respuesta = await fetch(origen + objetivo.ruta, {
      signal: control.signal,
      redirect: "error",
      headers: { "user-agent": "AdoptAR-QA-carga-limitada/1.0", accept: "text/html" },
    });
    muestra.ttfbMs = Math.round(performance.now() - salida);
    muestra.estado = respuesta.status;
    muestra.cacheVercel = respuesta.headers.get("x-vercel-cache");
    muestra.regionVercel = respuesta.headers.get("x-vercel-id");
    const partes = [];
    for await (const parte of respuesta.body) {
      bytesHtml += parte.byteLength;
      muestra.bytesHtml += parte.byteLength;
      if (bytesHtml > limites.bytesHtml || muestra.bytesHtml > 1024 * 1024) {
        control.abort();
        throw new Error("Límite de descarga alcanzado");
      }
      partes.push(Buffer.from(parte));
    }
    const html = Buffer.concat(partes).toString("utf8").replace(/<!--[\s\S]*?-->/g, "");
    if (respuesta.status !== 200) throw new Error(`HTTP ${respuesta.status}`);
    if (!respuesta.headers.get("content-type")?.includes("text/html") || !html.includes(objetivo.texto) || /data-next-error|NEXT_HTTP_ERROR_FALLBACK/.test(html)) {
      throw new Error("El HTML no contiene el contenido esperado o contiene un error de Next.js");
    }
  } catch (error) {
    muestra.error = error.message;
  } finally {
    clearTimeout(timeout);
    activas--;
    muestra.totalMs = Math.round(performance.now() - salida);
    muestras.push(muestra);
  }
  return muestra;
}

function resumir(lista) {
  return {
    solicitudes: lista.length,
    errores: lista.filter((m) => m.error).length,
    ttfbP50Ms: percentil(lista.filter((m) => m.ttfbMs !== null).map((m) => m.ttfbMs), 0.5),
    ttfbP95Ms: percentil(lista.filter((m) => m.ttfbMs !== null).map((m) => m.ttfbMs), 0.95),
    totalP50Ms: percentil(lista.map((m) => m.totalMs), 0.5),
    totalP95Ms: percentil(lista.map((m) => m.totalMs), 0.95),
    totalMaxMs: lista.length ? Math.max(...lista.map((m) => m.totalMs)) : null,
  };
}

// Calentamiento separado de las mediciones; se incluye en el presupuesto.
for (const ruta of rutas) {
  const muestra = await pedir(ruta, "calentamiento");
  if (muestra.error) { motivoParada = `Calentamiento: ${muestra.error}`; break; }
}

let siguienteRuta = 0;
for (const etapa of etapas) {
  if (motivoParada) break;
  const etapaInicio = performance.now();
  const etiqueta = `concurrencia-${etapa.concurrencia}`;
  for (let tanda = 0; tanda < etapa.tandas; tanda++) {
    if (performance.now() - inicio >= limites.duracionMs || solicitudes + etapa.concurrencia > limites.solicitudes || bytesHtml >= limites.bytesHtml) {
      motivoParada = "Presupuesto de duración, solicitudes o descarga alcanzado";
      break;
    }
    const objetivos = Array.from({ length: etapa.concurrencia }, () => rutas[siguienteRuta++ % rutas.length]);
    const tandaResultados = await Promise.all(objetivos.map((ruta) => pedir(ruta, etiqueta)));
    if (tandaResultados.some((m) => m.error)) { motivoParada = "Error: no se incrementa la carga"; break; }
    if (percentil(tandaResultados.map((m) => m.totalMs), 0.95) > limites.p95Ms) { motivoParada = "p95 mayor a 5 segundos: no se incrementa la carga"; break; }
    if (tanda + 1 < etapa.tandas) await esperar(1000);
  }
  const medidas = muestras.filter((m) => m.etapa === etiqueta);
  const resultado = { concurrencia: etapa.concurrencia, duracionMs: Math.round(performance.now() - etapaInicio), ...resumir(medidas) };
  resultados.push(resultado);
  console.log(JSON.stringify(resultado));
}

const medidas = muestras.filter((m) => m.etapa !== "calentamiento");
const informe = {
  fechaUtc: new Date().toISOString(), origen, limites, duracionMs: Math.round(performance.now() - inicio),
  solicitudesIncluidoCalentamiento: solicitudes, erroresIncluidoCalentamiento: muestras.filter((m) => m.error).length, bytesHtmlDecodificado: bytesHtml,
  picoSolicitudesActivas: picoActivas, rssClienteMiB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  motivoParada, etapas: resultados, resumen: resumir(medidas),
  porRuta: rutas.map(({ ruta }) => ({ ruta, ...resumir(medidas.filter((m) => m.ruta === ruta)) })),
  limitesInterpretacion: "Ráfagas de solicitudes HTTP desde una Mac; no representa usuarios navegando, imágenes, JS, sesiones, escrituras ni 1.000 usuarios simultáneos. Bytes de HTML descomprimido, no transferencia facturada.",
  muestras,
};
await writeFile(process.argv[3], JSON.stringify(informe, null, 2) + "\n");
console.log(JSON.stringify({ archivo: process.argv[3], motivoParada, resumen: informe.resumen, bytesHtml, picoActivas }));
if (motivoParada) process.exitCode = 1;
