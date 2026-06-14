// Utilidades geográficas sin dependencias ni servicios pagos.
// - Distancia por fórmula de Haversine (en JS, sin PostGIS).
// - Geocodificación de una zona ("Ciudad, Provincia") con Nominatim (OSM, gratis).
// - Desplazamiento ~500 m de la coordenada para proteger la privacidad de particulares.

const RADIO_TIERRA_KM = 6371;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/** Distancia en kilómetros entre dos coordenadas (Haversine). */
export function distanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = aRadianes(lat2 - lat1);
  const dLng = aRadianes(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLng / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** True si el punto (lat,lng) está dentro de `radioKm` del centro. */
export function enRadio(
  centroLat: number,
  centroLng: number,
  lat: number,
  lng: number,
  radioKm: number
): boolean {
  return distanciaKm(centroLat, centroLng, lat, lng) <= radioKm;
}

/** Desplaza una coordenada ~metros en una dirección aleatoria (privacidad). */
export function desplazar(
  lat: number,
  lng: number,
  metros = 500
): { lat: number; lng: number } {
  const angulo = Math.random() * 2 * Math.PI;
  const distGrados = metros / 111_320; // 1° latitud ≈ 111.32 km
  const dLat = distGrados * Math.cos(angulo);
  const dLng = (distGrados * Math.sin(angulo)) / Math.cos(aRadianes(lat));
  return { lat: lat + dLat, lng: lng + dLng };
}

/** Geocodifica una zona libre con Nominatim. Devuelve null si no la encuentra
 *  o si el servicio falla (nunca tira: la publicación no debe cortarse). */
export async function geocodificarZona(
  zona: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const consulta = encodeURIComponent(`${zona}, Argentina`);
    const url = `https://nominatim.openstreetmap.org/search?q=${consulta}&format=json&limit=1&countrycodes=ar`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "AdoptAR/1.0 (adoptar.dpdns.org)" },
      // No queremos que una búsqueda lenta bloquee la publicación
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const datos = (await resp.json()) as { lat: string; lon: string }[];
    if (!datos.length) return null;
    return { lat: Number(datos[0].lat), lng: Number(datos[0].lon) };
  } catch {
    return null;
  }
}
