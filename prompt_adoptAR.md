# PROMPT MAESTRO — AdoptAR 🐾
## Para usar con Claude Opus 4.8 o Claude 5 (cuando esté disponible)

---

## ROL Y CONTEXTO

Sos un arquitecto full-stack senior y diseñador UI/UX experto. Tu trabajo es construir **AdoptAR** (adoptaar.com), una plataforma web sin fines de lucro para adopción de animales en Argentina. El cliente no tiene experiencia técnica, así que **cada decisión técnica, de stack, de hosting y de arquitectura la tomás vos**, priorizando siempre:

1. **Costo cero o mínimo** (todo lo gratuito posible)
2. **SEO excelente** (la plataforma debe poder descubrirse en Google)
3. **Seguridad robusta** (datos de usuarios reales, donaciones, animales)
4. **Cero conocimiento técnico requerido del cliente** para mantenerla
5. **Escalabilidad futura** (empezamos gratis, pero el sistema debe poder crecer)

---

## STACK RECOMENDADO (vos decidís el mejor, acá hay guía)

### Frontend
- **Next.js 14+ con App Router** → SSR/SSG nativo = SEO perfecto
- **TypeScript** → menos bugs, más mantenibilidad
- **Tailwind CSS** → diseño rápido y consistente
- **Shadcn/ui** → componentes accesibles listos para usar

### Backend / Base de datos
- **Supabase** (capa gratuita generosa):
  - PostgreSQL como base de datos
  - Auth con OAuth (Clerk o Supabase Auth)
  - Storage para fotos y videos
  - Realtime para chat en vivo
  - Row Level Security para permisos por rol

### Hosting
- **Vercel** (gratuito para proyectos sin fines de lucro / pequeños):
  - Deploy automático desde GitHub
  - SSL gratis
  - Edge functions
  - Analytics básicos gratis

### Mapa
- **Leaflet.js + OpenStreetMap** → 100% gratuito, sin límite de requests, mapa interactivo de Argentina con zoom dinámico

### Donaciones (Argentina)
- **Mercado Pago Checkout Pro** → integración directa, sin costo de plataforma para ONGs (investigar si el cliente puede aplicar como ONG), todas las tarjetas argentinas, débito, transferencia
- **Transferencia bancaria CBU/CVU manual** como alternativa gratuita

### Notificaciones
- **Resend** (capa gratuita: 3.000 emails/mes) para emails automáticos
- Notificaciones in-app via Supabase Realtime

### Autenticación
- **Clerk** (gratuito hasta 10.000 usuarios activos/mes) → manejo de roles, OAuth Google/Apple, MFA opcional

---

## ARQUITECTURA DEL SISTEMA

### Roles de usuario

```
1. VISITANTE (sin cuenta)
   - Puede ver todos los animales
   - Puede ver el mapa
   - Puede ver refugios
   - NO puede contactar, NO puede donar sin registrarse

2. USUARIO INDIVIDUAL
   - Registro con email/contraseña o Google/Apple via Clerk
   - Puede explorar y filtrar animales
   - Puede contactar refugios (chat in-app, WhatsApp, email, teléfono)
   - Puede publicar animales EN TRÁNSITO (requiere aprobación admin)
   - Tiene perfil público (solo si tiene animal activo en tránsito)
   - Puede donar
   - Tiene rating visible SOLO para cuentas de refugio (1-5 estrellas + comentario)

3. REFUGIO VERIFICADO (nivel básico)
   - Registro con datos completos: nombre, dirección, teléfono, email, video institucional, redes
   - Requiere aprobación MANUAL del admin antes de activarse
   - Puede publicar animales en adopción (cada animal requiere aprobación admin)
   - Puede calificar usuarios (1-5 estrellas + comentario, visible solo para otros refugios)
   - Tiene página de perfil pública
   - Puede solicitar campañas de donación (requiere aprobación admin)
   - Tiene chat con usuarios interesados
   - No puede cambiar datos sin aprobación admin

4. REFUGIO ESTRELLA (nivel premium, asignado por admin)
   - Mismo que Refugio Verificado PERO:
   - Puede publicar animales SIN aprobación previa
   - Puede editar sus datos SIN aprobación previa
   - Badge visual especial en la página pública
   - Esta distinción NO es visible al usuario final como "Refugio Estrella", solo internamente

5. ADMIN (único, vos)
   - Panel completo de gestión
   - Ver y gestionar TODO
```

---

## PÁGINAS Y FUNCIONALIDADES DETALLADAS

### 1. HOME (/)
- Hero con imagen impactante + copy emocional en español
- Buscador rápido de animales (especie, zona)
- Grid de animales destacados (mezcla adopción + tránsito)
- Sección de refugios destacados
- Sección de donaciones activas
- Call to action: "Adoptá", "Publicá un animal en tránsito", "Creá tu refugio"
- Footer con links, redes, info legal
- **SEO:** meta tags completos, Open Graph, Schema.org para cada animal (tipo: Pet, disponible para adopción)

### 2. CATÁLOGO DE ANIMALES (/animales)
- Grid/lista de todos los animales disponibles (adopción + tránsito)
- Filtros: especie (perro, gato, otro), edad, tamaño, sexo, castrado/esterilizado, ubicación (provincia/ciudad), tipo (adopción / tránsito)
- Pestaña dedicada "Solo tránsito" que filtra automáticamente
- Cada card muestra: foto principal, nombre, especie, edad, ubicación aproximada, badge "En tránsito" o "En adopción", nombre del refugio o "Particular"
- Paginación o scroll infinito
- **SEO:** URLs amigables tipo /animales/adoptar-perro-buenos-aires

### 3. PERFIL DE ANIMAL (/animales/[slug])
- Galería de fotos + video (si hay)
- Datos completos: nombre, especie, raza, edad, sexo, castrado/esterilizado, vacunas, descripción libre
- Badge de estado: "Disponible", "En proceso de adopción", "Adoptado"
- Mini mapa mostrando ubicación del animal (exacta para refugios, aproximada ~500m para particulares)
- Sección de contacto con TODOS los métodos disponibles del refugio/particular:
  - Botón WhatsApp (abre wa.me/número directo)
  - Botón Email
  - Botón llamada telefónica
  - Chat interno de la plataforma
- Animales relacionados (misma zona o especie)
- **SEO:** título dinámico "Adoptá a [nombre] - [especie] en [ciudad] | AdoptAR"

### 4. MAPA (/mapa)
- Mapa interactivo de Argentina usando Leaflet + OpenStreetMap
- Al hacer zoom en una zona, aparecen los animales disponibles en esa área dinámicamente (clustering de marcadores para zonas con muchos animales)
- Marcadores diferenciados: ícono pata = animal en adopción, ícono corazón = en tránsito, ícono casa = refugio
- Al tocar un marcador: popup con foto, nombre, y botón "Ver más"
- Filtro rápido en el mapa: "Ver solo refugios", "Ver solo animales en tránsito", "Ver todos"
- Geolocalización del usuario (botón "Cerca mío") — pide permiso del navegador
- Particulares en tránsito: ubicación desplazada ~500m aleatoriamente para privacidad

### 5. REFUGIOS (/refugios)
- Listado de todos los refugios verificados
- Card con: foto, nombre, ciudad, cantidad de animales disponibles, métodos de contacto
- Página de perfil de cada refugio (/refugios/[slug]) con todos sus animales activos

### 6. TRÁNSITO (/transito)
- Explicación de qué es el tránsito
- Listado de animales actualmente en tránsito publicados por particulares
- CTA: "Tengo un animal que necesita tránsito" → formulario de publicación
- CTA: "Quiero ser hogar de tránsito" → formulario de contacto

### 7. DONACIONES (/donaciones)
- Listado de campañas de donación activas (aprobadas por admin):
  - Campañas de refugios (manutención, operaciones)
  - Causa general: manutención de la plataforma AdoptAR
- Cada campaña muestra: nombre, descripción, foto, meta de donación (si tiene), progreso
- Botones de donación: Mercado Pago y/o transferencia bancaria (CBU/CVU)
- Opción de donar anónimamente o con nombre
- Sin generación de comprobante fiscal por ahora (sistema preparado para agregarlo en el futuro)

### 8. REGISTRO/LOGIN (/auth)
- Manejado completamente por Clerk
- Opciones: email/contraseña, Google, Apple
- Al registrarse, el usuario elige: "Soy un particular" o "Quiero registrar mi refugio"

### 9. PUBLICAR ANIMAL EN TRÁNSITO (/publicar-transito)
- Solo para usuarios individuales logueados
- Formulario: fotos (mín 2, máx 6), video obligatorio (para verificación), nombre del animal, especie, raza, edad aproximada, sexo, castrado/esterilizado, vacunas, descripción, zona (ciudad, NO dirección exacta), métodos de contacto disponibles
- Estado inicial: "Pendiente de verificación por admin"
- Notificación automática al usuario cuando sea aprobado o rechazado (in-app + email)

### 10. REGISTRAR REFUGIO (/registrar-refugio)
- Formulario con: nombre del refugio, descripción, dirección completa, teléfono, email, redes sociales, WhatsApp, video institucional (URL YouTube/Drive), fotos del refugio
- Estado inicial: "Solicitud pendiente"
- Notificación automática cuando sea aprobado/rechazado
- Al ser aprobado: puede publicar animales que van a verificación admin
- Al ser marcado como "Estrella" por admin: publica sin verificación

### 11. CHAT IN-APP
- Chat simple entre usuario y refugio/particular, solo cuando hay un animal en común
- Implementado con Supabase Realtime
- Notificación de mensaje nuevo: in-app + email

---

## PANEL DE ADMINISTRACIÓN (/admin) — SOLO VOS

### Dashboard principal
- Estadísticas en tiempo real:
  - Animales publicados (total, por especie, por estado)
  - Refugios activos vs pendientes
  - Usuarios registrados
  - Donaciones recibidas (total acumulado, por campaña)
  - Animales adoptados este mes
- Gráficos de evolución mensual

### Gestión de solicitudes pendientes (cola de aprobación)
- **Refugios pendientes**: ver toda la info, video, documentación → Aprobar / Rechazar / Pedir más info
- **Animales de particulares**: ver fotos, video → Aprobar / Rechazar con motivo
- **Animales de refugios verificados** (no estrella): ver info → Aprobar / Rechazar
- **Campañas de donación**: ver detalles → Aprobar / Rechazar

### Gestión de usuarios
- Buscar usuario por email/nombre
- Ver perfil completo + historial + rating acumulado
- Suspender cuenta / reactivar / eliminar permanentemente
- Enviar notificación manual al usuario

### Gestión de refugios
- Ver todos los refugios (activos, suspendidos, pendientes)
- Marcar/desmarcar como "Estrella" (acceso sin verificación previa)
- Suspender / Eliminar refugio
- Ver todos los animales de ese refugio
- Editar datos si es necesario

### Gestión de donaciones
- Ver todas las campañas activas
- Ver historial de donaciones recibidas (anónimas y con datos)
- Marcar donaciones como "acreditadas" o "pendientes"

### Notificaciones
- Todas las notificaciones se envían automáticamente vía Resend al email del afectado + in-app
- Triggers automáticos:
  - "Tu refugio fue aprobado / rechazado"
  - "Tu animal fue aprobado / rechazado"
  - "Tu solicitud de donación fue aprobada / rechazada"
  - "Tenés un nuevo mensaje"
  - "Tu cuenta fue suspendida"

### Exportación de datos
- Exportar a CSV/Excel: adopciones, donaciones, refugios activos, usuarios registrados

---

## DISEÑO VISUAL

Aplicar la filosofía del skill `frontend-design`:

- **Nombre:** AdoptAR (con la A final en acento, como "Adoptá + AR")
- **Idioma:** Español exclusivamente
- **Paleta sugerida:** cálida y esperanzadora, no clínica. Pensar en tonos tierra/naranja/verde suave. Evitar azul corporativo genérico.
- **Tipografía:** una display con personalidad (no Roboto ni Inter genérico), un body legible
- **Personalidad:** cercana, argentina, emotiva pero profesional. Que se sienta como una comunidad, no como un trámite burocrático.
- **Mobile-first:** la mayoría de los usuarios van a entrar desde el celular
- **Accesibilidad:** contraste AA mínimo, foco de teclado visible, texto alternativo en imágenes de animales
- **Sin animaciones excesivas** — solo las necesarias para dar vida

---

## SEO — CRÍTICO

- Next.js App Router con generateMetadata() por página
- URLs en español: /animales/adoptar-perro-labrador-buenos-aires
- Schema.org markup para animales (type: Animal, availableAtOrFrom, location)
- Schema.org para refugios (type: Organization, LocalBusiness)
- Sitemap.xml automático
- robots.txt correcto
- Open Graph para compartir en redes (imagen del animal + nombre + ciudad)
- Velocidad: imágenes optimizadas con next/image, lazy loading
- Core Web Vitals en verde

---

## SEGURIDAD

- Row Level Security (RLS) en Supabase para todos los modelos
- Los datos de ubicación exacta de particulares NUNCA se almacenan en la base de datos pública — solo se guarda la coordenada desplazada (~500m random)
- Validación de formularios client-side Y server-side
- Rate limiting en endpoints de contacto y donación
- Variables de entorno para todas las claves API (nunca en el código)
- Clerk maneja toda la autenticación → sin contraseñas que manejar manualmente
- HTTPS obligatorio (Vercel lo da gratis)
- Sanitización de inputs para prevenir XSS/SQLi

---

## MODELO DE DATOS (PostgreSQL en Supabase)

```sql
-- Usuarios (extendido de Clerk)
users: id, clerk_id, email, nombre, tipo (individual/refugio/admin), created_at, suspendido

-- Refugios
refugios: id, user_id, nombre, descripcion, direccion, ciudad, provincia, 
          lat, lng, telefono, email, whatsapp, redes_json, video_url, fotos_json,
          estado (pendiente/verificado/estrella/suspendido), created_at

-- Animales
animales: id, refugio_id, particular_id, nombre, especie, raza, edad, sexo,
          castrado, vacunas_json, descripcion, fotos_json, video_url,
          lat, lng, lat_aprox, lng_aprox, tipo (adopcion/transito),
          estado (pendiente/disponible/en_proceso/adoptado/rechazado), created_at

-- Donaciones / Campañas
campanas: id, refugio_id, titulo, descripcion, meta_monto, tipo (refugio/plataforma),
          estado (pendiente/activa/cerrada), created_at

donaciones: id, campana_id, donor_nombre (nullable), donor_email (nullable),
            monto, metodo (mercadopago/transferencia), anonima, estado, created_at

-- Ratings de usuarios (solo visibles para refugios)
ratings: id, refugio_id, usuario_id, estrellas (1-5), comentario, created_at

-- Mensajes de chat
mensajes: id, sender_id, receiver_id, animal_id, contenido, leido, created_at

-- Notificaciones
notificaciones: id, user_id, tipo, contenido, leida, created_at
```

---

## FLUJO DE DESARROLLO SUGERIDO (por fases)

### FASE 1 — Fundación (MVP)
1. Setup: Next.js + Supabase + Clerk + Vercel + Tailwind + Shadcn
2. Auth completa (registro, login, roles)
3. CRUD de animales (solo refugios, con aprobación admin)
4. Home + Catálogo + Perfil de animal
5. Panel admin básico (aprobar/rechazar)
6. Deploy a Vercel

### FASE 2 — Mapa y tránsito
7. Mapa con Leaflet + OpenStreetMap
8. Flujo de tránsito para particulares
9. Perfil de refugios
10. Sistema de notificaciones (Resend)

### FASE 3 — Social y donaciones
11. Chat in-app (Supabase Realtime)
12. Sistema de ratings
13. Donaciones (Mercado Pago + transferencia)
14. Panel admin completo con estadísticas

### FASE 4 — SEO y pulido
15. Schema.org, sitemap, meta tags
16. Optimización de performance
17. Testing y corrección de bugs
18. Exportación de datos CSV

---

## INSTRUCCIONES PARA EL MODELO

1. **Empezá siempre por la FASE 1** a menos que se te indique lo contrario
2. **Para cada componente nuevo**, explicá brevemente qué hace y por qué lo estás construyendo así
3. **Nunca uses** variables de entorno hardcodeadas en el código — siempre `.env.local` con instrucciones de cómo configurarlas
4. **Comentá el código** en español para que el cliente pueda entender qué hace cada parte
5. **Para el diseño**, seguí la filosofía del skill `frontend-design`: paleta deliberada, tipografía con personalidad, mobile-first, sin templates genéricos
6. **Cada vez que crees un archivo**, confirmá la ruta exacta donde debe guardarse dentro del proyecto Next.js
7. **Al final de cada fase**, listá los pasos exactos para hacer deploy en Vercel y configurar las variables de entorno en Supabase
8. **Si hay una decisión técnica importante** con trade-offs, mencionala brevemente y decí cuál elegiste y por qué
9. **Recordá siempre** que el objetivo es costo cero, SEO máximo, seguridad robusta, y cero dependencia técnica del cliente para el día a día

---

## RESUMEN EJECUTIVO DEL PROYECTO

**AdoptAR** es una plataforma web argentina sin fines de lucro para conectar animales que necesitan hogar con personas que quieren adoptar. Tiene tres tipos de usuarios (individuales, refugios, admin), un mapa interactivo de Argentina, sistema de donaciones local, chat en vivo, y un panel de administración completo para moderar todo el contenido. Se construye con stack moderno y gratuito (Next.js, Supabase, Vercel, Clerk) priorizando SEO, seguridad y escalabilidad futura.

---

*Prompt creado para ser usado con Claude Opus 4.8 o Claude 5*
*Versión 1.0 — Junio 2026*
