# PROMPT — AdoptAR Fase 10: importador de bases de refugios + camino al lanzamiento 🐾

Proyecto **AdoptAR** — plataforma de adopción de animales en Argentina (Next.js 16 + Supabase + Clerk + MercadoPago + Tailwind 4 + emails). Código en `/Users/valentino/Desktop/adoptar/web` (fuente en `web/src/`).

**Regla de oro: costo CERO.** Todo lo que requiera pagar un servicio se reemplaza por una alternativa gratuita o se anota como pendiente para cuando haya presupuesto. Nunca contratar nada. (Las **librerías npm open-source son gratis** y sí se pueden usar; "costo" se refiere a servicios/planes pagos y APIs con costo.)

---

## ESTADO ACTUAL (ya hecho y funcionando — NO rehacer)

### Infra y deploy
- Sitio EN PRODUCCIÓN: https://adoptar.dpdns.org (dominio gratis dpdns.org, DNS en Vercel). GitHub: https://github.com/00tino/adoptar → push a `main` redeploya solo (Vercel Root Directory: `web`). gh CLI en `~/bin/gh` (usar `PATH="$HOME/bin:$PATH"`).
- Supabase ref `mkiedljddnlrncfzbkek`. Schema en `web/supabase/schema.sql`. Migraciones fases 6–9 YA aplicadas en prod.
- Clerk producción (Google OAuth propio; las claves de prod están atadas al dominio `adoptar.dpdns.org`, así que **el login NO funciona en localhost ni en previews** — eso es esperado). MercadoPago producción (alias `adoptar.ayuda`).

### Cómo aplicar DDL / correr SQL en prod (IMPORTANTE)
- No hay token de Management API ni psql. Se usa el **SQL Editor del dashboard de Supabase** controlando el Chrome del usuario con la extensión **Claude in Chrome** (MCP `Claude_in_Chrome`): `list_connected_browsers` → `select_browser` → navegar a `https://supabase.com/dashboard/project/mkiedljddnlrncfzbkek/sql/new` → con `javascript_tool`: `monaco.editor.getModels()[0].setValue(sql)` y luego clic en "Run". Para DELETE/DDL aparece un modal "Potential issue detected" → clic en **"Run query"**.
- OJO: usar **`Claude_in_Chrome`, NO `Control_Chrome`** (este último tiene `execute_javascript` roto). Las SPA de Supabase no montan bien si la pestaña está en segundo plano: tomar un screenshot primero para que renderice.
- Crear **buckets de Storage** también se hace por el dashboard de Supabase (Storage → New bucket) vía Claude in Chrome, o por SQL.

### Credenciales / acciones que SIEMPRE hace el usuario (no el asistente)
Cualquier login/captcha/2FA y el **pegado de credenciales** (tokens, secrets, app passwords, API keys) lo hace el usuario por una regla de seguridad. El asistente guía paso a paso y hace todo lo demás (incluido el SQL Editor vía Claude in Chrome).

### Emails (resuelto en Fase 8)
- Gmail SMTP con `nodemailer` (`lib/emails.ts` → `enviarEmail`): usa Gmail SMTP si existe `GMAIL_APP_PASSWORD` (manda desde `adoptar.argentina.ayuda@gmail.com`), si no cae a Resend. Verificado funcionando. Escapar HTML con `escaparHtml`. Plantilla `plantilla(titulo, cuerpo)`.

### Funcionalidad existente (toda hecha y verificada)
- **Catálogo** `/animales` con filtros (especie, provincia, tamaño, edad, sexo, castrado, búsqueda) + "cerca mío" (geo, radio). **Ficha** `/animales/[slug]` con galería, mini-mapa, compartir nativo, OG dinámica, schema.org, chat interno y formulario de adopción.
- **Refugios**: `/refugios`, perfil rico `/refugios/[slug]`, registro `/registrar-refugio`. Panel **`/mi-refugio`** (publicar, editar, perfil, campañas, gestión de postulaciones). `FormularioAnimal` (publicar/editar) es el formulario canónico de un animal.
- **Favoritos**: tabla `favoritos`, `lib/acciones-favoritos.ts` (`alternarFavorito` idempotente con flag `fav`, `idsFavoritos`, `misFavoritos`), `components/BotonFavorito.tsx` (corazón SVG con animación de rebote + explosión, CSS puro, `prefers-reduced-motion`). Vista `/favoritos`.
- **Postulaciones de adopción**: tabla `postulaciones`, `lib/acciones-adopcion.ts` (`postularAdopcion` → email al postulante + al refugio + notificación + siembra un mensaje en el chat del animal; `misPostulaciones`). Página del adoptante **`/mis-postulaciones`** con seguimiento de estado (postulado→en_proceso→aceptada/rechazada). Gestión por el refugio en `/mi-refugio` (`cambiarEstadoPostulacion`, con email + notif al postulante).
- **Chat** in-app por animal: `components/ChatAnimal.tsx` (poolea vía Route Handler estable `/api/chat/[animalId]`, NO server action), `lib/acciones-chat.ts`. Bandeja `/mensajes`.
- **Alertas de tránsito por cercanía**: tabla `alertas_transito`, `/transito/alertas`, `lib/geo.ts` (Haversine + Nominatim gratis).
- **Donaciones**: campañas/causas, caja de donaciones, **suscripción mensual** (`/donaciones/mensual`, `lib/acciones-suscripciones.ts`, preapproval MP con primer cobro inmediato `start_date: now`, `external_reference` `sus:<id>`). **Webhook MP** configurado (Modo productivo + prueba → `/api/mercadopago/webhook`, evento Pagos), `MP_WEBHOOK_SECRET` cargado y **verificado (firma valida, 200 OK)**.
- **Admin** completo (`/admin/...`), ratings entre refugios, notificaciones (campanita), PWA.
- **Header** (rediseñado): en desktop el catálogo (Animales/Tránsito/Refugios/Mapa) + Donar + Publicar van inline; lo personal cuelga del menú del avatar `components/MenuCuenta.tsx` (cierra al clic afuera/Escape, animado). En mobile, `components/MenuMovil.tsx` (hamburguesa). Punto de aviso si hay mensajes/notificaciones sin ver.
- **Monitoreo**: `lib/monitoreo.ts` + `instrumentation.ts` (`onRequestError`) agrupan los 500 con prefijo `[ERROR500]`; reenvío opcional si se setea `ERROR_WEBHOOK_URL`.
- **Tests**: `vitest` (`npm test`). Tests en `src/lib/__tests__/` (geo, reparto, causas).
- **Auditoría Lighthouse (mobile, prod):** Accesibilidad 100, SEO 100, Best-practices 100, Performance 76 (lo limita el JS third-party de Clerk; no tocar salvo necesidad). Se quitó `@vercel/analytics` (estaba 404eando sin recolectar datos).

### Helpers de datos/acciones (reutilizar, no duplicar)
`lib/archivos.ts` (`subirArchivos`, `generarSlug` — subida a Supabase Storage), `lib/limites.ts` (`limitarPorIp`, `campoTexto`), `lib/emails.ts`, `lib/notificaciones.ts`, `lib/causas.ts`, `lib/embeds.ts`, `lib/datos.ts` (capa de datos pública: `obtenerAnimales`, `filaAAnimal`, etc.), `lib/usuarios.ts` (`asegurarUsuario`/`exigirUsuarioActivo`), `lib/acciones-refugio.ts` (`miRefugio`, `exigirRefugio`, `tieneRefugio`, `FormularioAnimal` server actions), `lib/geo.ts`, `lib/reparto.ts`, `lib/fotos.ts` (fotos stock centralizadas), `lib/tipos.ts` (tipo `Animal`, `edadLegible`).

### Datos DEMO presentes (a limpiar antes de lanzar — ver backlog)
Animales **Luna** y **Rocky**, refugio **"Patitas del Sur (demo)"** con email ficticio `demo@adoptaar.com`, y **fotos de stock** (en `lib/fotos.ts`).

---

## TAREA PRINCIPAL (Fase 10 #1): Importador de bases de datos + repositorio de archivos para refugios

Una sección **privada** dentro de `/mi-refugio` (NO de cara al público), solo para **refugios verificados** (`exigirRefugio()`), para que cada refugio cargue sus propias bases de datos de animales en el formato que tengan (no todos usan el mismo).

### A. Repositorio de archivos del refugio (vault privado)
- Nueva subsección, p. ej. **`/mi-refugio/archivos`** (link en el panel del refugio).
- **Subir archivos de cualquier formato** (PDF, Word/.docx, imágenes, CSV, Excel, etc.) a un **bucket privado de Supabase Storage** (crearlo; con RLS — cada refugio solo accede a lo suyo).
- **Listar / descargar / borrar** los archivos propios. Mostrar nombre, tipo, tamaño y fecha. Descarga vía **signed URL** (bucket privado).
- **Seguridad y límites (free tier):** validar extensión/tipo MIME, **límite de tamaño por archivo** (ej. 15–20 MB), sanitizar el nombre, `limitarPorIp`, verificar ownership en cada acción. Tener en cuenta la cuota total gratuita de Supabase Storage (anotar un tope razonable).

### B. Importador de animales (solo CSV / Excel)
- En el repositorio, si el archivo es **CSV / XLSX / XLS**, además ofrecer botón **"Importar animales"**.
- **Parseo gratis del lado servidor** con librería open-source (**SheetJS / `xlsx`** sirve para Excel y CSV; o `papaparse` para CSV). Sin servicios pagos.
- **Auto-detección de columnas:** mapear encabezados comunes (es/en) a los campos de un animal de AdoptAR. Ejemplos a reconocer: nombre/name, especie/tipo/species, raza/breed, edad/age/edad en meses, sexo/sex/género, tamaño/size, ciudad/localidad, provincia, descripción/notas/observaciones, castrado/esterilizado, tipo (adopción/tránsito). **Normalizar valores** (especie → perro/gato/otro; sexo → hembra/macho; edad en años → meses; sí/no/true/false → boolean).
- **Vista previa antes de confirmar:**
  - Tabla con las filas detectadas.
  - El **mapeo de columnas detectado, editable** (que el refugio pueda reasignar qué columna va a cada campo si la auto-detección falló).
  - **Marcar las filas con datos mínimos faltantes** (mínimo requerido: **nombre y especie**) para que el refugio las **complete inline o las saltee** antes de confirmar. Mostrar resumen ("X listas, Y con problemas").
- **Confirmar:** crea los animales, asociados a ese refugio. Límite de filas por import (ej. 500). Validar/escapar todo server-side, ownership, rate limit.

### C. Regla de fotos (importante)
- Las filas importadas **no traen foto**. Los animales importados se crean **SIN publicar** (estado borrador / "esperando foto") y **NO aparecen en el catálogo público hasta tener ≥1 foto**.
- En `/mi-refugio`, marcar claramente cuáles están **"esperando foto"** y dar acceso directo a agregarles fotos (editor existente, `subirArchivos`). Al tener ≥1 foto, el refugio puede publicarlos (o se habilita la publicación).
- Esto requiere un **estado/flag** para animales no publicados que los excluya de las vistas públicas (`obtenerAnimales`, home, refugio público, sitemap). Revisar el `estado` actual de `animales` y, si hace falta, agregar valor "borrador" o un boolean `publicado`. **Actualizar `schema.sql` + crear `web/supabase/migracion-fase10.sql` y aplicarla en prod** (vía Claude in Chrome). Asegurar que TODAS las consultas públicas filtren estos animales.

---

## BACKLOG PRIORIZADO (por impacto; hacer en orden salvo que el usuario diga otra cosa)

2. **Limpieza de datos demo (para lanzar):** borrar/!reemplazar Luna, Rocky y el refugio "Patitas del Sur (demo)" + email ficticio `demo@adoptaar.com`; plan para reemplazar fotos stock por reales. (SQL vía Claude in Chrome; coordinar con el usuario qué conservar.)
3. **Historias de éxito / "Se adoptó" (prueba social, sube conversión y motiva a compartir):** cuando un animal pasa a adoptado, mostrarlo ("X ya tiene familia 🎉") y una galería/sección de adopciones felices; opcional seguimiento post-adopción con foto en el nuevo hogar.
4. **Reportar publicación + moderación (seguridad/anti-fraude):** botón "Reportar" en la ficha + cola de reportes en el admin; guía de adopción responsable y señales de alerta.
5. **Alertas de adopción por criterios:** como las de tránsito, pero "avisame cuando entre un animal que cumpla X (especie/zona)". Reusar patrón de `alertas_transito` + emails.
6. **Handoff a WhatsApp:** además del chat interno, botón para coordinar por WhatsApp (en Argentina es donde se cierra). Link `wa.me` con el teléfono del refugio/particular si lo cargó.
7. **Monitoreo en vivo (gratis):** cablear `ERROR_WEBHOOK_URL` a un webhook gratis de Discord/Slack (el usuario crea el webhook y pega la URL en Vercel) para recibir los `[ERROR500]` al instante.
8. **Sandbox real de MP (#2 de Fase 9, quedó solo verificado por código):** confirmar el primer débito inmediato de la suscripción end-to-end. Necesita que el usuario pegue el **Access Token de PRUEBA** (2FA). Protocolo: token de prueba + `MP_TEST_PAYER_EMAIL` (email del Buyer Test User del panel; el campo solo muestra el usuario `TESTUSER…`, no el email — conseguir el email por API o login del comprador), tarjeta de prueba Visa `4509 9535 6623 3704` CVV `123` venc `11/30` titular `APRO` DNI `12345678`. Webhook "Modo de prueba" ya quedó configurado. **Revertir SIEMPRE** al terminar (token a prod, borrar `MP_TEST_PAYER_EMAIL`, limpiar filas de prueba).
9. **Más tests (vitest):** cubrir el parser/auto-detección del importador, `misPostulaciones`, favoritos idempotente, estados de postulación.
10. **Performance (opcional, riesgo medio):** evaluar diferir/lazy-load el JS de Clerk (es lo único que baja Performance a 76). No tocar si no se puede hacer sin riesgo de romper el login.

---

## PENDIENTES QUE REQUIEREN PLATA O TRÁMITES (NO hacer — solo anotado)
- **Dominio propio** (~USD 10/año): permitiría volver a Resend con buena reputación y dejar Gmail SMTP. Hoy Gmail SMTP cubre el envío gratis.
- **Apple OAuth** (USD 99/año).
- **MercadoPago como ONG** (trámite de exención de comisiones).
- **Reemplazo de fotos stock por reales** (centralizadas en `lib/fotos.ts`).
- **Vercel Web Analytics**: si se quiere analítica, habilitarlo en el dashboard (free) y re-agregar `<Analytics/>` en `layout.tsx`.

---

## REGLAS DE TRABAJO
- Cualquier login/captcha/2FA/pegado de credenciales lo hace el usuario (avisarle); todo lo demás lo hace el asistente, incluido el SQL Editor de Supabase vía **Claude in Chrome** (NO Control_Chrome) si hace falta DDL/Storage.
- Código en **español** (nombres, comentarios, UI), misma paleta y componentes existentes (terracota/salvia/crema, redondeado). Mantener accesibilidad AA (contraste, labels, foco) y `prefers-reduced-motion` en animaciones.
- **Antes de escribir código de Next.js, leer la guía en `web/node_modules/next/dist/docs/`** (esta versión —16— tiene breaking changes; ver `web/AGENTS.md`).
- Cambios de schema: actualizar `web/supabase/schema.sql` Y aplicarlos en la base real, dejando también `web/supabase/migracion-fase10.sql`.
- Seguridad: validación server-side, `limitarPorIp`, `exigirRefugio()`/`exigirUsuarioActivo()`/`exigirAdmin()` según corresponda, escapar HTML en emails, verificar ownership en cada server action, validar tipo/tamaño de archivos subidos, nunca exponer la service role key, buckets de Storage con RLS y descargas por signed URL.
- Al final de cada tarea: `npx next build` y `npm test`, verificar en producción (logs de Vercel / preview), commitear y pushear a `main`. Mensajes de commit en español.
- Mobile: verificar con viewport 375px. Recordar que Clerk (login) no corre en localhost/preview por el dominio; verificar esos flujos en producción.
- Mantener la memoria del proyecto actualizada al cerrar tareas.
