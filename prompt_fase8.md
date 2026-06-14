# PROMPT — AdoptAR Fase 8: alertas de tránsito, cobro inmediato y robustez 🐾

Proyecto AdoptAR — plataforma de adopción de animales (Next.js 16 + Supabase + Clerk + MercadoPago + Tailwind 4 + Resend), código en /Users/valentino/Desktop/adoptar/web (fuente en web/src/).

**Regla de oro: costo CERO.** Todo lo que requiera pagar se reemplaza por una alternativa gratuita o se anota como pendiente para cuando haya presupuesto. Nunca contratar nada.

---

## ESTADO ACTUAL (ya hecho y funcionando — NO lo rehagas)

- Sitio EN PRODUCCIÓN: https://adoptar.dpdns.org (DNS en Vercel). GitHub: https://github.com/00tino/adoptar — push a `main` redeploya solo (Vercel Root Directory: `web`). gh CLI en `~/bin/gh`.
- Supabase ref `mkiedljddnlrncfzbkek`. Schema en `web/supabase/schema.sql`. Migraciones fase 6 y 7 YA aplicadas en prod (incluye `donaciones.campana_id` nullable con check de causa = "caja"). Bucket público `media`. Para DDL no hay token de Management API ni psql: se usa el SQL Editor del dashboard vía el Chrome del usuario (`window.monaco.editor.getModels()[0].setValue(sql)` + Run) — OJO: /sql/new puede abrir el último snippet guardado, verificá qué modelo pisás.
- Clerk producción (Google OAuth propio), MercadoPago producción (alias `adoptar.ayuda`, token `APP_USR-…`), Resend con dominio verificado (`AdoptAR <hola@adoptar.dpdns.org>`). Mail de contacto/recepción: `adoptar.argentina.ayuda@gmail.com`.
- **Fase 7 completa**: admin al 100% (layout con pestañas + búsqueda global en `lib/acciones-admin-gestion.ts`; secciones animales/refugios/campañas/donaciones/suscripciones con filtros, paginado, edición, registrar transferencia, reasignar donaciones "en caja"); circuito de donaciones cerrado (caja real, firma webhook x-signature con `MP_WEBHOOK_SECRET` —si falta, loguea y sigue—, email de gracias al donante + email/notificación al refugio); legales (/quienes-somos, /terminos, /privacidad + footer + sitemap + desglose "¿Cómo usamos tu donación?"); Vercel Analytics + PWA (manifest + íconos 192/512); fixes de suscripción (asegurarUsuario reclama fila por email; estados pendientes con descartar/reintentar; `components/BotonEnvio.tsx` con useFormStatus; **sincronización del preapproval al volver de MP**, porque MP NO notifica por webhook la autorización del preapproval, solo los cobros mensuales).
- Helpers: `lib/archivos.ts` (slugs + upload), `lib/limites.ts` (rate limit + campoTexto), `lib/emails.ts` (Resend + escaparHtml + plantilla), `lib/notificaciones.ts` (crearNotificacion), `lib/causas.ts`, `lib/embeds.ts`, `lib/datos.ts` (capa de datos), `lib/usuarios.ts` (asegurarUsuario).

---

## TAREAS NUEVAS PEDIDAS POR EL USUARIO (prioridad alta)

### 1. Alertas de tránsito por cercanía (gratis, con Resend)
Que alguien dispuesto a hacer tránsito pueda **activar una alerta** y, cada vez que se publique un animal que necesita tránsito **dentro de un radio X de su ubicación**, le llegue un **email con todos los datos del animal**.
- **Tabla nueva** `alertas_transito` (id, usuario_id, lat, lng, radio_km, activa, creado_el). Agregar a `schema.sql` Y aplicar en prod por el SQL Editor. RLS on, solo server con service role.
- **UI** (idealmente en `/transito` o una página propia tipo `/transito/alertas`): el usuario logueado elige su ubicación (reusar el patrón de `MiniMapa`/coordenadas que ya existe; pedir ciudad o pin en mapa) y un radio (ej: 5/10/25/50 km), y activa/desactiva la alerta. Solo una alerta activa por usuario (o varias, decidir simple). Avisar que se usa para mandarle mails.
- **Disparo**: cuando un animal de `tipo='transito'` pasa a `estado='disponible'` (es decir, cuando el admin lo aprueba en `decidirAnimal` de `lib/acciones-admin.ts`, o cuando un refugio estrella lo publica directo), buscar las alertas activas cuyo radio cubra la `lat_aprox/lng_aprox` del animal y mandar un email a cada una con: nombre, especie, ciudad/provincia, descripción, foto y link a la ficha. Cálculo de distancia con fórmula de Haversine en JS (sin PostGIS), o filtrando primero por bounding box. Reusar `lib/emails.ts` (nueva función `emailAlertaTransito`, escapar HTML). Que un fallo de email no corte la aprobación.
- Privacidad: para particulares solo hay coordenada desplazada (~500 m), alcanza para el radio. No exponer datos personales del que publica.

### 2. Centrar el texto de "Nuestra historia" del refugio
En `src/app/refugios/[slug]/page.tsx` (sección HISTORIA, ~línea 172): hoy el `<div>` de los párrafos es `max-w-3xl ... text-tinta` alineado a la izquierda. Centrarlo: agregar `mx-auto text-center` al contenedor (y dejar el `<h2>` también centrado para que quede coherente). Verificar en mobile (375px).

### 3. Primer cobro inmediato al suscribirse a la donación mensual
Hoy `crearSuscripcion` (en `lib/acciones-suscripciones.ts`) crea un `PreApproval` con `auto_recurring` pero el primer débito puede caer recién el mes siguiente (en la prueba MP dijo "próximo pago el 14/jul"). Queremos que **el primer pago se haga al momento** de autorizar.
- Investigar en la doc de MP (esta versión del SDK `mercadopago`) la forma correcta: típicamente setear `auto_recurring.start_date` a "ahora" (ISO) para que el primer cobro sea inmediato, o crear un pago inicial además del preapproval. Probar en **sandbox** (ver más abajo) antes de prod.
- Asegurar que el cobro inmediato dispare el webhook de `payment` con `external_reference` `sus:<id>` y genere las filas en `donaciones` (eso ya lo hace `registrarCobroSuscripcion`). Verificar el circuito completo.

---

## TAREAS DE CIERRE Y ROBUSTEZ (gratis)

### 4. Cerrar pendientes de la Fase 7
- **`MP_WEBHOOK_SECRET`**: cargarlo en Vercel (se saca de MP → Tus integraciones → app AdoptAR → Webhooks → Clave secreta). El código ya valida la firma si la env existe. Es un cierre de seguridad rápido — guiar al usuario para el paso (login/2FA y pegado de secreto lo hace él).
- **Recibo/agradecimiento en cada cobro mensual**: hoy el email de gracias sale en donaciones puntuales; sumar un email al donante en cada débito de suscripción (desde `registrarCobroSuscripcion`).

### 5. Tests y monitoreo (gratis)
- No hay tests automatizados. Agregar unos pocos sobre las server actions críticas (donaciones por causa/reparto, suscripciones, acciones de admin con `exigirAdmin`, Haversine de las alertas). Elegir runner liviano que ya soporte el stack.
- **Monitoreo de errores**: integrar algo tipo Sentry (free tier, sin costo) o, si se quiere cero dependencias, un logger propio que agrupe los 500. Que no meta costo ni rompanga el build.

---

## TAREAS DE PRODUCTO (gratis, valor alto — hacer si hay tiempo)

### 6. Experiencia del adoptante
- **Favoritos**: guardar animales favoritos por usuario (tabla simple) y una vista "Mis favoritos".
- **Filtro "cerca mío"**: geolocalización del navegador para ordenar el catálogo por cercanía (reusa coordenadas existentes).

### 7. Flujo de adopción
- Más allá del chat actual, un **formulario de adopción** y un seguimiento de estado del animal (postulado → en proceso → adoptado) visible para el refugio en `/mi-refugio`.

### 8. SEO y compartir
- OG image dinámica por animal/refugio (Next `opengraph-image`), datos estructurados schema.org (Pet/Organization), botón compartir nativo. Sumar al sitemap lo que falte.

### 9. Accesibilidad y performance
- Pasada de a11y (labels, foco, contraste, roles) y de Lighthouse; revisar imágenes (tamaños, lazy) para mobile.

---

## CÓMO PROBAR PAGOS DE MP EN SANDBOX (importante para tareas 1.3 y 3)
La cuenta colectora del `MP_ACCESS_TOKEN` de producción es la MISMA del usuario (`fonteviva.valen.tino00@gmail.com`), así que **no se puede pagar a uno mismo** con el token real → el botón "Confirmar" de MP queda deshabilitado. Para testear suscripciones/pagos:
1. Usar el **Access Token de PRUEBA** de la app (MP → app AdoptAR → Credenciales de prueba) cambiando temporalmente `MP_ACCESS_TOKEN` en Vercel (el pegado del token lo hace el usuario; requiere 2FA).
2. Agregar temporalmente `MP_TEST_PAYER_EMAIL` con un **usuario comprador de prueba** (crear con `POST https://api.mercadopago.com/users/test_user` body `{"site_id":"MLA"}`), porque MP exige que pagador y cobrador sean ambos de prueba o ambos reales. El código de `crearSuscripcion` ya respeta `MP_TEST_PAYER_EMAIL` si existe.
3. Pagar con tarjeta de prueba (Visa `4509 9535 6623 3704`, CVV `123`, venc `11/30`, titular `APRO`, DNI `12345678`).
4. **Al terminar SIEMPRE revertir**: volver `MP_ACCESS_TOKEN` al token de producción (`APP_USR-…`, desde Credenciales de producción), **borrar** `MP_TEST_PAYER_EMAIL`, redeploy, y limpiar las suscripciones de prueba en la base (service role). Durante la ventana de prueba un donante real no puede pagar, así que dejarla corta.

---

## PENDIENTES QUE REQUIEREN PLATA O TRÁMITES (NO hacer)
- Dominio propio (~USD 10/año) — seguimos con adoptar.dpdns.org gratis.
- Apple OAuth (USD 99/año).
- MercadoPago como ONG (trámite de exención de comisiones).
- Reemplazo de fotos stock por reales (centralizadas en `src/lib/fotos.ts`).
- "Verificar la marca" en Google (decisión del usuario, no tocar).

---

## REGLAS DE TRABAJO
- Cualquier login/captcha/2FA/pegado de credenciales (tokens, secrets) lo hace el usuario (avisale); todo lo demás hacelo vos (incluido el SQL Editor de Supabase vía su Chrome si hace falta DDL).
- Código en español (nombres, comentarios, UI), misma paleta y componentes existentes.
- Antes de escribir código de Next.js, leé la guía en `web/node_modules/next/dist/docs/` (esta versión tiene breaking changes).
- Cambios de schema: actualizá `web/supabase/schema.sql` Y aplicalos en la base real (SQL Editor vía Chrome del usuario), dejando también un `web/supabase/migracion-fase8.sql`.
- Seguridad: validación server-side, rate limiting con `limitarPorIp`, `exigirAdmin()` en el panel, escapar HTML en emails con `escaparHtml`, sanitizar embeds, verificar ownership en cada server action, nunca exponer la service role key.
- Al final de cada tarea: build local (`npx next build`), verificá en producción (curl o el preview/Chrome), commiteá y pusheá a `main`.
- Mobile: verificá con viewport 375px y sacá screenshots como prueba.
- Nota de entorno: el plugin `claude-mem` quedó desactivado en `~/.claude/settings.json` por un hook que fallaba; si reaparece el error, ignorarlo o reactivarlo solo si su worker funciona.
