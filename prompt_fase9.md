# PROMPT — AdoptAR Fase 9: cierres de seguridad, robustez y pulido 🐾

Proyecto AdoptAR — plataforma de adopción de animales en Argentina (Next.js 16 + Supabase + Clerk + MercadoPago + Tailwind 4 + emails). Código en /Users/valentino/Desktop/adoptar/web (fuente en web/src/).

**Regla de oro: costo CERO.** Todo lo que requiera pagar se reemplaza por una alternativa gratuita o se anota como pendiente para cuando haya presupuesto. Nunca contratar nada.

---

## ESTADO ACTUAL (ya hecho y funcionando — NO lo rehagas)

### Infra y deploy
- Sitio EN PRODUCCIÓN: https://adoptar.dpdns.org (dominio gratis dpdns.org, DNS en Vercel). GitHub: https://github.com/00tino/adoptar → push a `main` redeploya solo (Vercel Root Directory: `web`). gh CLI en `~/bin/gh`.
- Supabase ref `mkiedljddnlrncfzbkek`. Schema en `web/supabase/schema.sql`. Migraciones fase 6, 7 y 8 YA aplicadas en prod.
- Clerk producción (Google OAuth propio). MercadoPago producción (alias `adoptar.ayuda`, token `APP_USR-…`). Mail de contacto/recepción: `adoptar.argentina.ayuda@gmail.com`.

### Cómo aplicar DDL / correr SQL en prod (IMPORTANTE)
- No hay token de Management API ni psql. Se usa el **SQL Editor del dashboard de Supabase** controlando el Chrome del usuario con la **extensión Claude in Chrome** (MCP `Claude_in_Chrome`): `list_connected_browsers` → `select_browser` (la Mac es la local) → navegar a `https://supabase.com/dashboard/project/mkiedljddnlrncfzbkek/sql/new` → `javascript_tool`: `window.monaco.editor.getModels()[0].setValue(sql)` y luego clic en el botón "Run". Para UPDATE/DDL aparece un modal "Potential issue detected" → clic en **"Run query"** para confirmar. Resultados: leer celdas con `[role="gridcell"]`.
- OJO 1: el MCP `Control_Chrome` tiene **`execute_javascript` roto** ("Chrome is not running" aunque `list_tabs` funcione). **Usar `Claude_in_Chrome`, NO `Control_Chrome`.**
- OJO 2: `/sql/new` redirige al último snippet guardado (suele abrir "Migración Fase 6"); lo pisás con setValue, conviene restaurarlo después.
- OJO 3: el dashboard de Supabase y otras SPAs (Resend) **no montan bien si la pestaña está en segundo plano** (quedan en "Loading…"). Conviene que la pestaña esté activa.

### Emails (recién resuelto en Fase 8 — leer antes de tocar)
- Gmail rebotaba los mails del dominio gratuito (`hola@adoptar.dpdns.org` vía Resend) con `550-5.7.1 unsolicited mail` por **reputación del dominio gratis**, aunque SPF/DKIM/DMARC estaban OK.
- **Solución actual (gratis): Gmail SMTP** con `nodemailer`. `lib/emails.ts` → `enviarEmail` usa Gmail SMTP si existe `GMAIL_APP_PASSWORD` (manda desde `adoptar.argentina.ayuda@gmail.com`; `GMAIL_USER` por defecto es esa casilla); si no, cae a Resend (`RESEND_API_KEY`). Se normaliza la app password quitando espacios, se manda parte text/plain (`htmlAPlano`), `reply-to` y cabeceras `List-Unsubscribe`.
- `GMAIL_APP_PASSWORD` está cargada en Vercel (app password de la cuenta `adoptar.argentina.ayuda`, que tiene 2-Step Verification activo). **Verificado:** las postulaciones ya salen por Gmail SMTP sin error 535.

### Funcionalidad de Fase 8 (toda hecha y verificada)
- **Alertas de tránsito por cercanía**: tabla `alertas_transito`. `lib/geo.ts` (Haversine + geocodificación Nominatim gratis + desplazamiento ~500 m privacidad). Página `/transito/alertas` con mapa selector (`MapaSelectorInterno` + `FormularioAlerta`: clic/arrastrar/geolocalización + radio 5/10/25/50 y **campo de km manual 1-500**). `lib/acciones-alertas.ts` (una alerta por usuario; `notificarAlertasTransito` se dispara al aprobar un animal de tránsito en `decidirAnimal`). `publicarTransito` geocodifica la zona y guarda coordenada desplazada.
- **Favoritos**: tabla `favoritos`. `lib/acciones-favoritos.ts`, `components/BotonFavorito.tsx` (corazón en `CardAnimal` y en la ficha), vista `/favoritos`, link en el Header.
- **Postulaciones de adopción**: tabla `postulaciones`. `lib/acciones-adopcion.ts` (`postularAdopcion` → email + notificación a quien publica). `components/FormularioAdopcion.tsx` en la ficha. Gestión por el refugio en `/mi-refugio` (`postulacionesDeRefugio`, `cambiarEstadoPostulacion`: postulado→en_proceso→aceptada/rechazada).
- **"Mi historia" del animal**: columna `animales.historia`. Se carga en `publicar-transito` y en el form del refugio (`FormularioAnimal`, publicar/editar) y se muestra en la ficha (`animales/[slug]/page.tsx`). Los animales demo Luna y Rocky ya tienen historia cargada.
- **Filtro "cerca mío"** en `/animales`: `obtenerAnimalesCercanos` (datos.ts) + `components/BotonCercania.tsx` (radio 5/10/25/50/100/sin límite + geolocalización), badge de km en las cards.
- **Compartir nativo** (`components/BotonCompartir.tsx`, Web Share API + copiar link) en ficha de animal y refugio. **OG dinámica por refugio** (`refugios/[slug]/opengraph-image.tsx`); la OG por animal y el schema.org ya existían.
- **Suscripción mensual**: primer cobro inmediato (`auto_recurring.start_date` = ahora en `crearSuscripcion`) + recibo al donante en cada débito (`registrarCobroSuscripcion`).
- **Tests**: `vitest` (`npm test`). `lib/reparto.ts` extraído. Tests en `src/lib/__tests__/` (geo/Haversine, reparto, causas).

### Helpers de la capa de datos/acciones
`lib/archivos.ts`, `lib/limites.ts` (rate limit + `campoTexto`), `lib/emails.ts`, `lib/notificaciones.ts`, `lib/causas.ts`, `lib/embeds.ts`, `lib/datos.ts` (capa de datos), `lib/usuarios.ts` (`asegurarUsuario`/`exigirUsuarioActivo`), `lib/geo.ts`, `lib/reparto.ts`.

---

## TAREAS NUEVAS (Fase 9)

### 1. Cerrar `MP_WEBHOOK_SECRET` (seguridad, prioridad alta)
- Cargar `MP_WEBHOOK_SECRET` en Vercel (se saca de MP → Tus integraciones → app AdoptAR → Webhooks → "Clave secreta"). El código ya valida la firma `x-signature` si la env existe (si falta, loguea y sigue). El login/2FA y el pegado del secreto **los hace el usuario**; guialo paso a paso (Vercel → Settings → Environment Variables → Add → Production → Save → Redeploy).
- Verificar después que el webhook valida bien (logs de Vercel).

### 2. Probar el cobro inmediato de la suscripción en sandbox de MP
- Confirmar que el primer débito de la donación mensual cae **al momento** (no el mes siguiente) y que dispara el webhook de `payment` con `external_reference` `sus:<id>` generando filas en `donaciones` (lo hace `registrarCobroSuscripcion`).
- Protocolo sandbox (gratis): cambiar temporalmente `MP_ACCESS_TOKEN` por el **Access Token de PRUEBA** de la app, agregar `MP_TEST_PAYER_EMAIL` con un usuario comprador de prueba (`POST https://api.mercadopago.com/users/test_user` body `{"site_id":"MLA"}`), pagar con tarjeta de prueba (Visa `4509 9535 6623 3704`, CVV `123`, venc `11/30`, titular `APRO`, DNI `12345678`). **Al terminar SIEMPRE revertir** el token a producción, borrar `MP_TEST_PAYER_EMAIL`, redeploy y limpiar las suscripciones de prueba. El pegado de tokens lo hace el usuario (2FA).

### 3. Monitoreo de errores (gratis)
- Hoy los 500 solo quedan en los logs de Vercel. Integrar **Sentry (free tier, sin costo)** o, si se quiere cero dependencias/cuentas, un **logger propio** que agrupe los errores 500. Que no meta costo ni rompa el build. (Si Sentry pide cuenta/DSN, eso lo carga el usuario; el cableado lo hacés vos.)

### 4. Bug: error `Failed to find Server Action` cada minuto (investigar)
- En los logs de Vercel aparece, **exactamente cada 60 s**, un `POST 404 … Error: Failed to find Server Action "<id>"` sobre la ficha de un animal. Sospecha fuerte: el **chat** (`components/ChatAnimal.tsx`) poolea mensajes con una server action y, **después de cada deploy, el id de la acción cambia**, así que los clientes con la pestaña abierta quedan pegándole a un id viejo y tiran 404 hasta recargar.
- Revisar `ChatAnimal` (y cualquier polling con server actions): que el polling **se recupere solo** (reintento/refresh del componente, o usar un Route Handler / `fetch` a un endpoint estable en vez de una server action para el polling, o degradar elegante). Que no spamee 404 ni rompa la UX. Confirmar en logs que desaparece.

### 5. Email de confirmación al postulante + avisos de estado
- Hoy al postularse para adoptar, solo se le avisa al refugio; el postulante ve un cartel en pantalla pero no recibe email. Sumar un **email "recibimos tu postulación"** al postulante (reusar `lib/emails.ts`, escapar HTML).
- Cuando el refugio cambia el estado de la postulación (aceptada/rechazada), **notificar al postulante** por email y/o notificación in-app.

### 6. Pasada de accesibilidad y performance (gratis)
- Correr **Lighthouse** y atacar lo que marque, sobre todo en **mobile (375px)**. Las imágenes ya usan `next/image` con `sizes`/lazy/alt y hubo toques de a11y, pero falta la auditoría completa (contraste, foco, roles, labels faltantes, peso de JS, LCP).

### 7. Limpieza
- Borrar de la base las **postulaciones de prueba de Luna** que quedaron de los tests de email (varias, con mensajes "Prueba…"). Vía SQL Editor (Claude in Chrome).
- El refugio demo "Patitas del Sur" tiene email `demo@adoptaar.com` (ficticio, con doble "a"). Si molesta para pruebas, corregirlo o dejarlo documentado.

---

## TAREAS DE PRODUCTO (gratis, si hay tiempo)
- Reenganchar el flujo de adopción con el chat existente (que postularse y chatear no queden desconectados).
- Estado del animal visible para el adoptante (seguimiento "postulado → en proceso → adoptado").
- Mejoras de SEO que falten en el sitemap (incluir `/transito/alertas`, `/favoritos` quedan noindex a propósito; revisar que las páginas públicas nuevas estén).

---

## PENDIENTES QUE REQUIEREN PLATA O TRÁMITES (NO hacer — dejar anotado)
- **Dominio propio** (~USD 10/año): además de lo obvio, permitiría **volver a Resend** con buena reputación y dejar de depender de Gmail SMTP. Hoy Gmail SMTP cubre el envío gratis.
- **Apple OAuth** (USD 99/año).
- **MercadoPago como ONG** (trámite de exención de comisiones).
- **Reemplazo de fotos stock por reales** (centralizadas en `src/lib/fotos.ts`).
- "Verificar la marca" en Google (decisión del usuario, no tocar).

---

## REGLAS DE TRABAJO
- Cualquier login/captcha/2FA/pegado de credenciales (tokens, secrets, app passwords) lo hace el usuario (avisale); todo lo demás hacelo vos, incluido el SQL Editor de Supabase vía la extensión **Claude in Chrome** (NO Control_Chrome) si hace falta DDL.
- Código en español (nombres, comentarios, UI), misma paleta y componentes existentes.
- Antes de escribir código de Next.js, leé la guía en `web/node_modules/next/dist/docs/` (esta versión tiene breaking changes).
- Cambios de schema: actualizá `web/supabase/schema.sql` Y aplicalos en la base real, dejando también un `web/supabase/migracion-fase9.sql`.
- Seguridad: validación server-side, rate limiting con `limitarPorIp`, `exigirAdmin()` en el panel, escapar HTML en emails con `escaparHtml`, sanitizar embeds, verificar ownership en cada server action, nunca exponer la service role key.
- Al final de cada tarea: build local (`npx next build`) y `npm test`, verificá en producción (logs de Vercel / preview / Chrome), commiteá y pusheá a `main`.
- Mobile: verificá con viewport 375px y sacá screenshots como prueba.
