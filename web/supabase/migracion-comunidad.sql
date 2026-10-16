-- Reportes privados y alertas de adopción. Aplicar antes de desplegar el código.
begin;

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

-- Cercanía calculada y limitada en la base, sin descargar todo el catálogo.
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

commit;
