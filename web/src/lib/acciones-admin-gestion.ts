"use server";

// Gestión total desde el panel admin: búsqueda global y secciones de
// animales, refugios, campañas, donaciones y suscripciones.
// TODAS las acciones verifican la sesión de admin en el servidor.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esAdmin } from "./auth";
import { campoTexto } from "./limites";
import { subirArchivos } from "./archivos";
import { esCausa } from "./causas";
import { crearNotificacion } from "./notificaciones";
import { FILAS_POR_PAGINA } from "./constantes-admin";

function clienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function exigirAdmin() {
  if (!(await esAdmin())) {
    throw new Error("Solo el administrador puede hacer esto.");
  }
}

/** Limpia el texto de búsqueda para usarlo en un ilike sin sorpresas */
function limpiarBusqueda(q: string): string {
  return q.replace(/[%_,()]/g, " ").replace(/[^\p{L}\p{N}@. \-]/gu, "").trim().slice(0, 80);
}

const PAGINA_ADMIN = FILAS_POR_PAGINA;

// ---------- Búsqueda global ----------

export interface ResultadoBusqueda {
  tipo: "animal" | "refugio" | "campana" | "usuario" | "donacion";
  titulo: string;
  detalle: string;
  href: string;
}

/** Busca a la vez en animales, refugios, campañas, usuarios y donaciones */
export async function busquedaGlobal(q: string): Promise<ResultadoBusqueda[]> {
  await exigirAdmin();
  const limpio = limpiarBusqueda(q);
  if (!limpio) return [];
  const sb = clienteServidor();
  const patron = `%${limpio}%`;

  const [animales, refugios, campanas, usuarios, donaciones] = await Promise.all([
    sb
      .from("animales")
      .select("id,nombre,slug,especie,ciudad,provincia,estado")
      .or(`nombre.ilike.${patron},slug.ilike.${patron},ciudad.ilike.${patron}`)
      .limit(8),
    sb
      .from("refugios")
      .select("id,nombre,slug,ciudad,provincia,email,estado")
      .or(`nombre.ilike.${patron},ciudad.ilike.${patron},email.ilike.${patron}`)
      .limit(8),
    sb
      .from("campanas")
      .select("id,titulo,causa,estado")
      .or(`titulo.ilike.${patron},causa.ilike.${patron}`)
      .limit(8),
    sb
      .from("usuarios")
      .select("id,nombre,email,tipo,suspendido")
      .or(`email.ilike.${patron},nombre.ilike.${patron}`)
      .limit(8),
    sb
      .from("donaciones")
      .select("id,donor_nombre,monto,metodo,estado,creado_el")
      .ilike("donor_nombre", patron)
      .limit(8),
  ]);

  const resultados: ResultadoBusqueda[] = [];
  for (const a of animales.data ?? []) {
    resultados.push({
      tipo: "animal",
      titulo: `🐾 ${a.nombre}`,
      detalle: `${a.especie} · ${a.ciudad}, ${a.provincia} · ${a.estado}`,
      href: `/admin/animales?q=${encodeURIComponent(a.nombre)}`,
    });
  }
  for (const r of refugios.data ?? []) {
    resultados.push({
      tipo: "refugio",
      titulo: `🏠 ${r.nombre}`,
      detalle: `${r.ciudad}, ${r.provincia} · ${r.email ?? "sin email"} · ${r.estado}`,
      href: `/admin/refugios?q=${encodeURIComponent(r.nombre)}`,
    });
  }
  for (const c of campanas.data ?? []) {
    resultados.push({
      tipo: "campana",
      titulo: `💛 ${c.titulo}`,
      detalle: `causa ${c.causa} · ${c.estado}`,
      href: `/admin/campanas?q=${encodeURIComponent(c.titulo)}`,
    });
  }
  for (const u of usuarios.data ?? []) {
    resultados.push({
      tipo: "usuario",
      titulo: `👤 ${u.nombre}`,
      detalle: `${u.email} · ${u.tipo}${u.suspendido ? " · suspendido" : ""}`,
      href: `/admin?q=${encodeURIComponent(u.email)}`,
    });
  }
  for (const d of donaciones.data ?? []) {
    resultados.push({
      tipo: "donacion",
      titulo: `💸 ${d.donor_nombre ?? "Anónimo"} — $${Number(d.monto).toLocaleString("es-AR")}`,
      detalle: `${d.metodo} · ${d.estado} · ${new Date(d.creado_el).toLocaleDateString("es-AR")}`,
      href: `/admin/donaciones?q=${encodeURIComponent(d.donor_nombre ?? "")}`,
    });
  }
  return resultados;
}

// ---------- Animales ----------

export interface FiltrosAnimales {
  estado?: string;
  especie?: string;
  tipo?: string;
  q?: string;
  pagina?: number;
}

export interface AnimalAdmin {
  id: string;
  slug: string;
  nombre: string;
  especie: string;
  tipo: string;
  estado: string;
  ciudad: string;
  provincia: string;
  publica: string;
  creadoEl: string;
}

export async function listarAnimalesAdmin(filtros: FiltrosAnimales): Promise<{
  filas: AnimalAdmin[];
  total: number;
}> {
  await exigirAdmin();
  const sb = clienteServidor();
  const pagina = Math.max(1, filtros.pagina ?? 1);
  let consulta = sb
    .from("animales")
    .select("id,slug,nombre,especie,tipo,estado,ciudad,provincia,particular_nombre,creado_el,refugios(nombre)", {
      count: "exact",
    })
    .order("creado_el", { ascending: false })
    .range((pagina - 1) * PAGINA_ADMIN, pagina * PAGINA_ADMIN - 1);
  if (filtros.estado) consulta = consulta.eq("estado", filtros.estado);
  if (filtros.especie) consulta = consulta.eq("especie", filtros.especie);
  if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);
  const limpio = limpiarBusqueda(filtros.q ?? "");
  if (limpio) {
    consulta = consulta.or(
      `nombre.ilike.%${limpio}%,slug.ilike.%${limpio}%,ciudad.ilike.%${limpio}%`
    );
  }
  const { data, count, error } = await consulta;
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    filas: (data ?? []).map((a) => {
      const refugio = Array.isArray(a.refugios) ? a.refugios[0] : a.refugios;
      return {
        id: a.id,
        slug: a.slug,
        nombre: a.nombre,
        especie: a.especie,
        tipo: a.tipo,
        estado: a.estado,
        ciudad: a.ciudad,
        provincia: a.provincia,
        publica:
          (refugio as { nombre?: string } | null)?.nombre ??
          a.particular_nombre ??
          "—",
        creadoEl: a.creado_el,
      };
    }),
  };
}

const ESTADOS_ANIMAL = ["pendiente", "disponible", "en_proceso", "adoptado", "rechazado"];

/** El admin puede mover un animal a cualquier estado (incluida la baja) */
export async function cambiarEstadoAnimalAdmin(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const estado = String(formData.get("estado"));
  if (!ESTADOS_ANIMAL.includes(estado)) throw new Error("Estado inválido.");
  const sb = clienteServidor();
  const { error } = await sb.from("animales").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/animales");
  revalidatePath("/animales");
  revalidatePath("/");
}

/** Edición completa de un animal desde el admin (reusa FormularioAnimal) */
export async function editarAnimalAdmin(formData: FormData) {
  await exigirAdmin();
  const sb = clienteServidor();
  const id = String(formData.get("id"));

  const nombre = campoTexto(formData.get("nombre"), 80);
  if (!nombre) throw new Error("El nombre es obligatorio.");
  const especieCruda = String(formData.get("especie") ?? "otro");
  const tamanoCrudo = String(formData.get("tamano") ?? "mediano");
  const datos = {
    nombre,
    especie: ["perro", "gato", "otro"].includes(especieCruda) ? especieCruda : "otro",
    sexo: String(formData.get("sexo")) === "hembra" ? "hembra" : "macho",
    tamano: ["chico", "mediano", "grande"].includes(tamanoCrudo) ? tamanoCrudo : "mediano",
    raza: campoTexto(formData.get("raza"), 80) || null,
    edad_meses: Math.min(Math.max(Number(formData.get("edad_meses")) || 0, 0), 600),
    castrado: formData.get("castrado") === "on",
    vacunas: campoTexto(formData.get("vacunas"), 300)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    descripcion: campoTexto(formData.get("descripcion"), 3000),
  };

  // Fotos nuevas (opcionales): se agregan al final de las existentes
  const fotosNuevas = (formData.getAll("fotos") as File[]).filter((f) => f.size > 0);
  let actualizacion: Record<string, unknown> = datos;
  if (fotosNuevas.length > 0) {
    const urls = await subirArchivos(sb, fotosNuevas.slice(0, 6), "animales");
    const { data: actual } = await sb
      .from("animales")
      .select("fotos")
      .eq("id", id)
      .single();
    const existentes: string[] = Array.isArray(actual?.fotos) ? actual.fotos : [];
    actualizacion = { ...datos, fotos: [...existentes, ...urls].slice(0, 10) };
  }

  const { error } = await sb.from("animales").update(actualizacion).eq("id", id);
  if (error) throw new Error(`No pudimos guardar: ${error.message}`);
  revalidatePath("/admin/animales");
  revalidatePath("/animales");
  redirect("/admin/animales?editado=1");
}

// ---------- Refugios ----------

export interface RefugioAdmin {
  id: string;
  slug: string;
  nombre: string;
  ciudad: string;
  provincia: string;
  email: string | null;
  telefono: string | null;
  estado: string;
  descripcion: string;
  redes: { instagram?: string; facebook?: string };
  fotos: string[];
  creadoEl: string;
}

export async function listarRefugiosAdmin(filtros: {
  estado?: string;
  q?: string;
}): Promise<RefugioAdmin[]> {
  await exigirAdmin();
  const sb = clienteServidor();
  let consulta = sb
    .from("refugios")
    .select("*")
    .order("creado_el", { ascending: false })
    .limit(100);
  if (filtros.estado) consulta = consulta.eq("estado", filtros.estado);
  const limpio = limpiarBusqueda(filtros.q ?? "");
  if (limpio) {
    consulta = consulta.or(
      `nombre.ilike.%${limpio}%,ciudad.ilike.%${limpio}%,email.ilike.%${limpio}%`
    );
  }
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    ciudad: r.ciudad,
    provincia: r.provincia,
    email: r.email,
    telefono: r.telefono,
    estado: r.estado,
    descripcion: r.descripcion ?? "",
    redes: r.redes && typeof r.redes === "object" ? r.redes : {},
    fotos: Array.isArray(r.fotos) ? r.fotos : [],
    creadoEl: r.creado_el,
  }));
}

const ESTADOS_REFUGIO = ["pendiente", "verificado", "estrella", "suspendido"];

export async function cambiarEstadoRefugioAdmin(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const estado = String(formData.get("estado"));
  if (!ESTADOS_REFUGIO.includes(estado)) throw new Error("Estado inválido.");
  const sb = clienteServidor();
  const { data, error } = await sb
    .from("refugios")
    .update({ estado })
    .eq("id", id)
    .select("nombre,usuario_id")
    .single();
  if (error) throw new Error(error.message);
  await crearNotificacion(
    data?.usuario_id ?? null,
    "refugio",
    estado === "suspendido"
      ? `Tu refugio "${data?.nombre}" fue suspendido. Escribinos si creés que es un error.`
      : `Tu refugio "${data?.nombre}" ahora figura como ${estado}.`
  );
  revalidatePath("/admin/refugios");
  revalidatePath("/refugios");
}

// ---------- Campañas ----------

export interface CampanaAdmin {
  id: string;
  titulo: string;
  descripcion: string;
  causa: string;
  estado: string;
  metaMonto: number | null;
  recaudado: number;
  refugio: string;
  creadoEl: string;
}

export async function listarCampanasAdmin(filtros: {
  estado?: string;
  q?: string;
}): Promise<CampanaAdmin[]> {
  await exigirAdmin();
  const sb = clienteServidor();
  let consulta = sb
    .from("campanas")
    .select("id,titulo,descripcion,causa,estado,meta_monto,creado_el,refugios(nombre)")
    .order("creado_el", { ascending: false })
    .limit(100);
  if (filtros.estado) consulta = consulta.eq("estado", filtros.estado);
  const limpio = limpiarBusqueda(filtros.q ?? "");
  if (limpio) consulta = consulta.ilike("titulo", `%${limpio}%`);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  // Recaudado acreditado por campaña (una sola consulta para todas)
  const ids = (data ?? []).map((c) => c.id);
  const recaudado = new Map<string, number>();
  if (ids.length > 0) {
    const { data: dons } = await sb
      .from("donaciones")
      .select("campana_id,monto")
      .in("campana_id", ids)
      .eq("estado", "acreditada");
    for (const d of dons ?? []) {
      recaudado.set(d.campana_id, (recaudado.get(d.campana_id) ?? 0) + Number(d.monto));
    }
  }

  return (data ?? []).map((c) => {
    const refugio = Array.isArray(c.refugios) ? c.refugios[0] : c.refugios;
    return {
      id: c.id,
      titulo: c.titulo,
      descripcion: c.descripcion ?? "",
      causa: c.causa ?? "plataforma",
      estado: c.estado,
      metaMonto: c.meta_monto ? Number(c.meta_monto) : null,
      recaudado: recaudado.get(c.id) ?? 0,
      refugio: (refugio as { nombre?: string } | null)?.nombre ?? "Plataforma",
      creadoEl: c.creado_el,
    };
  });
}

/** Aprobar, rechazar, cerrar o reactivar una campaña desde el listado */
export async function accionCampanaAdmin(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const accion = String(formData.get("accion"));
  const estado =
    accion === "aprobar" || accion === "reactivar" ? "activa"
    : accion === "rechazar" || accion === "cerrar" ? "cerrada"
    : null;
  if (!estado) throw new Error("Acción inválida.");
  const sb = clienteServidor();
  const { error } = await sb.from("campanas").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/campanas");
  revalidatePath("/donaciones");
}

/** Edita título, descripción, meta y causa de cualquier campaña */
export async function editarCampanaAdmin(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const titulo = campoTexto(formData.get("titulo"), 120);
  if (!titulo) throw new Error("El título es obligatorio.");
  const descripcion = campoTexto(formData.get("descripcion"), 2000);
  const causa = String(formData.get("causa"));
  if (!esCausa(causa)) throw new Error("Causa inválida.");
  const metaCruda = Number(formData.get("meta_monto"));
  const meta_monto =
    Number.isFinite(metaCruda) && metaCruda > 0 ? Math.round(metaCruda) : null;

  const sb = clienteServidor();
  const { error } = await sb
    .from("campanas")
    .update({ titulo, descripcion, causa, meta_monto })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/campanas");
  revalidatePath("/donaciones");
}

// ---------- Donaciones ----------

export interface FiltrosDonaciones {
  estado?: string;
  metodo?: string;
  causa?: string;
  campana?: string;
  desde?: string;
  hasta?: string;
  q?: string;
  pagina?: number;
}

export interface DonacionAdmin {
  id: string;
  donante: string;
  monto: number;
  metodo: string;
  causa: string | null;
  estado: string;
  campana: string | null;
  campanaId: string | null;
  creadoEl: string;
}

export async function listarDonacionesAdmin(filtros: FiltrosDonaciones): Promise<{
  filas: DonacionAdmin[];
  total: number;
  montoTotal: number;
}> {
  await exigirAdmin();
  const sb = clienteServidor();
  const pagina = Math.max(1, filtros.pagina ?? 1);

  interface Filtrable {
    eq(col: string, val: string): Filtrable;
    is(col: string, val: null): Filtrable;
    gte(col: string, val: string): Filtrable;
    lte(col: string, val: string): Filtrable;
    ilike(col: string, val: string): Filtrable;
  }
  const aplicarFiltros = (c: unknown): Filtrable => {
    let q = c as Filtrable;
    if (filtros.estado) q = q.eq("estado", filtros.estado);
    if (filtros.metodo) q = q.eq("metodo", filtros.metodo);
    if (filtros.causa) q = q.eq("causa", filtros.causa);
    if (filtros.campana === "caja") q = q.is("campana_id", null);
    else if (filtros.campana) q = q.eq("campana_id", filtros.campana);
    if (filtros.desde) q = q.gte("creado_el", `${filtros.desde}T00:00:00`);
    if (filtros.hasta) q = q.lte("creado_el", `${filtros.hasta}T23:59:59`);
    const limpio = limpiarBusqueda(filtros.q ?? "");
    if (limpio) q = q.ilike("donor_nombre", `%${limpio}%`);
    return q;
  };

  const consultaPagina = sb
    .from("donaciones")
    .select("id,donor_nombre,monto,metodo,causa,estado,campana_id,creado_el,campanas(titulo)", {
      count: "exact",
    });
  aplicarFiltros(consultaPagina);
  // Total filtrado: suma de TODAS las filas que cumplen el filtro
  const consultaTotal = sb.from("donaciones").select("monto").limit(10000);
  aplicarFiltros(consultaTotal);

  const [pageRes, totalRes] = await Promise.all([
    consultaPagina
      .order("creado_el", { ascending: false })
      .range((pagina - 1) * PAGINA_ADMIN, pagina * PAGINA_ADMIN - 1),
    consultaTotal,
  ]);

  if (pageRes.error) throw new Error(pageRes.error.message);
  const montoTotal = (totalRes.data ?? []).reduce(
    (suma: number, d: { monto: unknown }) => suma + Number(d.monto),
    0
  );

  return {
    total: pageRes.count ?? 0,
    montoTotal,
    filas: (pageRes.data ?? []).map((d) => {
      const campana = Array.isArray(d.campanas) ? d.campanas[0] : d.campanas;
      return {
        id: d.id,
        donante: d.donor_nombre ?? "Anónimo",
        monto: Number(d.monto),
        metodo: d.metodo,
        causa: d.causa,
        estado: d.estado,
        campana: (campana as { titulo?: string } | null)?.titulo ?? null,
        campanaId: d.campana_id,
        creadoEl: d.creado_el,
      };
    }),
  };
}

/** Campañas activas para los selects del admin (registrar transferencia, reasignar) */
export async function campanasActivasAdmin(): Promise<
  { id: string; titulo: string; causa: string }[]
> {
  await exigirAdmin();
  const sb = clienteServidor();
  const { data } = await sb
    .from("campanas")
    .select("id,titulo,causa")
    .eq("estado", "activa")
    .order("titulo");
  return (data ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    causa: c.causa ?? "plataforma",
  }));
}

/** Registra una donación recibida por transferencia al alias (queda acreditada) */
export async function registrarTransferencia(formData: FormData) {
  await exigirAdmin();
  const campanaId = String(formData.get("campana_id"));
  const monto = Math.round(Number(formData.get("monto")));
  const donorNombre = campoTexto(formData.get("donor_nombre"), 80) || null;
  if (!campanaId) throw new Error("Elegí la campaña.");
  if (!Number.isFinite(monto) || monto <= 0 || monto > 10_000_000) {
    throw new Error("Monto inválido.");
  }
  const sb = clienteServidor();
  const { data: campana } = await sb
    .from("campanas")
    .select("id,causa")
    .eq("id", campanaId)
    .single();
  if (!campana) throw new Error("La campaña no existe.");

  const { error } = await sb.from("donaciones").insert({
    campana_id: campanaId,
    donor_nombre: donorNombre,
    monto,
    metodo: "transferencia",
    anonima: !donorNombre,
    estado: "acreditada",
    causa: campana.causa ?? "plataforma",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/donaciones");
  revalidatePath("/donaciones");
}

/** Reasigna una donación "en caja" (sin campaña) a una campaña activa */
export async function reasignarDonacionCaja(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id"));
  const campanaId = String(formData.get("campana_id"));
  if (!campanaId) throw new Error("Elegí la campaña destino.");
  const sb = clienteServidor();
  const { data: campana } = await sb
    .from("campanas")
    .select("id")
    .eq("id", campanaId)
    .eq("estado", "activa")
    .single();
  if (!campana) throw new Error("La campaña no existe o no está activa.");

  // Solo se pueden reasignar donaciones que están en caja
  const { error } = await sb
    .from("donaciones")
    .update({ campana_id: campanaId })
    .eq("id", id)
    .is("campana_id", null);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/donaciones");
  revalidatePath("/donaciones");
}

// ---------- Suscripciones ----------

export interface SuscripcionAdmin {
  id: string;
  donante: string;
  email: string;
  monto: number;
  causas: string[];
  estado: string;
  creadoEl: string;
}

export async function listarSuscripcionesAdmin(): Promise<{
  filas: SuscripcionAdmin[];
  totalActivas: number;
  montoMensual: number;
}> {
  await exigirAdmin();
  const sb = clienteServidor();
  const { data, error } = await sb
    .from("suscripciones")
    .select("id,monto,causas,estado,creado_el,usuarios(nombre,email)")
    .order("creado_el", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const filas = (data ?? []).map((s) => {
    const u = Array.isArray(s.usuarios) ? s.usuarios[0] : s.usuarios;
    return {
      id: s.id,
      donante: (u as { nombre?: string } | null)?.nombre ?? "—",
      email: (u as { email?: string } | null)?.email ?? "—",
      monto: Number(s.monto),
      causas: Array.isArray(s.causas) ? s.causas : ["general"],
      estado: s.estado,
      creadoEl: s.creado_el,
    };
  });
  const activas = filas.filter((s) => s.estado === "activa");
  return {
    filas,
    totalActivas: activas.length,
    montoMensual: activas.reduce((suma, s) => suma + s.monto, 0),
  };
}
