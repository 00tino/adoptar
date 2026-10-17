# AdoptAR — estado del trabajo, 17 de octubre de 2026

Migración aplicada en Supabase `adoptar` el 16 de octubre de 2026. El usuario
autorizó publicar este lote por GitHub → Vercel. No se eliminaron datos demo.
Se conserva la identidad visual.

Las funciones de Vercel ejecutan en São Paulo (`gru1`), cerca de la base de
Supabase existente (`sa-east-1`), sin migración de datos ni cambio de plan.

## Implementado

- `/adoptados`: galería paginada de adopciones confirmadas por el refugio/admin,
  sin inventar testimonios ni fotos. Los adoptados dejan el catálogo de búsqueda;
  su ficha conserva la historia y deja de ofrecer contacto para adoptarlos.
- `/adopcion-responsable`: preparación del hogar y señales de publicaciones sospechosas.
- Reporte privado en cada ficha, con sesión activa, límite por IP y una entrada
  por persona/publicación. `/admin/reportes`: cola paginada, revisión y acceso a
  la gestión del animal. Un reporte no da de baja una publicación automáticamente.
- `/animales/alertas`: una alerta por usuario, especie/provincia opcionales y pausa.
  Se avisa al aprobar un animal, publicarlo desde un refugio estrella o completar
  sus fotos de importación. El aviso corre después de responder y se deduplica en
  Postgres. Las cuentas suspendidas y las alertas pausadas no reciben avisos.
- WhatsApp ya existía para refugios que cargaron ese contacto. Los particulares
  siguen coordinando por chat: el modelo actual no guarda su teléfono público.
- Favoritos idempotentes frente a solicitudes concurrentes y errores visibles.
  Postulaciones solo para animales disponibles/en proceso; se respeta la suspensión
  del usuario y se usa el slug de la base al confirmar.
- Caché de 60 segundos para lecturas anónimas de animales, refugios y conteos
  públicos por refugio. Las mutaciones de animales invalidan sus datos y los
  conteos; editar, aprobar o suspender refugios invalida su etiqueta. Las cuentas,
  mensajes, escrituras e importes recaudados no se cachean.
- Tres relacionados consultados con límite; conteos agregados en Postgres y
  cercanía resuelta en la base, con los 100 resultados más cercanos y aviso en UI.
- Monitoreo compatible con Slack y Discord, con timeout, límite de Discord y
  menciones desactivadas. Como alternativa, `ERROR_ALERT_EMAIL` envía avisos por
  correo en Node.js, agrupados por contexto durante 15 minutos por instancia.
  Sigue el registro local `[ERROR500]`. El panel privado `/admin/diagnostico`
  permite probar correo y monitoreo sin modificar los datos demo.

## Verificación

- `npm test`: 123 pruebas en verde de autorización, alertas, favoritos, postulaciones,
  monitoreo y caché, además de las pruebas previas del importador y del dominio.
- Las pruebas SQL corren en PGlite (Postgres en memoria) con las tablas base del
  esquema y la migración real: grants, RLS, restricciones, deduplicación, búsqueda
  geográfica, límite y conteo. No se conectan a Supabase real ni envían emails.
- `npm run lint`, `npx tsc --noEmit` y compilación de Next.js.
- Navegador local con conexión a Supabase y Clerk desactivada: galería vacía,
  guía y aviso de configuración de alertas, a 375 px, y galería en horizontal
  (812 × 375) con movimiento reducido. Sin desborde horizontal. Las pantallas públicas se
  verifican visualmente; esto no prueba la interacción de los formularios con sesión real.
- El primer build falló al descargar Fraunces/Nunito Sans por la restricción de
  red del entorno. Con acceso de red la compilación pasó.

## Cierre operativo y pendientes

1. **Migración aplicada y verificada:** `supabase/migracion-comunidad.sql` en
   `mkiedljddnlrncfzbkek`, registrada como `comunidad_reportes_alertas_y_consultas_publicas`.
   Tres tablas privadas con RLS, dos funciones de lectura `SECURITY INVOKER` y
   sus índices. Las huellas de todas las filas de animales (15), refugios (2),
   usuarios (1) y campañas (2) coinciden antes y después. Las funciones de conteo
   y cercanía responden en la base real. Lectura anónima/autenticada revocada
   sobre las tres tablas privadas; escritura disponible solo para service role.
2. **QA con sesión y correo real:** verificado en producción con la sesión del
   usuario: guardar una alerta de perros en Buenos Aires, pausarla y recargar
   conserva los criterios y `activa=false`. Se envió un reporte privado de Luna
   identificado como «PRUEBA QA AdoptAR 16/10/2026», apareció en la cola del admin
   y se descartó desde el panel. La cola quedó en cero; se conserva el registro
   de prueba descartado `31aca606-8961-4f4a-9f71-967a55f9870c` y una alerta pausada.
   No se modificó la publicación ni se enviaron avisos al refugio demo.
   Esta sesión tiene rol admin: no se probó manualmente una segunda cuenta sin
   ese rol ni un envío de alerta causado por publicar un animal nuevo.
   El panel privado publicado permitió
   enviar las dos pruebas autorizadas (correo y monitoreo); Gmail SMTP aceptó
   ambas y Gmail confirmó los dos mensajes en INBOX, fuera de spam. Los avisos son de mejor esfuerzo:
   no hay cola durable ni reintento automático si una función termina por timeout.
3. **Monitoreo por email:** destino autorizado guardado en Vercel Production como
   `ERROR_ALERT_EMAIL`; cambio publicado en `1b21090` y prueba aceptada por el
   proveedor desde producción, con recepción comprobada en INBOX.
   No se creó ningún canal ni se enviaron mensajes a Slack/Discord. El límite
   por instancia es básico, no una deduplicación global durable.
4. **Mercado Pago sandbox:** token privado guardado y validado con `/users/me`:
   vendedor argentino con tag `test_user`. Existen vendedor y comprador de
   prueba. Se creó una preferencia aislada de ARS 500, con referencia
   `adoptar-sandbox-*`, vencimiento de una hora y sin `notification_url`.
   Pago simulado aprobado: `183543579685`, vendedor `3466462978`, comprador
   `3464210539`, ARS 500 desde saldo ficticio. Suscripción de prueba
   `203f08d4c5a04a33ad0082f96f8af212` autorizada, primer cobro ficticio de ARS 500
   confirmado por API y cancelada luego para no dejar recurrencias activas.
   Se corrigió un error reproducido contra la API: `start_date=ahora` llegaba
   vencido y era rechazado; se omite para iniciar al autorizar. La creación sin
   esa fecha y el primer cobro se comprobaron en las cuentas de prueba.
   El proveedor devuelve `live_mode=true` también para este flujo con cuentas
   de prueba; el aislamiento se comprobó por el tag `test_user` y los IDs de las
   cuentas, no por ese campo ni por el prefijo del token. No se reemplazó el
   token de producción. El simulador de Mercado Pago entregó los eventos
   `payment.updated` y `subscription_preapproval` al webhook publicado con HTTP
   200, usando los IDs de estos recursos de prueba. Una solicitud de firma
   inválida devolvió HTTP 401 y `firma inválida`. Se habilitó y verificó guardado
   el evento «Planes y suscripciones»; «Pagos (legacy)» sigue habilitado.
   Los 9 tests locales cubren firma, acreditación, reenvíos y suscripciones con
   dobles de los proveedores. La entrega del simulador no demuestra la
   acreditación automática de un pago real en la base. La consulta posterior
   confirmó 15 animales, 2 refugios, 1 usuario, 2 campañas y cero filas de estas
   pruebas en donaciones/suscripciones de producción.

   Corrección publicada: `33fc8d6`, estado Vercel `success`; la página de
   donación mensual devuelve HTTP 200. `npm test` (104 pruebas), `npm run lint`
   y `npm run build` pasaron antes de publicar.

   Preparación de la validación productiva: el panel privado ahora consulta la
   identidad de la cuenta cobradora configurada sin exponer la credencial ni
   crear pagos. Se corrigieron respuestas exitosas ante fallos de consulta o
   escritura: el webhook devuelve 503 si no puede consultar el pago y propaga
   los errores de base/suscripciones para permitir reintentos del proveedor.
   Las simulaciones HTTP 200 anteriores prueban recepción, no acreditación.
   La versión con estos controles pasó 115 tests, lint y build, se publicó en
   `9d252db` y Vercel confirmó `success`. La consulta desde el panel desplegado
   confirmó cuenta REAL `FONTEVIVAVALENTINO`, ID `305489481`, país AR.
   La campaña para validar es «Mantenimiento de AdoptAR», ID
   `4f84e29d-68b1-46b6-91ff-ca5c4770bfff`, sin refugio ni avisos a terceros.
   Su saldo inicial acreditado es cero; conserva 4 intentos pendientes de ARS
   100 de junio de 2026. El usuario autorizó un único pago real de ARS 100 como
   donación, sin suscripción ni devolución automática, y confirmó que dispone
   de otra cuenta pagadora. Checkout abierto:
   `305489481-f28a328c-4a7d-4316-b9a9-4c55da65efbc`; donación
   `d4b09499-e8fa-465d-b813-dca8756e8702`, ARS 100, creada el
   2026-10-16 a las 19:02 ART, todavía `pendiente` en la consulta posterior.
   El usuario completa el pago; después se verificará el cambio de estado por
   webhook sin acreditar manualmente ninguna fila ni crear otro intento.
   El primer intento de pago quedó bloqueado con «Pagar» deshabilitado y la
   sesión de `fonteviva.valen.tino00@gmail.com` aún activa en el checkout.
   Se cerró esa sesión y se abrió un ingreso limpio, conservando la misma
   preferencia. Falta identificar/ingresar la cuenta pagadora alternativa;
   no hay un cargo aprobado ni acreditación productiva confirmada.
   El usuario indicó como pagador `fonteviva.valen.tino00@gmail.com`, que es la
   misma sesión cobradora observada. Para continuar falta otro comprador real
   con cuenta/email diferentes; no se volverá a intentar con la cuenta cobradora
   ni se generará otra preferencia para resolver este bloqueo.
   **El usuario pidió dejar este pago pendiente y continuar con el resto del
   proyecto.** No retomar el cobro ni abrir otro intento al cerrar otras tareas.
5. **Datos demo:** conservarlos por instrucción del usuario; no eliminar Luna,
   Rocky ni el refugio demo.
6. **Fotos reales y trámites:** requieren material/gestión del usuario, sin
   contratar servicios ni habilitar planes pagos.
7. **Capacidad:** se completó una prueba acotada de lecturas públicas, detallada
   debajo: 122 solicitudes con pico de 20 simultáneas y cero errores.
   No demuestra 1.000 usuarios simultáneos ni latencia menor a 300 ms.

## Verificación final de este cierre

- Se repitieron `npm test` (115 pruebas, 13 archivos), `npm run lint` y
  `npm run build`: todo en verde. El primer build falló al descargar las fuentes
  por la restricción de red; la repetición con acceso de red compiló correctamente.
- Ocho páginas públicas respondieron HTTP 200: inicio, catálogo, adopciones
  felices, guía, alertas, donaciones, donación mensual y refugios. Sin sesión,
  `/admin/reportes` y `/admin/diagnostico` respondieron HTTP 404 sin contenido
  privado; el endpoint del chat respondió `{"mensajes":[]}`.
- Formularios reales de alertas y cola de reportes comprobados a 375 × 812 px,
  con ancho del documento de 375 px, sin desborde horizontal.
- Vercel mostró el despliegue de `8bfeda5` en estado Ready y tasa de error de
  0% en su ventana visible de seis horas. Esto es una observación del panel,
  no una prueba de carga ni una garantía de disponibilidad.
- Tras el QA, las huellas completas de las 15 filas de animales, 2 refugios,
  1 usuario y 2 campañas coincidieron con el inicio. Cero reportes pendientes y
  cero alertas de adopción activas. La campaña conserva sus cinco intentos:
  cuatro históricos y el único pago autorizado de ARS 100, todavía pendiente.
- No hizo falta modificar el código funcional ni aplicar otra migración para
  cerrar estas verificaciones.

## Prueba de carga pública — 16 de octubre de 2026

Corrida contra `https://adoptar.dpdns.org`, con `97d091b` desplegado, terminada a
las 19:40 ART. Datos completos en
[`output/qa/carga-2026-10-16.json`](../output/qa/carga-2026-10-16.json).

Se consultaron inicio, catálogo, ficha demo de Luna y refugios sin cookies,
autenticación, formularios, pagos, imágenes ni scripts del navegador. Son tandas
de GET con un segundo de pausa entre tandas: no es tráfico sostenido ni una
simulación de personas navegando.

| Solicitudes simultáneas por tanda | Lecturas medidas | Errores | TTFB p95 | HTML completo p95 |
| --- | --- | --- | --- | --- |
| 1 | 8 | 0 | 737 ms | 920 ms |
| 5 | 20 | 0 | 1.714 ms | 1.936 ms |
| 10 | 30 | 0 | 2.004 ms | 2.227 ms |
| 20 | 60 | 0 | 1.264 ms | 1.380 ms |

La corrida válida duró 37,23 segundos: 118 lecturas medidas más cuatro de
calentamiento, todas HTTP 200 y con el contenido esperado. El HTML completo
tuvo p50 de 772 ms, p95 de 1.762 ms y máximo de 2.462 ms; el TTFB global p95 fue
1.578 ms. Se descargaron 13.856.049 bytes de HTML descomprimido (13,21 MiB),
no equivalentes a transferencia facturada; el proceso cliente terminó con
82 MiB de RSS. La portada fue la ruta más lenta: p95 de HTML completo 2.152 ms.

Las 122 respuestas mostraron `x-vercel-cache: MISS`: esto se refiere a la caché
del HTML en Vercel y no prueba que las consultas internas de Supabase omitan
su caché de datos. Las etapas se ejecutan en orden y reutilizan conexiones y
cachés: que la última sea más rápida no permite inferir que más concurrencia
mejora la velocidad.

El generador es esta Mac y sus tiempos incluyen red, conexiones y carga local;
un build local corrió durante parte de la prueba. No se midieron métricas
internas del servidor, renderizado, LCP, imágenes, JavaScript, cuentas,
escrituras ni 1.000 usuarios simultáneos. El objetivo de menos de 300 ms no está
alcanzado en estas mediciones. El resultado solo confirma ausencia de errores
para este volumen pequeño de lecturas durante esta ventana.

El script reproducible es `web/scripts/probar-carga.mjs`; sin argumentos solo
muestra el plan. Para ejecutar conscientemente:

```bash
cd web
node scripts/probar-carga.mjs --ejecutar /tmp/adoptar-carga.json
```

Tiene límites de 122 solicitudes, 20 activas, 64 MiB de HTML y dos minutos;
timeout de ocho segundos por solicitud y corte ante errores o p95 de una tanda
mayor a cinco segundos. No forma parte de `npm test` ni corre automáticamente.
El primer intento se detuvo tras tres lecturas por un falso negativo del
validador: React separa «La historia de» y «Luna» con comentarios HTML. Se
corrigió el validador, sin tocar la web. Se conserva
[`carga-2026-10-16-validador-inicial.json`](../output/qa/carga-2026-10-16-validador-inicial.json).
Con dos consultas de diagnóstico adicionales, esta tarea usó 127 GET de HTML.

Después se comprobaron las mismas huellas completas de animales, refugios,
usuarios y campañas. El pago real sigue pendiente, conserva los cinco intentos
totales de su campaña y no se activó ninguna alerta ni quedó un reporte abierto.
Se repitieron 115 tests, lint y build con resultado correcto.

## Optimización de velocidad — 16 de octubre de 2026

Publicada en `be6f20b`, con despliegue Vercel `success`. Se cachean durante 60
segundos las lecturas anónimas de refugios y el conteo público de animales por
refugio; se invalidan al modificar los datos correspondientes. El conteo usa GET
para una función Postgres `STABLE` y `SECURITY INVOKER` ya existente, sin migración.
Es el modo de lectura documentado por
[Supabase para RPC](https://supabase.com/docs/reference/javascript/rpc).
La ficha consulta refugio, relacionados y favoritos en paralelo, manteniendo
la sesión y los favoritos fuera de la caché compartida. Los importes de campañas
y donaciones siguen consultándose sin esta caché.

Se repitió el mismo ensayo de cuatro rutas, con 122 GET por versión (cuatro de
calentamiento y 118 medidos), tandas de 1/5/10/20 y cero errores. Esta vez no hubo
builds ni tests locales en paralelo durante ninguna de las dos corridas.

| Medida de HTML completo | Antes (`4fcdaa8`) | Después (`be6f20b`) | Reducción observada |
| --- | --- | --- | --- |
| Mediana global | 768 ms | 485 ms | 36,8% |
| p95 global | 1.538 ms | 1.241 ms | 19,3% |
| Mediana inicio | 830 ms | 668 ms | 19,5% |
| Mediana catálogo | 429 ms | 414 ms | 3,5% |
| Mediana ficha de Luna | 875 ms | 498 ms | 43,1% |
| Mediana refugios | 780 ms | 354 ms | 54,6% |

El TTFB global mediano bajó de 657 a 345 ms; el p95 de HTML completo en las
tandas de 20 bajó de 1.538 a 875 ms. Las dos corridas son mediciones breves desde
esta Mac y están afectadas por red, conexiones y calentamiento de caché: muestran
una mejora observada, sin garantizar el mismo porcentaje para cada visitante.
No prueban LCP, sesiones, escrituras, 1.000 usuarios simultáneos ni menos de
300 ms para todas las respuestas.

Evidencia completa:
[`antes`](../output/qa/velocidad-2026-10-16-antes.json) y
[`después`](../output/qa/velocidad-2026-10-16-despues.json).
Pasaron 123 tests, lint y build. Las ocho pruebas nuevas cubren las lecturas
cacheadas permitidas, importes/escrituras excluidos y la invalidación al editar
o cambiar el estado de refugios, incluyendo permiso denegado y fallo de escritura.
No se modificaron refugios reales para probar invalidaciones en producción.
En el navegador se comprobó la ficha de Luna con la sesión existente y el
listado desplegado de refugios, con sus conteos de uno y cero disponibles.
Las huellas completas de animales, refugios, usuarios y campañas coinciden
antes y después. La otra cuenta, las fotos y el pago real siguen pendientes.

## Servidor cerca de la base — 17 de octubre de 2026

Se detectó ejecución en Washington: las 122 respuestas del ensayo previo
mostraron `x-vercel-id: gru1::iad1::...`, mientras Supabase confirmó región
`sa-east-1` (São Paulo). `web/vercel.json` fija una única región `gru1`, opción
permitida en Hobby según la
[configuración oficial de Vercel](https://vercel.com/docs/project-configuration/vercel-json#regions).
No se movió la base, no se contrataron servicios ni se modificaron credenciales.
El cambio se publicó en `58fae62`, con Vercel `success`; las 122 respuestas
posteriores confirmaron `gru1::gru1::...`.

Se usó el mismo ensayo limitado a 122 GET, con cuatro de calentamiento y 118
medidos, sin builds ni tests locales en paralelo. Ambas corridas terminaron sin
errores y con el mismo contenido esperado.

| HTML completo | Antes, `iad1` | Después, `gru1` |
| --- | --- | --- |
| Mediana global | 454 ms | 211 ms |
| p95 global | 928 ms | 574 ms |
| Mediana inicio | 670 ms | 235 ms |
| Mediana catálogo | 391 ms | 187 ms |
| Mediana ficha de Luna | 351 ms | 212 ms |
| Mediana refugios | 366 ms | 206 ms |

La reducción observada es 53,5% en mediana y 38,1% en p95. El TTFB mediano
bajó de 336 a 205 ms. La mediana del HTML ya está debajo de 300 ms en las cuatro
rutas medidas; el p95 global sigue en 574 ms, con máximo de 771 ms. No se
garantizan 300 ms para todas las respuestas ni 1.000 personas simultáneas.

La referencia terminó el 16/10 a las 19:55 ART y la medición posterior el
17/10 a las 11:12 ART, después de una interrupción. El cambio real de región se
comprobó en los encabezados, pero los porcentajes comparan dos ventanas de red y
horario diferentes; no constituyen una prueba estadística ni una garantía de
rendimiento para todos los visitantes. Solo miden HTML, sin recursos de página,
LCP, sesiones ni escrituras.

Evidencia completa:
[`antes`](../output/qa/region-2026-10-16-antes.json) y
[`después`](../output/qa/region-2026-10-17-despues.json).
El script ahora registra `x-vercel-id` en cada muestra para comprobar la región.
Pasaron 123 tests, lint y build antes del despliegue.

Verificaciones desde `gru1`:

- Las rutas privadas de reportes y diagnóstico devuelven HTTP 404 sin sesión;
  el chat anónimo devuelve `{"mensajes":[]}` y el webhook rechaza la firma
  inválida con HTTP 401. No se envió ningún evento firmado para acreditar pagos.
- La sesión existente pudo entrar al panel. Correo real y aviso de monitoreo
  aceptados por Gmail SMTP y recibidos el 17/10 en INBOX, fuera de spam, en el
  destino autorizado. Consulta de identidad de Mercado Pago correcta: la cuenta
  REAL configurada sigue siendo `FONTEVIVAVALENTINO`, ID `305489481`; no se creó
  ningún pago.
- Las huellas completas de 15 animales, 2 refugios, 1 usuario y 2 campañas
  coincidieron antes y después. El único pago real autorizado sigue pendiente,
  con cinco intentos totales en la campaña, cero reportes abiertos y cero alertas
  de adopción activas. La otra cuenta y las fotos también siguen postergadas.

## Sesión en paralelo y variación del p95 — 17/10/2026

Publicada en `43c9390`, despliegue Vercel `success`. El catálogo inicia la sesión
y sus favoritos en paralelo con animales y provincias. `usuarioActual` usa
`React.cache` para compartir la consulta entre header, página y favoritos dentro
del mismo render; no guarda identidades entre solicitudes ni agrega caché de HTML.
Los importes, las escrituras y las consultas privadas mantienen su política anterior.

La línea de base y las dos corridas posteriores usaron el mismo script, cuatro
rutas, 122 GET por corrida (118 medidos), máximo de 20 solicitudes simultáneas y
los mismos límites. No hubo builds ni tests locales durante las mediciones.
Se comprobó que las coberturas coinciden y todas las respuestas ejecutaron en
`gru1::gru1`; ninguna corrida tuvo errores ni activó el corte preventivo.

| Corrida, hora argentina | Mediana HTML completo | p95 HTML completo | Máximo |
| --- | ---: | ---: | ---: |
| Antes, 11:22 | 192 ms | 567 ms | 1.140 ms |
| Primera después, 11:27 | 195 ms | 821 ms | 1.008 ms |
| Repetición por el resultado peor, 11:29 | 161 ms | 311 ms | 506 ms |

La repetición se hizo para investigar el aumento del p95, sin otros cambios de
código. No se descarta la primera medición posterior: **no hay evidencia de una
reducción estable del p95 ni de una relación causal cuantificada con este cambio**.
Los 311 ms acercan una corrida al objetivo; no demuestran 300 ms sostenidos.
Tampoco prueban 1.000 usuarios, recursos de página o LCP. No se atribuye la
variación a un arranque frío o a la red sin trazas que lo demuestren.

En la última corrida, el p95 de HTML completo por ruta fue portada 374 ms,
catálogo 238 ms, ficha 460 ms y refugios 253 ms. El TTFB global p95 fue 304 ms;
se sigue informando el HTML completo, no solo el primer byte.

Evidencia íntegra: [`antes`](../output/qa/p95-2026-10-17-antes.json),
[`primera después`](../output/qa/p95-2026-10-17-despues.json) y
[`repetición`](../output/qa/p95-2026-10-17-confirmacion.json).

Pasaron 125 tests, lint y build. La primera compilación local no pudo descargar
Google Fonts por la red restringida; al repetir con acceso a las fuentes compiló
correctamente. Los tests comprueban que los favoritos empiezan con el catálogo
aún pendiente y que una visita anónima posterior no hereda sus valores.
En producción, la sesión existente vio su menú y los tres animales públicos;
una lectura sin cookies vio tres botones de ingreso para favoritos, sin menú
personal y con `Cache-Control: private, no-cache, no-store`. Diagnóstico y reportes
continuaron en HTTP 404 para visitas anónimas.

Las huellas completas de animales (15), refugios (2), usuarios (1) y campañas (2)
coinciden antes y después. No se modificaron los demo, el plan ni los servicios:
Fluid Compute ya estaba habilitado en Hobby. La donación real de ARS 100 sigue
en estado `pendiente`; la otra cuenta y las fotos siguen postergadas.

## HTML público desde CDN y medición aislada — 17/10/2026

Mediciones sobre `1c3804d`, Vercel `success`; ajuste posterior `ce3fc9a` para
conservar en el servidor la selección del proxy de Clerk. Las vistas de portada, catálogo sin
filtros, refugios y fichas con slug `adoptar-`/`transito-` se prerenderizan para
peticiones sin cookies ni contexto de autenticación. Conservan las consultas
públicas etiquetadas y una revalidación de 60 segundos. Las rutas internas
`/publico/...` redirigen a sus URL originales cuando se piden directamente.
No se agrega `s-maxage` a páginas personalizadas.

Las peticiones con cookies, autorización, filtros, postulaciones o contexto de
Clerk mantienen el render original. El matcher sigue procesando rutas privadas,
API, acciones y los parámetros de retorno del SDK. Las reglas de reescritura se
evalúan después de ese procesamiento; el contexto que produce Clerk impide
servir la vista compartida. Se comprobó en HTTP local y producción la separación
`public`/`private, no-cache, no-store`; la sesión existente conservó su menú y
los tres animales públicos después de recargar.

La portada consulta las campañas después de cargar el HTML mediante
`/api/campanas-publicas`, con `force-dynamic` y `Cache-Control: no-store` tanto
en la API como en la petición del navegador. No muestra un monto de respaldo
si la consulta falla; ofrece ir a donaciones y registra el fallo con el
monitoreo existente. **La latencia del HTML ya no incluye esta consulta**.
La página `/donaciones` conserva su render fresco. Se verificó en el navegador
que la campaña activa aparece después de la consulta.

También se dejó de serializar en cada HTML el objeto de traducciones de Clerk
(52.382 bytes): el mismo proveedor y la traducción española viven en un
componente cliente. El HTML compilado quedó entre 33 y 61 KB según la ruta.
Los metadatos de las fichas declaran la URL original de su imagen al compartir,
también en la vista prerenderizada.

Los ensayos locales intermedios se conservan completos, sin elegir solo la
mejor corrida:

| Versión local | Mediana HTML | p95 HTML | Evidencia |
| --- | ---: | ---: | --- |
| Antes | 179 ms | 511 ms | [JSON](../output/qa/publico-2026-10-17-antes.json) |
| Salida temprana dentro del proxy | 184 ms | 546 ms | [JSON](../output/qa/publico-2026-10-17-intermedio.json) |
| Matcher sin prerender | 161 ms | 980 ms | [JSON](../output/qa/matcher-2026-10-17-intermedio.json) |
| CDN con traducciones serializadas | 126 ms | 1.060 ms | [JSON](../output/qa/cdn-2026-10-17-intermedio.json) |

Una traza de la versión intermedia mostró 376 ms en middleware sin llamadas
externas y 40 ms en la ficha; [captura](../output/qa/traza-publica-middleware-376ms.png).
En la última corrida local las 118 respuestas medidas fueron `HIT`. Durante
la continuación se observó un render externo de video consumiendo varios núcleos
en la Mac y una mayor duración de los tests. No se lo interrumpió ni se atribuye
toda la variación a esa carga sin una comparación controlada.

La prueba remota es manual, en un runner estándar gratuito del repositorio
público: `.github/workflows/carga-publica.yml`. No tiene permisos de token,
secretos, dependencias externas, tareas programadas ni artefactos de pago.
Ejecuta el mismo script tres veces, con pausas de 30 segundos, y conserva cada
informe completo en los logs. No se compara porcentualmente con la Mac:
el origen de red, el sistema y la versión de Node son diferentes.

Resultado del [run manual 39045851085](https://github.com/00tino/adoptar/actions/runs/39045851085)
sobre `1c3804d`, cliente Linux/Node 22.23.3, punto de entrada CDN `cle1`:

| Corrida remota | Mediana HTML | p95 HTML | Errores | Evidencia |
| --- | ---: | ---: | ---: | --- |
| 1 | 39 ms | 401 ms | 0 | [JSON](../output/qa/cdn-2026-10-17-remoto-1.json) |
| 2 | 41 ms | 249 ms | 0 | [JSON](../output/qa/cdn-2026-10-17-remoto-2.json) |
| 3 | 39 ms | 519 ms | 0 | [JSON](../output/qa/cdn-2026-10-17-remoto-3.json) |

[Entorno exacto](../output/qa/cdn-2026-10-17-entorno.json) y
[captura del resumen](../output/qa/cdn-2026-10-17-resumen-remoto.png).
Cada corrida tiene 4 GET de calentamiento excluidos del percentil y 118 medidos,
con la misma cobertura de rutas y concurrencia. Se recalcularon los percentiles
desde las muestras y se verificaron 366 respuestas HTTP 200 sin errores.
**No se cumplió el criterio fijado de tres corridas con p95 ≤350 ms**:
el p95 no se sostiene cerca de 300 ms. El éxito del workflow acredita la
finalización HTTP, no el cumplimiento del objetivo de latencia.

Para una respuesta de `/refugios` de la tercera corrida, el cliente midió
594 ms (TTFB 593 ms) y la traza de Vercel indicó `HIT`, sin invocación de
página ni middleware, con respuesta terminada en 16 ms:
[captura](../output/qa/cdn-2026-10-17-hit-16ms.png).
La diferencia de esa muestra está fuera del trabajo de servidor medido;
no identifica por sí sola dónde se consumió ni explica todas las colas.
Las pruebas miden HTML público sin sesión, no LCP, recursos del navegador,
consultas de campañas ni navegación autenticada. No se declara un p95 global.

Validación final del código: **226 tests, lint y build en verde**. La primera
publicación de las reescrituras excedía el límite de 16 condiciones del builder;
se corrigió, agregó contrato y publicó correctamente. La traducción de Clerk
sigue en español; `ce3fc9a` conserva además la selección de proxy del proveedor
original. Las tres mediciones remotas corresponden a `1c3804d`, no a ese ajuste
posterior. No se simuló una escritura de demo para probar invalidaciones.

`ce3fc9a` quedó en Vercel `success`. La revisión pública posterior confirmó
catálogo HTTP 200 `HIT` (54.514 bytes), cookies y filtros con respuesta
`private, no-cache, no-store`, imagen original al compartir HTTP 200 PNG,
dos lecturas de campañas HTTP 200 `no-store` con una campaña y recaudado 0,
y diagnóstico de administrador HTTP 404 sin sesión. En el navegador la sesión
existente siguió mostrando «Hola, Valentino» y la campaña cargó después del HTML.
Un primer chequeo esperaba `s-maxage=60` en el encabezado que recibe el cliente:
falló porque Vercel entrega `public, max-age=0, must-revalidate`; se corrigió
esa expectativa y se verificó el estado CDN `HIT`. No requirió cambiar código.

La consulta final de solo lectura conservó las mismas huellas de las tablas
`animales` (15 filas), `refugios` (2), `usuarios` (1) y `campanas` (2).
La donación real de ARS 100 sigue `pendiente`; no se creó otro intento ni se
cobró ni se acreditó manualmente. La otra cuenta y las fotos propias también
siguen pendientes. Sin nuevos servicios pagos ni cambios de plan.

Referencias: [reglas condicionales con ISR de Vercel](https://vercel.com/changelog/routing-based-on-headers-and-query-string-parameters),
[runner estándar gratuito para repositorios públicos](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job).

Publicación autorizada: push a `main` del repositorio `00tino/adoptar`, conectado
al proyecto Vercel `adoptar` (`prj_HJO5TcccOPJW9bMPdg6NYsazelgj`). El sitio público
es `https://adoptar.dpdns.org`; la verificación pública se hace después del deploy.

El asesor de seguridad informó RLS sin políticas sobre tablas privadas (intencional:
solo service role accede) y una advertencia previa sobre la vista agregada
`campanas_con_recaudado`. La vista no fue modificada por este lote; su acceso
existente permite sumar donaciones sin publicar sus filas privadas.
[Referencia del asesor sobre vistas](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).
