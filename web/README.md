# AdoptAR 🐾

Plataforma argentina sin fines de lucro para adopción de animales.
**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Supabase + Vercel.

## Correr el proyecto en tu compu

```bash
cd web
npm install
npm run dev
```

Abrí http://localhost:3000 — la app funciona **sin configurar nada** usando
datos de demostración (`src/lib/datos.ts`).

## Estado del proyecto (Fase 1)

✅ Hecho:
- Diseño completo (paleta cálida, tipografías Fraunces + Nunito Sans, mobile-first)
- Home, catálogo con filtros, perfil de animal, refugios, tránsito, donaciones
- Formularios de "publicar tránsito" y "registrar refugio" (envío pendiente de BD)
- Panel admin (vista previa con estadísticas)
- SEO: metadata por página, Schema.org, sitemap.xml, robots.txt, URLs en español
- Esquema SQL de Supabase con Row Level Security (`supabase/schema.sql`)

⏳ Próximo (requiere crear cuentas gratuitas):
1. **Supabase**: crear proyecto en supabase.com, ejecutar `supabase/schema.sql`
   en el SQL Editor, copiar las claves a `.env.local` (ver `.env.local.example`)
2. **Clerk**: crear app en clerk.com para login con Google/email
3. Conectar los formularios y la cola de aprobación del admin

## Deploy en Vercel (gratis)

1. Subí el repo a GitHub
2. En [vercel.com](https://vercel.com) → "Add New Project" → importá el repo
3. Root Directory: `web`
4. En "Environment Variables" pegá las mismas claves de `.env.local`
5. Deploy — cada `git push` redeploya solo

## Estructura

```
web/
├── src/app/            # páginas (App Router)
│   ├── animales/       # catálogo + perfil por slug
│   ├── refugios/       # listado + perfil por slug
│   ├── transito/       # qué es el tránsito + listado
│   ├── donaciones/     # campañas activas
│   ├── publicar-transito/, registrar-refugio/  # formularios
│   ├── admin/          # panel (se protege con Clerk)
│   ├── sitemap.ts, robots.ts
├── src/components/     # Header, Footer, CardAnimal, FotoAnimal
├── src/lib/            # tipos, datos (demo → Supabase), cliente supabase
└── supabase/schema.sql # base de datos completa con RLS
```
