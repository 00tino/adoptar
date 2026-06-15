-- ============================================================
-- Migración Fase 10: vault de archivos + importador de animales
-- Aplicar en prod desde el SQL Editor de Supabase.
-- Después: crear el bucket PRIVADO "archivos-refugio" (Storage → New bucket,
-- SIN marcar "Public bucket"). O correr el bloque de storage de abajo.
-- ============================================================

-- 1) Nuevo estado 'borrador' para animales importados sin foto.
--    Quedan fuera de las vistas públicas (la RLS ya filtra disponible/en_proceso/adoptado).
alter table animales drop constraint if exists animales_estado_check;
alter table animales add constraint animales_estado_check
  check (estado in ('borrador','pendiente','disponible','en_proceso','adoptado','rechazado'));

-- 2) Metadatos del vault de archivos de cada refugio.
create table if not exists archivos_refugio (
  id uuid primary key default gen_random_uuid(),
  refugio_id uuid not null references refugios(id) on delete cascade,
  nombre text not null,
  ruta text not null,
  tipo_mime text not null,
  tamano_bytes bigint not null,
  creado_el timestamptz not null default now()
);
alter table archivos_refugio enable row level security;
create index if not exists idx_archivos_refugio on archivos_refugio (refugio_id, creado_el desc);

-- 3) Bucket privado para los archivos (alternativa al panel Storage → New bucket).
insert into storage.buckets (id, name, public)
values ('archivos-refugio', 'archivos-refugio', false)
on conflict (id) do nothing;
