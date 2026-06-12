# PROMPT — AdoptAR Fase 5: de demo a producto real 🐾

Proyecto AdoptAR — plataforma de adopción de animales (Next.js 16 + Supabase + Clerk + MercadoPago + Tailwind 4 + Resend), código en /Users/valentino/Desktop/adoptar/web (el código fuente está en web/src/).

**Regla de oro: costo CERO.** Todo lo que requiera pagar (dominio propio, Apple OAuth, etc.) NO se hace: se busca alternativa gratuita o se deja anotado como pendiente para cuando haya presupuesto.

---

## ESTADO ACTUAL (ya hecho y funcionando — NO lo rehagas)

- Sitio EN PRODUCCIÓN: https://adoptar.dpdns.org (DNS delegado a ns1/ns2.vercel-dns.com, lo maneja Vercel).
- GitHub: https://github.com/00tino/adoptar — push a `main` redeploya solo (Vercel Root Directory: `web`). gh CLI en `~/bin/gh`.
- Vercel CLI logueado (team 00tinos-projects, proyecto "adoptar"). Token en `~/Library/Application Support/com.vercel.cli/auth.json`, teamId `team_YFcmPaqox6TxnR5EXKvdQGrM`. Deploy manual: `npx vercel --prod --yes` desde la raíz del repo (NO desde web/). Registros DNS: API de Vercel (`POST https://api.vercel.com/v2/domains/adoptar.dpdns.org/records?teamId=…`).
- Supabase ref `mkiedljddnlrncfzbkek` (claves `sb_publishable_`/`sb_secret_`). Schema en `web/supabase/schema.sql`. Bucket Storage `media` ya recibe fotos/videos.
- Clerk EN PRODUCCIÓN (pk_live/sk_live en Vercel y web/.env.local), Google OAuth propio funcionando (proyecto GCP arctic-plate-370616).
- MercadoPago producción activo (MP_ACCESS_TOKEN), webhook de donaciones funcionando.
- Resend con dominio verificado: remitente `AdoptAR <hola@adoptar.dpdns.org>` (src/lib/emails.ts). OJO: la RESEND_API_KEY es send-only, no maneja dominios por API.
- Imágenes OG dinámicas con next/og (home y por animal, hoy con placeholder gradiente+emoji), metadataBase correcto, sitemap, robots, Schema.org.
- Notificaciones de chat por email, bidireccionales, con throttle 1 email/conversación/hora.
- Filtros en /animales: especie, provincia, tipo, tamaño, edad, sexo, búsqueda libre (server-side, URLs compartibles).
- Logo en `web/public/logo-adoptar.png` (huella terracota + wordmark), ya subido al consent screen de Google (falta "Verificar la marca" — decisión del usuario, no lo toques).
- Funcionalidades vivas: catálogo, perfil de animal, mapa Leaflet con clustering y "cerca mío", flujo de tránsito para particulares, registro de refugios, donaciones con MercadoPago, chat in-app (polling 5s), panel admin con cola de aprobaciones (refugios/animales/campañas, incluye marcar refugio "estrella") y estadísticas básicas, rate limiting, emails de aprobación/rechazo.

---

## TAREAS (en orden de prioridad)

### 1. Fotos reales de los animales (LO MÁS IMPORTANTE)
El formulario de tránsito ya sube fotos/video a Supabase Storage y se guardan en las columnas `fotos` (jsonb) y `video_url` de `animales`, pero el frontend NUNCA las lee: el tipo `Animal` (src/lib/tipos.ts) ni `filaAAnimal` (src/lib/datos.ts) tienen campo de fotos, y todo muestra el placeholder gradiente+emoji (src/components/FotoAnimal.tsx).
- Agregar `fotos: string[]` y `videoUrl` al tipo y al mapeo.
- `FotoAnimal` debe mostrar la primera foto real si existe (con `next/image`, configurando el dominio de Supabase en next.config) y caer al placeholder si no hay.
- Galería en el perfil del animal (/animales/[slug]): todas las fotos + video si hay.
- La imagen OG por animal (opengraph-image.tsx) debe usar la foto real si existe.
- Los animales demo no tienen fotos: subí 2-3 fotos libres (Unsplash/Pexels, gratis) al bucket para al menos un animal demo y verificá todo el circuito en producción.

### 2. Panel del refugio ("Mi refugio")
Hoy un refugio no puede gestionar nada: no hay forma de publicar un animal como refugio, ni marcar "en proceso"/"adoptado", ni editar.
- Página /mi-refugio (solo para usuarios cuyo `usuario_id` esté en `refugios` con estado verificado/estrella): lista de sus animales con cambio de estado (disponible → en_proceso → adoptado), editar y dar de baja.
- Formulario "publicar animal" para refugios (reusar lógica de publicar-transito, con fotos). Si el refugio es `estrella`, el animal nace `disponible` sin aprobación; si es `verificado`, nace `pendiente` y entra a la cola del admin.
- Link "Mi refugio" en el Header solo si corresponde.

### 3. Bandeja de conversaciones
El chat vive dentro de cada publicación; un refugio con muchos animales no sabe dónde le escribieron.
- Página /mensajes (con sesión): lista de conversaciones del usuario (agrupadas por animal + interlocutor), con último mensaje, fecha y no-leídos (usar el campo `leido` que ya existe en `mensajes`).
- Marcar como leídos al abrir. Link en el Header con badge de no-leídos.
- El link de los emails de chat puede apuntar acá.

### 4. Completar el admin
- Gestión de usuarios: buscar por email/nombre, suspender/reactivar (campo `suspendido` ya existe en `usuarios`; hacer que las acciones del server lo respeten).
- Exportar CSV: animales, refugios, donaciones, usuarios (server action que genera el CSV, sin librerías pagas).
- Estadística simple de evolución mensual (animales publicados/adoptados por mes) — con lo que ya hay en la base, sin servicios externos.

### 5. Pulido del catálogo y perfil
- Paginación en /animales (server-side, ?pagina=N, compatible con los filtros).
- Filtro castrado/esterilizado.
- Mini-mapa Leaflet en el perfil del animal con ubicación aproximada (para particulares, coordenada desplazada ~500m — revisar que ya se guarde así; si no, desplazarla al mostrar).

### 6. Ratings (si queda tiempo)
Tabla `ratings` ya existe en el schema, no hay nada de código. Refugios califican usuarios (1-5 estrellas + comentario), visible SOLO para otros refugios (en el server, nunca exponerlo a usuarios comunes). UI mínima: en el chat o en el perfil del usuario que publicó en tránsito.

### 7. Notificaciones in-app (si queda tiempo)
Tabla `notificaciones` ya existe. Campanita en el Header con dropdown de no-leídas; crear notificación en los mismos triggers que ya mandan email (aprobaciones, rechazos, mensajes).

---

## PENDIENTES QUE REQUIEREN PLATA O TRÁMITES (NO hacer — dejar para cuando haya presupuesto)
- Dominio propio (adoptaar.com / adoptar.com.ar, ~USD 10/año) — hoy se usa adoptar.dpdns.org gratis.
- Apple OAuth (Apple Developer USD 99/año).
- MercadoPago como ONG (trámite para exención de comisiones).
- "Verificar la marca" en Google (gratis pero dispara review — decisión del usuario).

---

## REGLAS DE TRABAJO
- Cualquier login/captcha lo hace el usuario (avisale); todo lo demás hacelo vos.
- El código sigue el estilo existente: español en nombres, comentarios y UI; misma paleta (crema/terracota/salvia/sol) y componentes existentes.
- Antes de escribir código de Next.js, leé la guía correspondiente en `web/node_modules/next/dist/docs/` (esta versión tiene breaking changes).
- Seguridad: validación server-side, rate limiting con `limitarPorIp` (src/lib/limites.ts), nunca exponer la service role key al cliente, escapar HTML en emails con `escaparHtml`.
- Al final de cada tarea: verificá en producción (curl o browser), commiteá y pusheá a `main` para deployar.
- Si una mejora implica un servicio pago, buscá alternativa gratuita o anotala como pendiente — nunca contrates nada.
