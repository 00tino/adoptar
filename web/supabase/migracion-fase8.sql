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
