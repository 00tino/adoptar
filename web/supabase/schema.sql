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
  tipo text not null check (tipo in ('adopcion','transito')),
  estado text not null default 'pendiente' check (estado in ('pendiente','disponible','en_proceso','adoptado','rechazado')),
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
  campana_id uuid not null references campanas(id) on delete cascade,
  donor_nombre text,
  donor_email text,
  monto numeric not null check (monto > 0),
  metodo text not null check (metodo in ('mercadopago','transferencia')),
  anonima boolean not null default false,
  estado text not null default 'pendiente' check (estado in ('pendiente','acreditada')),
  creado_el timestamptz not null default now()
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

-- ============ STORAGE ============
-- Crear también un bucket PÚBLICO llamado "media" desde el panel de Supabase:
-- Storage → New bucket → nombre "media" → marcar "Public bucket".
-- Ahí se guardan las fotos y videos de animales y refugios.

-- Índices para las consultas del catálogo
create index idx_animales_estado on animales (estado);
create index idx_animales_especie on animales (especie);
create index idx_animales_provincia on animales (provincia);
create index idx_animales_tipo on animales (tipo);
