-- Migración Fase 6 — pegar en el SQL Editor de Supabase.
-- (schema.sql ya quedó actualizado con estos cambios para instalaciones nuevas)

-- 1. Perfiles de refugio ricos: historia larga
alter table refugios add column if not exists historia text not null default '';

-- 2. Donaciones por causa: categoría fija en cada campaña
alter table campanas add column if not exists causa text not null default 'plataforma'
  check (causa in ('cirugias','refugios','rescates','castraciones','alimento','plataforma'));

-- 2b. Desglose por causa en cada donación + agrupador de checkouts multi-causa
alter table donaciones add column if not exists causa text;
alter table donaciones add column if not exists grupo_id uuid;
create index if not exists idx_donaciones_grupo on donaciones (grupo_id);

-- 3. Donación mensual: suscripciones de MercadoPago (preapproval)
create table if not exists suscripciones (
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
alter table suscripciones enable row level security;
-- (sin políticas públicas: solo el servidor con service role la toca)
