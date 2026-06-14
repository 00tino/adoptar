-- AdoptAR — Migración Fase 8
-- Aplicar en el SQL Editor de Supabase (dashboard).

-- ============ ALERTAS DE TRÁNSITO ============
-- Un usuario dispuesto a hacer tránsito define una zona (lat/lng) y un radio.
-- Cuando se publica un animal en tránsito dentro de ese radio, le llega un email.
create table if not exists alertas_transito (
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

create index if not exists idx_alertas_transito_activa on alertas_transito (activa);
create index if not exists idx_alertas_transito_usuario on alertas_transito (usuario_id);

-- ============ FAVORITOS ============
-- Animales guardados por un usuario (vista "Mis favoritos").
create table if not exists favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  animal_id uuid not null references animales(id) on delete cascade,
  creado_el timestamptz not null default now(),
  unique (usuario_id, animal_id)
);
alter table favoritos enable row level security;
create index if not exists idx_favoritos_usuario on favoritos (usuario_id);

-- ============ POSTULACIONES DE ADOPCIÓN ============
-- Una persona se postula para adoptar un animal; el refugio/particular lo
-- gestiona (postulado → en_proceso → aceptada/rechazada).
create table if not exists postulaciones (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animales(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete set null,
  nombre text not null,
  email text not null,
  telefono text,
  vivienda text,        -- casa/depto, con patio, etc. (texto libre acotado)
  mensaje text not null default '',
  estado text not null default 'postulado'
    check (estado in ('postulado','en_proceso','aceptada','rechazada')),
  creado_el timestamptz not null default now()
);
alter table postulaciones enable row level security;
create index if not exists idx_postulaciones_animal on postulaciones (animal_id);

-- ============ HISTORIA DEL ANIMAL ============
-- "Mi historia": cómo lo encontraron / rescataron, contada por quien publica.
alter table animales add column if not exists historia text not null default '';
