# Prompt: Asistente personal de WhatsApp para empresa de comunicación visual

> Pegá este prompt a quien construya el bot. Acompaña al documento `arquitectura_bot_gratis.md`, que define el stack técnico (WhatsApp Cloud API oficial + Google Apps Script + Sheets + Calendar + Telegram, todo gratis).

---

## 1. Objetivo

Quiero un **asistente personal en WhatsApp** que cumpla **dos funciones**:

1. **Recordarme a MÍ (el dueño)** los trabajos que tengo que hacer, leyéndolos de una **Google Sheet**. Los avisos me llegan **por Telegram**.
2. **Atender a mis clientes** automáticamente por WhatsApp y **recolectar toda la información del pedido**, hasta el punto en que yo tenga lo necesario para tomar la conversación y cerrar los detalles finales.

La empresa se dedica a **comunicación visual / gráfica**: impresión digital, adhesivos personalizados, banners, lonas, carteles, tarjetas, credenciales para despachantes y otros materiales gráficos y de identificación visual.

---

## 2. Restricción CRÍTICA: gratis

El bot tiene que ser **100% gratis**. La arquitectura elegida (ver `arquitectura_bot_gratis.md`) logra costo $0 usando la vía oficial. Si algún componente no pudiera ser gratis, avisar explícitamente antes de implementar.

---

## 3. Arquitectura y mensajería (resumen — detalle en el otro doc)

- **WhatsApp del trabajo** vía **Cloud API oficial** (Meta lo hostea → 24/7, sin riesgo de ban, sin QR). El número es el **número del trabajo**, dedicado, que vive en la API (no en la app del celular).
- **Cliente ↔ bot** → por WhatsApp del trabajo. Gratis porque el cliente inicia la conversación.
- **Yo respondo al cliente** → desde una **bandeja web** (hecha en Apps Script) que envía con el número del trabajo. No necesito el chip en la mano.
- **Avisos para MÍ** (nuevo pedido + recordatorios diarios) → **por Telegram**, gratis e ilimitado. **NUNCA por WhatsApp**, para no caer en el costo de plantillas fuera de la ventana de 24 h.

---

## 4. Función A — Recordatorios de mis trabajos (Sheets → Telegram)

**Fuente:** Google Sheet, pestaña `Trabajos`. Columnas sugeridas:

| Cliente | Trabajo / Descripción | Cantidad | Especificaciones | Fecha de entrega | Estado |
|---|---|---|---|---|---|

El bot me manda **por Telegram**:

1. **Resumen diario:** cada mañana (hora configurable, ej. 8:00), la lista de trabajos a hacer/entregar ese día y los próximos. Disparado por un trigger horario de Apps Script.
2. **Aviso por fecha de entrega:** me avisa **X días antes** de cada vencimiento (X configurable, ej. 2).
3. **Bajo demanda:** si le escribo al bot de Telegram *"¿qué tengo pendiente?"*, responde leyendo la Sheet en el momento.

---

## 5. Función B — Atención a clientes y recolección de pedidos

Cuando un cliente escribe al WhatsApp del trabajo, el bot lo atiende con tono cordial y profesional (español rioplatense) y **junta toda la info del pedido** antes de pasármelo.

### Info obligatoria a recolectar (no cerrar hasta tenerla toda):
1. **Producto/servicio y cantidad** (ej: 50 adhesivos, 1 banner, 100 tarjetas, lona, credenciales).
2. **Medidas / especificaciones**: tamaño, color, material, terminación, personalización, si tiene el arte/diseño listo o lo necesita.
3. **Fecha en que lo necesita** / urgencia.

> Si el cliente ya tiene el arte, pedirle que lo envíe y registrarlo.

### Comportamiento:
- Una pregunta por vez, sin abrumar.
- Repregunta con amabilidad si falta info.
- Responde dudas simples, pero **NO da precios ni promete plazos finales** (eso lo cierro yo).

### Memoria de conversación (CLAVE)
Pestaña `Conversaciones` en la Sheet, una fila por número de cliente:

| Número | Nombre | Estado charla | Producto/cantidad | Medidas/especificaciones | Fecha que necesita | Tiene arte | Última actualización |
|---|---|---|---|---|---|---|---|

En cada mensaje entrante el bot: busca el número → carga lo que ya sabía → pregunta **solo lo que falta** → actualiza la fila. **Nunca repite ni arranca de cero, aunque el cliente tarde días en responder** (la ventana de 24 h de Meta es solo facturación, no borra la memoria).

### Handoff — "me avisa por Telegram y frena"
Cuando ya tiene los 3 datos obligatorios:
1. **Me avisa por Telegram** con el resumen:
   > 🔔 Nuevo pedido — [Nombre/Número del cliente]
   > • Producto/cantidad: ...
   > • Especificaciones/medidas: ...
   > • Fecha que lo necesita: ...
   > • Tiene arte: sí/no
2. **Deja de responderle al cliente** (modo humano). Le dice algo tipo: *"¡Perfecto! Ya tengo todo. En un ratito te escribe [tu nombre] para cerrar los detalles 😊"*.
3. **Guarda el pre-pedido** en la Sheet (pestaña `Pedidos`) con estado **"A confirmar"**.
4. Yo sigo la charla con el cliente desde la **bandeja web** y cierro.

### Reactivación
- Definir cómo se reactiva el bot para ese cliente si hace falta (ej: comando desde Telegram). Proponer lo más simple.

---

## 5.b Cierre de venta — Sheets + Calendar

El cierre lo confirmo **yo** (ej: comando en Telegram `/cerrar [número]`, o cambiando el estado en la Sheet). Al confirmarse:

1. **Google Sheets — pestaña `Pedidos`:** estado pasa a **"Venta cerrada"** con datos finales:

   | Fecha pedido | Cliente | Contacto (WhatsApp) | Producto/Servicio | Cantidad | Especificaciones/Medidas | Fecha de entrega | Estado | Notas |
   |---|---|---|---|---|---|---|---|---|

   > Idealmente el pedido cerrado también alimenta los recordatorios de la Función A (misma Sheet / pestañas vinculadas).

2. **Google Calendar — evento de entrega:**
   - **Título:** `[Cliente] — [Producto/Servicio] x[Cantidad]`
   - **Fecha:** la fecha de entrega acordada.
   - **Descripción:** especificaciones, contacto, notas.
   - Recordatorio del evento X días antes.
   - Calendario **dedicado** ("Pedidos"), ID configurable.

Si cambio la fecha de entrega en la Sheet, idealmente se actualiza el evento (si complica, mejora futura).

---

## 6. Requisitos transversales

- **Idioma:** español rioplatense, tono cercano y profesional.
- **Memoria por conversación:** ver §5, no repetir.
- **Horario de atención:** configurable; fuera de horario, avisar que se responde más tarde.
- **Config fácil:** número de owner / chat de Telegram, token de Meta, hora del resumen, X días de aviso, ID de la Sheet e ID del Calendar como **variables editables**.

---

## 7. Lo que necesito de vos ANTES de codear

1. Confirmá la arquitectura gratuita (ver `arquitectura_bot_gratis.md`) y dónde se hostea gratis.
2. Marcá qué es 100% gratis y qué podría tener costo, con números.
3. Decime los pasos manuales que tengo que hacer (alta en Meta, Apps Script, webhook, bot de Telegram, autorizar Google), paso a paso, porque casi no programo.
4. Recién después, construí.

---

## 8. Decisiones ya tomadas (no volver a preguntar)

- Rubro: **comunicación visual / gráfica**, productos **a medida**.
- Presupuesto: **gratis, prioridad absoluta**.
- WhatsApp: **número del trabajo dedicado**, vía **Cloud API oficial** (sin ban, 24/7). No es el número personal.
- Nivel técnico: **casi nada de código** → Apps Script + pasos guiados.
- Datos en **Google Sheets**; agenda en **Google Calendar**.
- **Avisos al owner (pedidos + recordatorios) por Telegram**, no por WhatsApp.
- Recordatorios: **resumen diario + aviso por fecha de entrega + bajo demanda**.
- Datos a recolectar: **producto/cantidad + medidas/especificaciones + fecha que lo necesita**.
- Memoria por cliente en la Sheet: **el bot no repite aunque el cliente tarde días**.
- Handoff: **avisa por Telegram con resumen y frena**; yo respondo desde la **bandeja web**.
- Cierre de venta (confirmado por mí): **guarda en Sheets "Venta cerrada" + crea evento en Calendar**.
