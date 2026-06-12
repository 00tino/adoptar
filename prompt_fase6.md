# PROMPT — AdoptAR Fase 6: refugios ricos, donaciones por causa y mobile 🐾

Proyecto AdoptAR — plataforma de adopción de animales (Next.js 16 + Supabase + Clerk + MercadoPago + Tailwind 4 + Resend), código en /Users/valentino/Desktop/adoptar/web (fuente en web/src/).

**Regla de oro: costo CERO.** Todo lo que requiera pagar se reemplaza por una alternativa gratuita o se anota como pendiente para cuando haya presupuesto. Nunca contratar nada.

---

## ESTADO ACTUAL (ya hecho y funcionando — NO lo rehagas)

- Sitio EN PRODUCCIÓN: https://adoptar.dpdns.org (DNS en Vercel, ns1/ns2.vercel-dns.com).
- GitHub: https://github.com/00tino/adoptar — push a `main` redeploya solo (Vercel Root Directory: `web`). gh CLI en `~/bin/gh`. Deploy manual: `npx vercel --prod --yes` desde la raíz del repo.
- Supabase ref `mkiedljddnlrncfzbkek`. Schema en `web/supabase/schema.sql`. Bucket público `media` (fotos en `animales/`, videos en `videos/`). OJO: para la API REST/Storage con la `sb_secret_` van los headers `apikey` Y `Authorization: Bearer`.
- Clerk producción (Google OAuth propio), MercadoPago producción (MP_ACCESS_TOKEN, webhook de donaciones andando), Resend con dominio verificado (`AdoptAR <hola@adoptar.dpdns.org>`).
- Fase 5 completa: fotos reales de animales (tipo `Animal.fotos/videoUrl`, galería con flechas, OG con foto real, next/image con remotePattern de Supabase), panel `/mi-refugio` (publicar/editar/cambiar estado/dar de baja; estrella publica sin aprobación), bandeja `/mensajes` con no-leídos y badge, admin completo (gestión de usuarios con `suspendido` respetado vía `exigirUsuarioActivo`, export CSV en `/admin/exportar/[tabla]`, evolución mensual), catálogo paginado (`?pagina=N`) + filtro castrado, mini-mapa en perfil de animal (desplazamiento ~500m para particulares), ratings refugio→usuario (visibles solo para refugios, en /mensajes), notificaciones in-app (campanita en Header), favicon de huella (`src/app/icon.svg`).
- Helpers compartidos: `src/lib/archivos.ts` (generarSlug + subirArchivos a Storage), `src/lib/limites.ts` (limitarPorIp, campoTexto), `src/lib/emails.ts` (enviarEmail, escaparHtml).
- Animales demo: Luna (3 fotos reales en `media/animales/demo-luna-*.jpg`) y Rocky. "Dar de baja" = estado `rechazado`.

---

## TAREAS (en orden de prioridad)

### 1. Mobile-first: pasada completa de la web en teléfono (LO MÁS IMPORTANTE)
La página se usa mucho desde el celular y hoy se siente incómoda en general.
- **Header nuevo con menú hamburguesa** en mobile: hoy los links van en una fila scrolleable apretada. Menú desplegable con todos los links (incl. Mensajes con badge, Mi refugio y la campanita), logo y botón de sesión siempre visibles.
- Pasada **página por página en viewport 375px** (usar el preview con `preview_resize` mobile): home, /animales (filtros que hoy ocupan media pantalla → colapsarlos en un panel "Filtros" desplegable), perfil de animal (galería, chat), /mapa, /transito, /refugios, /donaciones, /mi-refugio, /mensajes, formularios de publicar y registro.
- Targets táctiles ≥44px, tipografía legible, sin scroll horizontal, formularios cómodos con teclado virtual.
- Verificar cada pantalla con screenshot mobile antes de dar por terminada.

### 2. Perfiles de refugio ricos
Que la página de cada refugio cuente su historia y se vea viva.
- Nuevos campos editables: historia larga (texto), fotos del refugio (la columna `fotos` jsonb ya existe en `refugios` y no se usa), video (link de YouTube/Instagram embebido **o** archivo subido al bucket, lo que prefieran — el upload reusa `subirArchivos`), y **redes sociales: Instagram y Facebook** (guardarlos dentro de `redes` jsonb que ya existe, con campos separados en el formulario).
- **Botones de Instagram y Facebook en el perfil público**: si el refugio cargó esas redes, mostrar botones bien visibles (con su ícono) que redireccionen a su cuenta; si no las cargó, no mostrar nada. Validar que las URLs sean de instagram.com / facebook.com antes de guardar.
- **Pestaña "Mi perfil" en /mi-refugio**: el refugio edita todo esto cuando quiera, sin pasar por el admin (ya está verificado). Server actions con validación (`campoTexto`, límites de tamaño/tipo de archivo como en animales).
- Página pública /refugios/[slug] rediseñada: hero con fotos, historia, video embebido, botones de Instagram/Facebook/WhatsApp, grilla de sus animales y sus campañas activas.
- El embed de YouTube/Instagram debe sanitizarse: solo aceptar URLs de esos dominios, nunca inyectar HTML arbitrario.

### 3. Donaciones por causa (multi-selección)
- **Categorías fijas de causa**: Cirugías, Refugios, Rescates, Castraciones, Alimento, Plataforma. Agregar columna `causa` a `campanas` (con check constraint); cada campaña de refugio se etiqueta al crearse y el admin la puede corregir.
- En /donaciones el donante **elige una o varias causas** (checkboxes con tarjetas visuales).
- Reparto del monto: el donante elige entre **partes iguales** o **asignar monto por causa** (inputs por causa elegida). Un solo checkout de MercadoPago; al acreditarse, el webhook reparte en `donaciones` creando una fila por causa/campaña con su porción.
- Lo donado a una causa se reparte entre sus campañas activas; si una causa no tiene campañas activas, cae en "Plataforma" (avisarlo en la UI).
- Guardar el desglose para que el admin lo vea y exporte (el CSV de donaciones ya existe).

### 4. Donación mensual (suscripción)
- **MercadoPago Suscripciones** (preapproval API, sin costo extra — solo la comisión normal por cobro). Investigar la API con el MP_ACCESS_TOKEN actual; si el token no tiene permiso de preapproval, anotarlo y caer al plan B: email mensual con link de pago (Resend ya está).
- Página /donaciones/mensual: niveles sugeridos (ej: $2.000 / $5.000 / $10.000) + monto libre.
- Destino: el donante elige **una o varias causas** de las categorías de la tarea 3, **o "donde más se necesite"** (fondo general que el admin asigna).
- **Página "Mi donación mensual"** (con sesión Clerk): ver estado de la suscripción, cambiar monto/causa y cancelar desde AdoptAR (vía API de MP). Tabla nueva `suscripciones` en Supabase (usuario, monto, causas, preapproval_id de MP, estado).
- Webhook de MP para los cobros recurrentes: cada cobro acreditado genera filas en `donaciones` con su causa, así suma a las campañas y a las estadísticas existentes.

### 5. Llenar la web de fotos
La página se siente vacía. **Por ahora fotos de stock libres (Unsplash/Pexels, descargadas a /public o al bucket), y cuando haya muy buenas fotos de animales reales publicados se cambian por esas** — dejar el reemplazo fácil (un solo archivo/constante con las rutas).
- **Hero de la home rediseñado** con collage/grilla de fotos de animales (stock por ahora) en vez de texto plano. Mantener paleta crema/terracota/salvia/sol.
- Sumar imágenes a las secciones que hoy son puro texto: /transito, /refugios (si el refugio no subió fotos, placeholder lindo), /donaciones, página 404, estados vacíos del catálogo y de /mensajes.
- Optimizar con next/image siempre (sizes correctos, priority solo en el LCP).

---

## PENDIENTES QUE REQUIEREN PLATA O TRÁMITES (NO hacer)
- Dominio propio (~USD 10/año) — seguimos con adoptar.dpdns.org gratis.
- Apple OAuth (USD 99/año).
- MercadoPago como ONG (trámite de exención de comisiones).
- "Verificar la marca" en Google (decisión del usuario, no tocar).

---

## REGLAS DE TRABAJO
- Cualquier login/captcha lo hace el usuario (avisale); todo lo demás hacelo vos.
- Código en español (nombres, comentarios, UI), misma paleta y componentes existentes.
- Antes de escribir código de Next.js, leé la guía en `web/node_modules/next/dist/docs/` (esta versión tiene breaking changes).
- Cambios de schema: actualizá `web/supabase/schema.sql` Y aplicalos en la base real vía la API de Supabase (REST con sb_secret_ no ejecuta DDL: usá el endpoint de query del Management API si hay token, o dejá el SQL listo y pedile al usuario que lo pegue en el SQL Editor).
- Seguridad: validación server-side, rate limiting con `limitarPorIp`, nunca exponer la service role key al cliente, escapar HTML en emails con `escaparHtml`, sanitizar URLs de embeds (solo YouTube/Instagram), verificar ownership en cada server action (patrón de `acciones-refugio.ts`).
- Al final de cada tarea: build local, verificá en producción (curl o preview), commiteá y pusheá a `main`.
- Mobile: verificá con el preview en viewport 375px (preview_resize) y sacá screenshots como prueba.
