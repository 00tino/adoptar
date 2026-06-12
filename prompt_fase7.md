# PROMPT — AdoptAR Fase 7: admin al 100%, búsqueda total y cierre del circuito de donaciones 🐾

Proyecto AdoptAR — plataforma de adopción de animales (Next.js 16 + Supabase + Clerk + MercadoPago + Tailwind 4 + Resend), código en /Users/valentino/Desktop/adoptar/web (fuente en web/src/).

**Regla de oro: costo CERO.** Todo lo que requiera pagar se reemplaza por una alternativa gratuita o se anota como pendiente para cuando haya presupuesto. Nunca contratar nada.

---

## ESTADO ACTUAL (ya hecho y funcionando — NO lo rehagas)

- Sitio EN PRODUCCIÓN: https://adoptar.dpdns.org (DNS en Vercel, ns1/ns2.vercel-dns.com).
- GitHub: https://github.com/00tino/adoptar — push a `main` redeploya solo (Vercel Root Directory: `web`). gh CLI en `~/bin/gh`. Deploy manual: `npx vercel --prod --yes`.
- Supabase ref `mkiedljddnlrncfzbkek`. Schema en `web/supabase/schema.sql` (migración fase 6 YA aplicada en prod: `refugios.historia`, `campanas.causa`, `donaciones.causa/grupo_id/mp_pago_id`, tabla `suscripciones`). Bucket público `media`. OJO: para REST/Storage con la `sb_secret_` van los headers `apikey` Y `Authorization: Bearer`. Para DDL: no hay token de Management API ni psql — se usa el SQL Editor del dashboard vía el Chrome del usuario (Claude in Chrome, `window.monaco.editor.getModels()[0].setValue(sql)` + Run), o se le deja el SQL listo.
- Clerk producción (Google OAuth propio), MercadoPago producción (alias `adoptar.ayuda`, webhook de donaciones y suscripciones andando, preapproval verificado), Resend con dominio verificado (`AdoptAR <hola@adoptar.dpdns.org>`). Mail de contacto/recepción: `adoptar.argentina.ayuda@gmail.com` (ya está en /donaciones, /transito y formularios).
- Fase 5: fotos reales de animales, panel /mi-refugio, /mensajes con badge, admin con cola de aprobación + usuarios + CSV + evolución mensual, catálogo paginado con filtros, mini-mapa, ratings, notificaciones in-app.
- Fase 6 completa: header con menú hamburguesa (`MenuMovil`, link activo con `LinkNav`), filtros mobile colapsables, perfiles de refugio ricos (historia/fotos/video sanitizado en `lib/embeds.ts`/redes IG-FB, pestañas Mis animales | Campañas | Mi perfil), donaciones por causa (`lib/causas.ts`, 6 causas fijas, multi-selección con reparto, webhook por `grupo:<uuid>`), donación mensual con MP preapproval (`lib/acciones-suscripciones.ts`, /donaciones/mensual con alta/cambio/cancelación, cobros `sus:<id>` con dedupe `mp_pago_id`), fotos stock centralizadas en `src/lib/fotos.ts`, robots/sitemap con dominio correcto.
- Helpers: `lib/archivos.ts` (slugs + upload), `lib/limites.ts` (rate limit + campoTexto), `lib/emails.ts` (Resend + escaparHtml), `lib/causas.ts`, `lib/embeds.ts`.

---

## TAREAS (en orden de prioridad)

### 1. Dashboard admin al 100% con búsqueda total (LO MÁS IMPORTANTE)
Hoy /admin tiene cola de aprobación, búsqueda de usuarios, stats y CSV, pero todo lo demás se toca a mano en la base. Quiero **gestionar TODO desde el dashboard**:
- **Búsqueda global**: un buscador arriba de todo que busque a la vez en animales (nombre, slug, ciudad), refugios (nombre, ciudad, email), campañas (título, causa), usuarios (email, nombre) y donaciones (donante). Resultados agrupados por tipo, con link directo a la ficha/sección de cada uno. Server-side, con `ilike` y límite por grupo.
- **Sección Animales**: listar TODOS (no solo pendientes) con filtros por estado/especie/tipo y búsqueda; acciones por fila: cambiar estado, editar (reusar `FormularioAnimal`), dar de baja. Paginado.
- **Sección Refugios**: listar todos con filtros por estado; acciones: cambiar estado (verificado/estrella/suspendido), ver ficha completa (datos + redes + fotos), link al perfil público.
- **Sección Campañas**: listar todas (activas/pendientes/cerradas) con su causa, recaudado y refugio; acciones: aprobar/rechazar/cerrar, **corregir causa** (hoy solo se puede en pendientes), editar título/descripcion/meta.
- **Sección Donaciones**: listar con filtros por estado/método/causa/campaña y rango de fechas; total filtrado visible. **Formulario "registrar transferencia"**: campaña + monto + nombre del donante → fila `metodo: transferencia, estado: acreditada` (cierra el circuito del alias `adoptar.ayuda`).
- **Sección Suscripciones**: listar donantes mensuales (monto, causas, estado, fecha) con totales.
- Navegación del admin por pestañas o sidebar (mismo patrón visual del sitio), todo mobile-friendly.
- Seguridad: TODA action nueva con `exigirAdmin()`, validación server-side y revalidatePath. Nada de exponer la service role key.

### 2. Cerrar el circuito de donaciones
- **"Caja" real para causas sin campañas**: hoy lo donado a una causa sin campañas activas cae en la campaña de Plataforma. Modelarlo de verdad: permitir `campana_id` null en `donaciones` (con causa obligatoria en ese caso) o campaña "caja" oculta por causa, y UI en admin para **reasignar** esas donaciones cuando se cree una campaña de esa causa. La UI pública ya promete esto ("queda en una caja para las próximas campañas").
- **Validar la firma del webhook de MP** (header `x-signature`, secret en env `MP_WEBHOOK_SECRET` — si falta el secret, loguear y seguir como hoy). Documentar en el código cómo obtenerlo del panel de MP.
- **Email de agradecimiento al donante** (si dejó nombre + el pago tiene email) y **notificación in-app + email al refugio** cuando su campaña recibe una donación acreditada. Reusar `lib/emails.ts` y `lib/notificaciones.ts`.

### 3. Confianza y legales (gratis y rinde mucho)
- Páginas **/quienes-somos**, **/terminos** y **/privacidad**: texto claro y honesto en español (plataforma sin fines de lucro, qué datos se guardan, Clerk/Supabase/MP como procesadores, mail de contacto `adoptar.argentina.ayuda@gmail.com`). Linkearlas desde el Footer.
- En /donaciones, sección corta "¿Cómo usamos tu donación?" con el desglose por causa (datos reales de la vista `campanas_con_recaudado` / donaciones acreditadas).
- Agregar las páginas al sitemap.

### 4. Probar la suscripción end-to-end con plata real
- Suscripción de $100 con la cuenta del usuario (el checkout de MP lo completa él: avisale y esperá su confirmación), verificar que el webhook genere las filas en `donaciones`, que aparezca en "Mi donación mensual" y en la nueva sección de admin, y después cancelarla desde la página y verificar el estado en MP.
- Dejar logueado en memoria cualquier sorpresa de la API real (formato de eventos, tiempos).

### 5. Analytics y PWA (mejoras baratas)
- **Vercel Analytics** (plan free, `@vercel/analytics`) — sin cookies, sin banner.
- **PWA instalable**: `manifest.webmanifest` (nombre, colores de la paleta, íconos desde el favicon de huella en tamaños 192/512) + meta theme-color. Sin service worker complejo: con que se pueda "Agregar a la pantalla de inicio" alcanza.
- Reemplazo futuro de fotos stock: ya está centralizado en `src/lib/fotos.ts`, no tocar salvo que haya fotos reales buenas.

---

## PENDIENTES QUE REQUIEREN PLATA O TRÁMITES (NO hacer)
- Dominio propio (~USD 10/año) — seguimos con adoptar.dpdns.org gratis.
- Apple OAuth (USD 99/año).
- MercadoPago como ONG (trámite de exención de comisiones).
- "Verificar la marca" en Google (decisión del usuario, no tocar).

---

## REGLAS DE TRABAJO
- Cualquier login/captcha lo hace el usuario (avisale); todo lo demás hacelo vos (incluido el SQL Editor de Supabase vía su Chrome si hace falta DDL).
- Código en español (nombres, comentarios, UI), misma paleta y componentes existentes.
- Antes de escribir código de Next.js, leé la guía en `web/node_modules/next/dist/docs/` (esta versión tiene breaking changes).
- Cambios de schema: actualizá `web/supabase/schema.sql` Y aplicalos en la base real (SQL Editor vía Chrome del usuario).
- Seguridad: validación server-side, rate limiting con `limitarPorIp`, `exigirAdmin()` en todo el panel, escapar HTML en emails con `escaparHtml`, sanitizar embeds, verificar ownership en cada server action.
- Al final de cada tarea: build local, verificá en producción (curl o preview), commiteá y pusheá a `main`.
- Mobile: verificá con el preview en viewport 375px (preview_resize) y sacá screenshots como prueba.
