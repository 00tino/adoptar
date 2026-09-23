-- Red de hogares de tránsito: disponibilidad y solicitudes entre usuarios.
-- Solo las acciones del servidor usan estas tablas; nunca se exponen emails
-- ni mensajes mediante la Data API pública.

create table if not exists public.hogares_transito (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id) on delete cascade,
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
alter table public.hogares_transito enable row level security;
revoke all on table public.hogares_transito from anon, authenticated;
create index if not exists idx_hogares_transito_busqueda
  on public.hogares_transito (provincia, disponible);

create table if not exists public.solicitudes_hogar_transito (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references public.hogares_transito(id) on delete cascade,
  solicitante_id uuid not null references public.usuarios(id) on delete cascade,
  mensaje text not null check (char_length(mensaje) between 20 and 1500),
  creado_el timestamptz not null default now()
);
alter table public.solicitudes_hogar_transito enable row level security;
revoke all on table public.solicitudes_hogar_transito from anon, authenticated;
create index if not exists idx_solicitudes_hogar_transito
  on public.solicitudes_hogar_transito (hogar_id, creado_el desc);
create index if not exists idx_solicitudes_hogar_solicitante
  on public.solicitudes_hogar_transito (solicitante_id);
