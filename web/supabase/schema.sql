-- AdoptAR — Esquema de base de datos para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase cuando se cree el proyecto.
-- Incluye Row Level Security (RLS) básico por tabla.

-- ============ USUARIOS (extiende a Clerk/Supabase Auth) ============
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique,
  email text not null unique,
  nombre text not null,
  tipo text not null default 'individual' check (tipo in ('individual','refugio','admin')),
  suspendido boolean not null default false,
  creado_el timestamptz not null default now()
);

-- ============ REFUGIOS ============
create table refugios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  slug text not null unique,
  nombre text not null,
  descripcion text not null default '',
  direccion text not null default '',
  ciudad text not null,
  provincia text not null,
  lat double precision,
  lng double precision,
  telefono text,
  email text,
  whatsapp text,
  -- redes: {"instagram": "https://instagram.com/...", "facebook": "https://facebook.com/..."}
  redes jsonb not null default '{}',
  video_url text,
  fotos jsonb not null default '[]',
  -- Historia larga del refugio (la cuenta el propio refugio desde "Mi perfil")
  historia text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente','verificado','estrella','suspendido')),
  creado_el timestamptz not null default now()
);

-- ============ ANIMALES ============
create table animales (
  id uuid primary key default gen_random_uuid(),
  refugio_id uuid references refugios(id) on delete cascade,
  particular_id uuid references usuarios(id) on delete cascade,
  -- Nombre visible del particular (ej: "Sofía R."), nunca su email ni dirección
  particular_nombre text,
  slug text not null unique,
  nombre text not null,
  especie text not null check (especie in ('perro','gato','otro')),
  raza text,
  edad_meses int,
  sexo text check (sexo in ('macho','hembra')),
  tamano text check (tamano in ('chico','mediano','grande')),
  castrado boolean not null default false,
  vacunas jsonb not null default '[]',
  descripcion text not null default '',
  fotos jsonb not null default '[]',
  video_url text,
  -- Para particulares SOLO se guarda la coordenada desplazada (~500m).
  -- La ubicación exacta nunca entra a la base.
  lat_aprox double precision,
  lng_aprox double precision,
  ciudad text not null,
  provincia text not null,
  -- "Mi historia": cómo lo encontraron / rescataron (la cuenta quien publica)
  historia text not null default '',
  tipo text not null check (tipo in ('adopcion','transito')),
  -- 'borrador' = importado sin foto: no se ve en público hasta tener ≥1 foto (Fase 10)
  estado text not null default 'pendiente' check (estado in ('borrador','pendiente','disponible','en_proceso','adoptado','rechazado')),
  creado_el timestamptz not null default now(),
  -- Un animal lo publica un refugio O un particular, nunca ambos.
  -- (Puede no tener ninguno mientras la cuenta del particular no esté
  -- sincronizada con Clerk; en ese caso queda particular_nombre.)
  check (num_nonnulls(refugio_id, particular_id) <= 1)
);

-- ============ CAMPAÑAS Y DONACIONES ============
create table campanas (
  id uuid primary key default gen_random_uuid(),
  refugio_id uuid references refugios(id) on delete cascade,
  titulo text not null,
  descripcion text not null default '',
  meta_monto numeric,
  tipo text not null check (tipo in ('refugio','plataforma')),
  -- Causa fija para donar por categoría (tarea "donaciones por causa")
  causa text not null default 'plataforma'
    check (causa in ('cirugias','refugios','rescates','castraciones','alimento','plataforma')),
  estado text not null default 'pendiente' check (estado in ('pendiente','activa','cerrada')),
  creado_el timestamptz not null default now()
);

create table donaciones (
  id uuid primary key default gen_random_uuid(),
  -- campana_id null = donación "en caja": fue a una causa sin campañas
  -- activas y espera que el admin la reasigne cuando haya una campaña.
  campana_id uuid references campanas(id) on delete cascade,
  donor_nombre text,
  donor_email text,
  monto numeric not null check (monto > 0),
  metodo text not null check (metodo in ('mercadopago','transferencia')),
  -- Causa efectiva a la que fue la plata (desglose de donaciones multi-causa)
  causa text,
  -- Agrupa las filas de un mismo checkout multi-causa (external_reference "grupo:<uuid>")
  grupo_id uuid,
  -- ID del pago de MP que generó la fila (dedupe de webhooks de suscripciones)
  mp_pago_id text,
  anonima boolean not null default false,
  estado text not null default 'pendiente' check (estado in ('pendiente','acreditada')),
  creado_el timestamptz not null default now(),
  -- Una donación sin campaña tiene que tener causa (es la "caja" de esa causa)
  check (campana_id is not null or causa is not null)
);

-- Vista pública: campañas activas/cerradas con el total acreditado.
-- Es "security definer" a propósito: permite sumar donaciones sin exponer
-- las filas de la tabla donaciones (que tiene emails). Solo muestra campañas
-- ya aprobadas, nunca pendientes.
create view campanas_con_recaudado as
select c.*,
       coalesce((select sum(d.monto) from donaciones d
                 where d.campana_id = c.id and d.estado = 'acreditada'), 0) as recaudado
from campanas c
where c.estado in ('activa','cerrada');

-- ============ RATINGS (visibles solo para refugios) ============
create table ratings (
  id uuid primary key default gen_random_uuid(),
  refugio_id uuid not null references refugios(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  estrellas int not null check (estrellas between 1 and 5),
  comentario text,
  creado_el timestamptz not null default now(),
  unique (refugio_id, usuario_id)
);

-- ============ CHAT ============
create table mensajes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references usuarios(id) on delete cascade,
  -- null mientras quien publica no tenga cuenta sincronizada
  receiver_id uuid references usuarios(id) on delete cascade,
  animal_id uuid not null references animales(id) on delete cascade,
  contenido text not null,
  leido boolean not null default false,
  creado_el timestamptz not null default now()
);

-- ============ NOTIFICACIONES ============
create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  tipo text not null,
  contenido text not null,
  leida boolean not null default false,
  creado_el timestamptz not null default now()
);

-- ============ SUSCRIPCIONES (donación mensual con MP preapproval) ============
create table suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  preapproval_id text unique,
  monto numeric not null check (monto > 0),
  -- ["cirugias", "alimento"] o ["general"] = donde más se necesite
  causas jsonb not null default '["general"]',
  estado text not null default 'pendiente'
    check (estado in ('pendiente','activa','pausada','cancelada')),
  creado_el timestamptz not null default now(),
  actualizado_el timestamptz not null default now()
);

-- ============ ROW LEVEL SECURITY ============
alter table usuarios enable row level security;
alter table refugios enable row level security;
alter table animales enable row level security;
alter table campanas enable row level security;
alter table donaciones enable row level security;
alter table ratings enable row level security;
alter table mensajes enable row level security;
alter table notificaciones enable row level security;
alter table suscripciones enable row level security;

-- Lectura pública SOLO de contenido aprobado
create policy "animales visibles" on animales
  for select using (estado in ('disponible','en_proceso','adoptado'));
create policy "refugios visibles" on refugios
  for select using (estado in ('verificado','estrella'));
create policy "campanas visibles" on campanas
  for select using (estado = 'activa');

-- El resto de las operaciones (insert/update/delete y tablas privadas)
-- se hace desde el servidor con la service role key, que saltea RLS.
-- Cuando integremos Clerk con Supabase, se agregan políticas por usuario.

-- ============ ALERTAS DE TRÁNSITO (Fase 8) ============
-- Un usuario dispuesto a hacer tránsito define una zona (lat/lng) y un radio;
-- cuando se publica un animal en tránsito dentro de ese radio le llega un email.
create table alertas_transito (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  radio_km int not null default 25 check (radio_km between 1 and 500),
  activa boolean not null default true,
  creado_el timestamptz not null default now()
);
alter table alertas_transito enable row level security;
-- Sin políticas públicas: todo el acceso es server-side con service role.
create index idx_alertas_transito_activa on alertas_transito (activa);
create index idx_alertas_transito_usuario on alertas_transito (usuario_id);

-- ============ RED DE HOGARES DE TRÁNSITO ============
-- Los datos de contacto siguen en usuarios; la lista pública solo recibe
-- nombre, zona aproximada y disponibilidad desde el servidor.
create table hogares_transito (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references usuarios(id) on delete cascade,
  nombre_publico text not null,
  ciudad text not null,
  provincia text not null,
  especies text[] not null,
  cupos int not null check (cupos between 1 and 10),
  descripcion text not null default '',
  disponible boolean not null default true,
  actualizado_el timestamptz not null default now(),
  check (cardinality(especies) between 1 and 3)
);
alter table hogares_transito enable row level security;
revoke all on table hogares_transito from anon, authenticated;
create index idx_hogares_transito_busqueda on hogares_transito (provincia, disponible);

create table solicitudes_hogar_transito (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares_transito(id) on delete cascade,
  solicitante_id uuid not null references usuarios(id) on delete cascade,
  mensaje text not null check (char_length(mensaje) between 20 and 1500),
  creado_el timestamptz not null default now()
);
alter table solicitudes_hogar_transito enable row level security;
revoke all on table solicitudes_hogar_transito from anon, authenticated;
create index idx_solicitudes_hogar_transito on solicitudes_hogar_transito (hogar_id, creado_el desc);
create index idx_solicitudes_hogar_solicitante on solicitudes_hogar_transito (solicitante_id);

-- ============ FAVORITOS (Fase 8) ============
create table favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  animal_id uuid not null references animales(id) on delete cascade,
  creado_el timestamptz not null default now(),
  unique (usuario_id, animal_id)
);
alter table favoritos enable row level security;
create index idx_favoritos_usuario on favoritos (usuario_id);

-- ============ POSTULACIONES DE ADOPCIÓN (Fase 8) ============
create table postulaciones (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animales(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete set null,
  nombre text not null,
  email text not null,
  telefono text,
  vivienda text,
  mensaje text not null default '',
  estado text not null default 'postulado'
    check (estado in ('postulado','en_proceso','aceptada','rechazada')),
  creado_el timestamptz not null default now()
);
alter table postulaciones enable row level security;
create index idx_postulaciones_animal on postulaciones (animal_id);

-- ============ ARCHIVOS DE REFUGIO / VAULT (Fase 10) ============
-- Cada refugio sube y guarda sus propios archivos (bases de datos, PDFs, etc.)
-- a un bucket PRIVADO. Acá viven los metadatos; el binario va a Storage.
create table archivos_refugio (
  id uuid primary key default gen_random_uuid(),
  refugio_id uuid not null references refugios(id) on delete cascade,
  nombre text not null,            -- nombre original sanitizado
  ruta text not null,              -- path dentro del bucket "archivos-refugio"
  tipo_mime text not null,
  tamano_bytes bigint not null,
  creado_el timestamptz not null default now()
);
alter table archivos_refugio enable row level security;
-- Sin políticas públicas: todo el acceso es server-side con service role.
create index idx_archivos_refugio on archivos_refugio (refugio_id, creado_el desc);

-- ============ STORAGE ============
-- Crear también un bucket PÚBLICO llamado "media" desde el panel de Supabase:
-- Storage → New bucket → nombre "media" → marcar "Public bucket".
-- Ahí se guardan las fotos y videos de animales y refugios.
--
-- Y un bucket PRIVADO llamado "archivos-refugio" (Fase 10): NO marcar "Public".
-- Guarda las bases de datos/archivos que sube cada refugio; se descargan por
-- signed URL desde el servidor (service role). RLS por carpeta <refugio_id>/.

-- Índices para las consultas del catálogo
create index idx_animales_estado on animales (estado);
create index idx_animales_especie on animales (especie);
create index idx_animales_provincia on animales (provincia);
create index idx_animales_tipo on animales (tipo);

-- ============ COMUNIDAD: REPORTES Y ALERTAS DE ADOPCIÓN ============
-- Reportes privados y alertas de adopción. Aplicar antes de desplegar el código.

create table public.reportes_publicaciones (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animales(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  motivo text not null check (motivo in ('fraude','maltrato','datos_incorrectos','otro')),
  detalle text not null check (char_length(btrim(detalle)) between 10 and 1500),
  estado text not null default 'pendiente' check (estado in ('pendiente','resuelto','descartado')),
  creado_el timestamptz not null default now(),
  unique (animal_id, usuario_id)
);
alter table public.reportes_publicaciones enable row level security;
revoke all on public.reportes_publicaciones from public, anon, authenticated;
grant select, insert, update, delete on public.reportes_publicaciones to service_role;
create index idx_reportes_pendientes on public.reportes_publicaciones (creado_el) where estado = 'pendiente';

create table public.alertas_adopcion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id) on delete cascade,
  especie text check (especie in ('perro','gato','otro')),
  provincia text check (char_length(btrim(provincia)) between 1 and 80),
  activa boolean not null default true,
  creado_el timestamptz not null default now()
);
alter table public.alertas_adopcion enable row level security;
revoke all on public.alertas_adopcion from public, anon, authenticated;
grant select, insert, update, delete on public.alertas_adopcion to service_role;
create index idx_alertas_adopcion_activas on public.alertas_adopcion (especie, provincia) where activa;

-- Deduplicación también ante publicaciones repetidas o peticiones concurrentes.
create table public.envios_alertas_adopcion (
  alerta_id uuid not null references public.alertas_adopcion(id) on delete cascade,
  animal_id uuid not null references public.animales(id) on delete cascade,
  creado_el timestamptz not null default now(),
  primary key (alerta_id, animal_id)
);
alter table public.envios_alertas_adopcion enable row level security;
revoke all on public.envios_alertas_adopcion from public, anon, authenticated;
grant select, insert, update, delete on public.envios_alertas_adopcion to service_role;

-- Agregación en Postgres: no transferir todas las filas para contar refugios.
create function public.contar_animales_por_refugio()
returns table (refugio_id uuid, total bigint)
language sql stable security invoker set search_path = '' as $$
  select a.refugio_id, count(*)
  from public.animales a
  where a.estado = 'disponible' and a.refugio_id is not null
  group by a.refugio_id;
$$;
revoke all on function public.contar_animales_por_refugio() from public;
grant execute on function public.contar_animales_por_refugio() to anon, authenticated, service_role;

create index idx_animales_catalogo_publico on public.animales (creado_el desc, id)
  where estado in ('disponible','en_proceso');
create index idx_animales_adoptados on public.animales (creado_el desc, id)
  where estado = 'adoptado';

create function public.buscar_animales_cercanos(p_lat double precision, p_lng double precision,
  p_radio double precision, p_filtros jsonb default '{}')
returns table (datos jsonb, distancia_km double precision)
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(a) - 'particular_id', d.km
  from public.animales a
  cross join lateral (select 6371.0 * acos(least(1.0, greatest(-1.0,
    sin(radians(p_lat)) * sin(radians(a.lat_aprox)) +
    cos(radians(p_lat)) * cos(radians(a.lat_aprox)) * cos(radians(a.lng_aprox - p_lng))
  ))) as km) d
  where p_lat between -90 and 90 and p_lng between -180 and 180 and p_radio >= 0
    and a.estado in ('disponible','en_proceso')
    and a.lat_aprox is not null and a.lng_aprox is not null
    and (a.lat_aprox <> 0 or a.lng_aprox <> 0)
    and (p_radio = 0 or a.lat_aprox between p_lat - p_radio / 110.574 and p_lat + p_radio / 110.574)
    and (p_radio = 0 or d.km <= p_radio)
    and (coalesce(p_filtros->>'especie','') = '' or a.especie = p_filtros->>'especie')
    and (coalesce(p_filtros->>'tipo','') = '' or a.tipo = p_filtros->>'tipo')
    and (coalesce(p_filtros->>'provincia','') = '' or a.provincia = p_filtros->>'provincia')
    and (coalesce(p_filtros->>'tamano','') = '' or a.tamano = p_filtros->>'tamano')
    and (coalesce(p_filtros->>'sexo','') = '' or a.sexo = p_filtros->>'sexo')
    and (coalesce(p_filtros->>'castrado','') = '' or a.castrado = (p_filtros->>'castrado' = 'si'))
    and (coalesce(p_filtros->>'edad','') not in ('cachorro','adulto','mayor')
      or (p_filtros->>'edad' = 'cachorro' and a.edad_meses between 0 and 11)
      or (p_filtros->>'edad' = 'adulto' and a.edad_meses between 12 and 83)
      or (p_filtros->>'edad' = 'mayor' and a.edad_meses between 84 and 10000))
    and concat_ws(' ', a.nombre, a.ciudad, a.provincia, a.raza) ilike '%' ||
      left(regexp_replace(coalesce(p_filtros->>'q',''), '[^[:alnum:] ]', '', 'g'), 60) || '%'
  order by d.km, a.id limit 100;
$$;
revoke all on function public.buscar_animales_cercanos(double precision, double precision, double precision, jsonb) from public;
grant execute on function public.buscar_animales_cercanos(double precision, double precision, double precision, jsonb) to anon, authenticated, service_role;
