-- Migración Fase 7 — ejecutar en el SQL Editor de Supabase (producción).
-- "Caja" real para donaciones a causas sin campañas activas:
-- campana_id pasa a ser opcional; si es null, la causa es obligatoria.

alter table donaciones alter column campana_id drop not null;

alter table donaciones
  add constraint donaciones_caja_con_causa
  check (campana_id is not null or causa is not null);
