-- Correr en el SQL Editor de Supabase (gratis).
-- Saca publicaciones/refugios de prueba sucios. NO borra Luna, Rocky ni Patitas del Sur.

update refugios
set estado = 'suspendido'
where lower(ciudad) like '%berlin%'
   or lower(nombre) like '%prueba%'
   or trim(descripcion) in (',m', ',', '.');

update animales
set estado = 'rechazado'
where lower(ciudad) like '%berlin%'
   or lower(nombre) = 'pelusa'
   or descripcion ilike '%glass%'
   or fotos::text ilike '%glass%'
   or fotos::text ilike '%cockpit%';
