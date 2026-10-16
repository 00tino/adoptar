# AdoptAR — estado del trabajo, 16 de octubre de 2026

Migración aplicada en Supabase `adoptar` el 16 de octubre de 2026. El usuario
autorizó publicar este lote por GitHub → Vercel. No se eliminaron datos demo.
Se conserva la identidad visual.

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

Publicación autorizada: push a `main` del repositorio `00tino/adoptar`, conectado
al proyecto Vercel `adoptar` (`prj_HJO5TcccOPJW9bMPdg6NYsazelgj`). El sitio público
es `https://adoptar.dpdns.org`; la verificación pública se hace después del deploy.

El asesor de seguridad informó RLS sin políticas sobre tablas privadas (intencional:
solo service role accede) y una advertencia previa sobre la vista agregada
`campanas_con_recaudado`. La vista no fue modificada por este lote; su acceso
existente permite sumar donaciones sin publicar sus filas privadas.
[Referencia del asesor sobre vistas](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).
