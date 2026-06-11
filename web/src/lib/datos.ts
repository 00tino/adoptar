// Capa de acceso a datos de AdoptAR.
//
// Funciona en dos modos:
//  - CON Supabase configurado (.env.local): consulta la base real.
//  - SIN configurar: usa los datos de demostración de abajo, así la app
//    siempre corre. Las páginas no notan la diferencia.

import type { Animal, Campana, Refugio } from "./tipos";
import { crearClienteSupabase, supabaseDisponible } from "./supabase";

const refugios: Refugio[] = [
  {
    id: "r1",
    slug: "patitas-del-sur",
    nombre: "Patitas del Sur",
    descripcion:
      "Refugio familiar en Avellaneda. Rescatamos perros y gatos de la calle desde 2015, los recuperamos y les buscamos una familia para siempre.",
    ciudad: "Avellaneda",
    provincia: "Buenos Aires",
    lat: -34.6626,
    lng: -58.3658,
    telefono: "+54 11 4222-0000",
    email: "hola@patitasdelsur.org",
    whatsapp: "5491142220000",
    estado: "estrella",
    creadoEl: "2024-03-10",
  },
  {
    id: "r2",
    slug: "huellas-cordoba",
    nombre: "Huellas Córdoba",
    descripcion:
      "Somos un grupo de voluntarios cordobeses. Trabajamos con hogares de tránsito y jornadas de castración gratuita.",
    ciudad: "Córdoba",
    provincia: "Córdoba",
    lat: -31.4201,
    lng: -64.1888,
    telefono: "+54 351 422-0000",
    email: "contacto@huellascba.org",
    whatsapp: "5493514220000",
    estado: "verificado",
    creadoEl: "2024-07-22",
  },
  {
    id: "r3",
    slug: "refugio-esperanza-rosario",
    nombre: "Refugio Esperanza",
    descripcion:
      "Refugio rosarino con capacidad para 80 animales. Priorizamos casos de maltrato y recuperación veterinaria.",
    ciudad: "Rosario",
    provincia: "Santa Fe",
    lat: -32.9468,
    lng: -60.6393,
    telefono: "+54 341 430-0000",
    email: "info@refugioesperanza.org",
    whatsapp: "5493414300000",
    estado: "verificado",
    creadoEl: "2025-01-15",
  },
];

const animales: Animal[] = [
  {
    id: "a1",
    slug: "adoptar-perro-luna-avellaneda",
    nombre: "Luna",
    especie: "perro",
    raza: "Mestiza",
    edadMeses: 24,
    sexo: "hembra",
    tamano: "mediano",
    castrado: true,
    vacunas: ["Quíntuple", "Antirrábica"],
    descripcion:
      "Luna es pura dulzura. La rescatamos de la calle hace un año y hoy está sana, castrada y lista para su familia. Es ideal para casas con patio, se lleva bárbaro con otros perros y con chicos.",
    ciudad: "Avellaneda",
    provincia: "Buenos Aires",
    latAprox: -34.6626,
    lngAprox: -58.3658,
    tipo: "adopcion",
    estado: "disponible",
    refugioId: "r1",
    particularNombre: null,
    fotos: [],
    videoUrl: null,
    creadoEl: "2026-05-02",
  },
  {
    id: "a2",
    slug: "adoptar-gato-milo-cordoba",
    nombre: "Milo",
    especie: "gato",
    raza: "Común europeo",
    edadMeses: 8,
    sexo: "macho",
    tamano: "chico",
    castrado: true,
    vacunas: ["Triple felina"],
    descripcion:
      "Milo es un gatito curioso y mimoso. Duerme arriba de cualquier cosa tibia y ronronea apenas lo mirás. Entregamos con libreta sanitaria al día.",
    ciudad: "Córdoba",
    provincia: "Córdoba",
    latAprox: -31.4201,
    lngAprox: -64.1888,
    tipo: "adopcion",
    estado: "disponible",
    refugioId: "r2",
    particularNombre: null,
    fotos: [],
    videoUrl: null,
    creadoEl: "2026-05-20",
  },
  {
    id: "a3",
    slug: "transito-perro-rocky-caballito",
    nombre: "Rocky",
    especie: "perro",
    raza: "Mestizo",
    edadMeses: 60,
    sexo: "macho",
    tamano: "grande",
    castrado: true,
    vacunas: ["Quíntuple", "Antirrábica"],
    descripcion:
      "Rocky necesita un hogar de tránsito urgente: su rescatista se muda y no puede tenerlo más. Es tranquilo, educado y agradecido. Cubrimos el alimento durante el tránsito.",
    ciudad: "Caballito, CABA",
    provincia: "Buenos Aires",
    latAprox: -34.6191,
    lngAprox: -58.4441,
    tipo: "transito",
    estado: "disponible",
    refugioId: null,
    particularNombre: "Sofía R.",
    fotos: [],
    videoUrl: null,
    creadoEl: "2026-06-01",
  },
  {
    id: "a4",
    slug: "adoptar-gata-frida-rosario",
    nombre: "Frida",
    especie: "gato",
    raza: "Carey",
    edadMeses: 36,
    sexo: "hembra",
    tamano: "chico",
    castrado: true,
    vacunas: ["Triple felina", "Antirrábica"],
    descripcion:
      "Frida es independiente pero compañera: te sigue por la casa y duerme a tus pies. Ideal para departamento. Testeada negativa de leucemia e inmunodeficiencia.",
    ciudad: "Rosario",
    provincia: "Santa Fe",
    latAprox: -32.9468,
    lngAprox: -60.6393,
    tipo: "adopcion",
    estado: "disponible",
    refugioId: "r3",
    particularNombre: null,
    fotos: [],
    videoUrl: null,
    creadoEl: "2026-04-18",
  },
  {
    id: "a5",
    slug: "adoptar-perra-greta-avellaneda",
    nombre: "Greta",
    especie: "perro",
    raza: "Ovejero mestizo",
    edadMeses: 6,
    sexo: "hembra",
    tamano: "grande",
    castrado: false,
    vacunas: ["Quíntuple (1ª dosis)"],
    descripcion:
      "Greta es una cachorra llena de energía que va a ser grande. Busca familia activa con espacio. Se entrega con compromiso de castración a los 8 meses (la cubre el refugio).",
    ciudad: "Avellaneda",
    provincia: "Buenos Aires",
    latAprox: -34.6626,
    lngAprox: -58.3658,
    tipo: "adopcion",
    estado: "en_proceso",
    refugioId: "r1",
    particularNombre: null,
    fotos: [],
    videoUrl: null,
    creadoEl: "2026-05-28",
  },
  {
    id: "a6",
    slug: "transito-conejo-pipo-cordoba",
    nombre: "Pipo",
    especie: "otro",
    raza: "Conejo enano",
    edadMeses: 12,
    sexo: "macho",
    tamano: "chico",
    castrado: false,
    vacunas: [],
    descripcion:
      "Pipo fue abandonado en una caja. Necesita tránsito mientras le buscamos adoptante definitivo. Come pellets y pasto, es limpio y silencioso.",
    ciudad: "Córdoba",
    provincia: "Córdoba",
    latAprox: -31.4155,
    lngAprox: -64.1812,
    tipo: "transito",
    estado: "disponible",
    refugioId: null,
    particularNombre: "Marcos T.",
    fotos: [],
    videoUrl: null,
    creadoEl: "2026-06-05",
  },
];

const campanas: Campana[] = [
  {
    id: "c1",
    titulo: "Operación de cadera para Tobías",
    descripcion:
      "Tobías fue atropellado y necesita una cirugía de cadera para volver a caminar. Todo lo recaudado va directo a la clínica veterinaria.",
    tipo: "refugio",
    refugioId: "r1",
    metaMonto: 850000,
    recaudado: 312000,
    estado: "activa",
  },
  {
    id: "c2",
    titulo: "Mantenimiento de AdoptAR",
    descripcion:
      "AdoptAR es gratuita para refugios y adoptantes. Tu aporte cubre el dominio y los servicios que mantienen la plataforma en línea.",
    tipo: "plataforma",
    refugioId: null,
    metaMonto: null,
    recaudado: 47500,
    estado: "activa",
  },
];

// ---------- Mapeo de filas de Supabase (snake_case) a nuestros tipos ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
function filaAAnimal(f: any): Animal {
  return {
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    especie: f.especie,
    raza: f.raza ?? "Mestizo/a",
    edadMeses: f.edad_meses ?? 0,
    sexo: f.sexo ?? "macho",
    tamano: f.tamano ?? "mediano",
    castrado: f.castrado,
    vacunas: f.vacunas ?? [],
    descripcion: f.descripcion,
    ciudad: f.ciudad,
    provincia: f.provincia,
    latAprox: f.lat_aprox ?? 0,
    lngAprox: f.lng_aprox ?? 0,
    tipo: f.tipo,
    estado: f.estado,
    refugioId: f.refugio_id,
    particularNombre: f.particular_nombre ?? null,
    fotos: Array.isArray(f.fotos) ? f.fotos : [],
    videoUrl: f.video_url ?? null,
    creadoEl: f.creado_el,
  };
}

function filaARefugio(f: any): Refugio {
  return {
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    descripcion: f.descripcion,
    ciudad: f.ciudad,
    provincia: f.provincia,
    lat: f.lat ?? 0,
    lng: f.lng ?? 0,
    telefono: f.telefono ?? "",
    email: f.email ?? "",
    whatsapp: f.whatsapp ?? "",
    estado: f.estado,
    creadoEl: f.creado_el,
  };
}

function filaACampana(f: any): Campana {
  return {
    id: f.id,
    titulo: f.titulo,
    descripcion: f.descripcion,
    tipo: f.tipo,
    refugioId: f.refugio_id,
    metaMonto: f.meta_monto ? Number(f.meta_monto) : null,
    recaudado: Number(f.recaudado ?? 0),
    estado: f.estado,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- Funciones de consulta ----------

export interface FiltrosAnimales {
  especie?: string;
  tipo?: string;
  provincia?: string;
  tamano?: string;
  sexo?: string;
  edad?: string; // cachorro (<1 año) | adulto (1-7) | mayor (7+)
  q?: string;
}

// Rangos de edad en meses para el filtro "edad"
const rangosEdad: Record<string, [number, number]> = {
  cachorro: [0, 11],
  adulto: [12, 83],
  mayor: [84, 10000],
};

export async function obtenerAnimales(
  filtros: FiltrosAnimales = {}
): Promise<Animal[]> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    let consulta = sb
      .from("animales")
      .select("*")
      .in("estado", ["disponible", "en_proceso", "adoptado"])
      .order("creado_el", { ascending: false });
    if (filtros.especie) consulta = consulta.eq("especie", filtros.especie);
    if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);
    if (filtros.provincia) consulta = consulta.eq("provincia", filtros.provincia);
    if (filtros.tamano) consulta = consulta.eq("tamano", filtros.tamano);
    if (filtros.sexo) consulta = consulta.eq("sexo", filtros.sexo);
    const rango = filtros.edad ? rangosEdad[filtros.edad] : null;
    if (rango)
      consulta = consulta.gte("edad_meses", rango[0]).lte("edad_meses", rango[1]);
    if (filtros.q) {
      // Solo letras, números y espacios: evita inyectar operadores de filtro
      const q = filtros.q.replace(/[^\p{L}\p{N} ]/gu, "").trim().slice(0, 60);
      if (q)
        consulta = consulta.or(
          `nombre.ilike.%${q}%,ciudad.ilike.%${q}%,provincia.ilike.%${q}%,raza.ilike.%${q}%`
        );
    }
    const { data, error } = await consulta;
    if (error) throw error;
    return (data ?? []).map(filaAAnimal);
  }

  return animales.filter((a) => {
    if (a.estado === "pendiente" || a.estado === "rechazado") return false;
    if (filtros.especie && a.especie !== filtros.especie) return false;
    if (filtros.tipo && a.tipo !== filtros.tipo) return false;
    if (filtros.provincia && a.provincia !== filtros.provincia) return false;
    if (filtros.tamano && a.tamano !== filtros.tamano) return false;
    if (filtros.sexo && a.sexo !== filtros.sexo) return false;
    const rango = filtros.edad ? rangosEdad[filtros.edad] : null;
    if (rango && (a.edadMeses < rango[0] || a.edadMeses > rango[1])) return false;
    if (filtros.q) {
      const q = filtros.q.toLowerCase();
      const texto = `${a.nombre} ${a.raza} ${a.ciudad} ${a.provincia}`.toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });
}

export async function obtenerAnimalPorSlug(slug: string): Promise<Animal | null> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    const { data } = await sb.from("animales").select("*").eq("slug", slug).maybeSingle();
    return data ? filaAAnimal(data) : null;
  }
  return animales.find((a) => a.slug === slug) ?? null;
}

export async function obtenerRefugios(): Promise<Refugio[]> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    const { data, error } = await sb
      .from("refugios")
      .select("*")
      .in("estado", ["verificado", "estrella"])
      .order("nombre");
    if (error) throw error;
    return (data ?? []).map(filaARefugio);
  }
  return refugios.filter((r) => r.estado === "verificado" || r.estado === "estrella");
}

export async function obtenerRefugioPorSlug(slug: string): Promise<Refugio | null> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    const { data } = await sb.from("refugios").select("*").eq("slug", slug).maybeSingle();
    return data ? filaARefugio(data) : null;
  }
  return refugios.find((r) => r.slug === slug) ?? null;
}

export async function obtenerRefugioPorId(id: string): Promise<Refugio | null> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    const { data } = await sb.from("refugios").select("*").eq("id", id).maybeSingle();
    return data ? filaARefugio(data) : null;
  }
  return refugios.find((r) => r.id === id) ?? null;
}

export async function obtenerAnimalesDeRefugio(refugioId: string): Promise<Animal[]> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    const { data, error } = await sb
      .from("animales")
      .select("*")
      .eq("refugio_id", refugioId)
      .in("estado", ["disponible", "en_proceso", "adoptado"]);
    if (error) throw error;
    return (data ?? []).map(filaAAnimal);
  }
  return animales.filter((a) => a.refugioId === refugioId);
}

export async function obtenerCampanasActivas(): Promise<Campana[]> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    // "recaudado" se calcula sumando donaciones acreditadas (vista en schema.sql)
    const { data, error } = await sb
      .from("campanas_con_recaudado")
      .select("*")
      .eq("estado", "activa");
    if (error) throw error;
    return (data ?? []).map(filaACampana);
  }
  return campanas.filter((c) => c.estado === "activa");
}

export async function obtenerProvincias(): Promise<string[]> {
  if (supabaseDisponible()) {
    const sb = crearClienteSupabase();
    const { data } = await sb
      .from("animales")
      .select("provincia")
      .in("estado", ["disponible", "en_proceso"]);
    return [...new Set((data ?? []).map((f) => f.provincia as string))].sort();
  }
  return [...new Set(animales.map((a) => a.provincia))].sort();
}
