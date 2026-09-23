# Arquitectura del asistente de WhatsApp — OFICIAL y gratis

Acompaña a `prompt_asistente_whatsapp.md`.

## Decisión tomada: vía OFICIAL (WhatsApp Cloud API) + gratis

- **Sin riesgo de ban** (es la vía permitida por Meta).
- **24/7 aunque la PC esté apagada** (lo hostea Meta + Google, no tu compu).
- **Gratis**: como los clientes inician la conversación, las respuestas dentro de la ventana de 24 h son gratis.
- **Condición:** requiere un **número nuevo dedicado** (no el personal, porque la Cloud API necesita un número que no esté en la app de WhatsApp).

### Stack oficial gratis

| Pieza | Herramienta gratis | Notas |
|---|---|---|
| Conexión WhatsApp | **WhatsApp Cloud API** (Meta) | Oficial, hosteada por Meta, 24/7, sin QR ni sesiones que se caen |
| Cerebro / lógica | **Google Apps Script** | Gratis, corre en servidores de Google, nativo con Sheets y Calendar; recibe el webhook de WhatsApp (`doPost`) |
| Memoria de conversación | **Google Sheets** (pestaña `Conversaciones`) | Ver §6 — clave para no repetir aunque el cliente tarde días |
| Recordatorios diarios | **Disparador horario de Apps Script** | Gratis, en la nube |
| **Avisos al owner (vos)** | **Bot de Telegram** | Avisos de pedidos + recordatorios → **gratis e ilimitado**. NO van por WhatsApp |
| **Responder al cliente** | **Bandeja web (Apps Script)** | Escribís ahí y sale desde el número del trabajo |
| Datos y agenda | **Google Sheets + Calendar** | Nativo desde Apps Script |
| IA que redacta | **Gemini free tier** | Para respuestas naturales y extraer datos |

### Cómo se reparte la mensajería (clave para que sea $0)

- **Cliente ↔ bot** → por el **WhatsApp del trabajo** (Cloud API). Gratis porque el cliente inicia.
- **Vos respondés al cliente** → desde una **bandeja web** (Apps Script) que envía con el número del trabajo. No necesitás el chip en la mano.
- **Avisos para vos** (nuevo pedido + recordatorios diarios) → por **Telegram**, gratis e ilimitado. No usan WhatsApp para evitar el costo de plantillas fuera de 24 h.

---

## 6. Memoria de conversación — que el bot NO repita aunque el cliente tarde

La ventana de 24 h de Meta es **solo una regla de facturación, NO borra la memoria**. La memoria la guardamos nosotros en la Sheet.

**Pestaña `Conversaciones`** (una fila por número de cliente):

| Número | Nombre | Estado charla | Producto/cantidad | Medidas/especificaciones | Fecha que necesita | Tiene arte | Última actualización |
|---|---|---|---|---|---|---|---|

Lógica en cada mensaje entrante:
1. El bot busca el **número del cliente** en la pestaña.
2. Si existe, **carga lo que ya sabía** y pregunta **solo lo que falta** (nunca repite).
3. Actualiza la fila con la info nueva.
4. Cuando las columnas obligatorias (producto/cantidad, medidas, fecha) están completas → dispara el **handoff** (avisa al owner y frena).

### El único matiz de las 24 h
- **Cliente vuelve a escribir** (aunque pasen días) → se abre ventana nueva, el bot responde **gratis** con toda la memoria. ✅ Caso normal.
- **El bot quiere escribir primero** tras 24 h de silencio (perseguir al cliente) → requiere *plantilla* aprobada y **tiene costo** (centavos). Se deja como **opción futura**, no se implementa gratis.

---

## Flujo completo

Cliente escribe → **Meta** reenvía el mensaje por webhook a **Apps Script** (`doPost`) → Apps Script lee la fila del cliente en la Sheet (memoria), consulta a **Gemini** para entender/responder, pregunta solo lo que falta y actualiza la fila → cuando junta los 3 datos, **te avisa por Telegram** con el resumen y frena → vos seguís la charla desde la **bandeja web** y cerrás → al confirmar la venta, escribe el pedido en Sheets y crea el evento en Calendar. En paralelo, un **disparador horario** de Apps Script lee la Sheet cada mañana y te manda el resumen **por Telegram**.

---

## Qué tenés que hacer vos (alto nivel, casi sin código)

1. Conseguir un **número nuevo dedicado** (un chip) que **no esté registrado en la app de WhatsApp**.
2. Crear una cuenta en **Meta for Developers**, dar de alta una app de **WhatsApp** y registrar ese número (Meta te da un número de prueba gratis para empezar a probar sin chip).
3. Crear una **Google Sheet** con las pestañas `Trabajos`, `Pedidos` y `Conversaciones`.
4. Pegar el **script de Apps Script** (te lo damos hecho), poner tus variables (tu número de owner, token de Meta, hora del resumen, ID del Calendar) y **publicarlo como Web App** → eso te da la URL del webhook.
5. Pegar esa URL en la config del webhook de WhatsApp en Meta.
6. Sacar una **API key gratis de Gemini** y pegarla en el script.
7. Autorizar el script para que acceda a tu Sheets y Calendar (un par de clics).

> Todo esto es copiar/pegar y clicar — no hay servidores ni Docker. No se mantiene solo (no hay sesiones que se caigan ni QR que re-escanear).

---

## Riesgos (con la base oficial)

Con la vía oficial **desaparecen** los riesgos grandes: **no hay ban**, **no hay sesión que se cae**, **no hay servidor propio que se apague**. Quedan riesgos menores:

### Verificación de empresa en Meta (a futuro)
- Para empezar y para volumen bajo no hace falta. Si crecés mucho, Meta puede pedir **verificar el negocio** (documentación). Es gratis pero burocrático.

### Límites de la capa gratis de Gemini
- Gemini free tiene **tope de mensajes por minuto/día**. Para tu volumen normal alcanza; con un pico muy grande, alguna respuesta puede demorar. Mitigable con una cola simple.

### Topes del plan gratis de WhatsApp
- Las respuestas a conversaciones **iniciadas por el cliente** dentro de 24 h son gratis. Lo único pago sería que el bot **escriba primero** después de 24 h (plantillas) → lo dejamos como opción futura.

### Mantenimiento mínimo
- Casi nulo, pero el **token de Meta** se renueva cada tanto (se puede dejar uno permanente) y si Apps Script cambia algo hay que ajustar. Nada que se rompa solo en el día a día.

### Apps Script tiene cuotas diarias
- Apps Script gratis tiene un **límite de ejecuciones/tiempo por día** (generoso para un asistente personal). Si algún día tu volumen lo supera, se migra la lógica a otra capa gratis (ej. Cloudflare Workers) sin tocar WhatsApp ni la Sheet.

---

## Resumen

| | **Cloud API oficial + Apps Script (elegido)** |
|---|---|
| Costo | **$0** (clientes inician → gratis) |
| Riesgo de ban | **Nulo** |
| 24/7 con PC apagada | **Sí** (Meta + Google hostean) |
| Memoria del cliente | **Sí**, en la Sheet, sin límite de tiempo |
| Número | **Nuevo dedicado** (no el personal) |
| Mantenimiento | **Mínimo** |
