# CasitaApp

Web app de gastos domesticos para dos usuarios, construida con Next.js App Router, Supabase, Tailwind CSS y deploy en Vercel.

## Requisitos

- Node.js 22 o superior
- npm 10 o superior

## Variables de entorno

Crear `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Desarrollo

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Base de datos

El schema y seed estan en `supabase/esquema.sql`.

Pasos sugeridos:

1. Crear el proyecto en Supabase.
2. Ejecutar `supabase/esquema.sql` en el SQL Editor.
3. Crear los usuarios desde Supabase Auth.
4. Completar o corregir los nombres de los perfiles en la tabla `perfiles`.
5. Para magic link, agregar como redirect URL:
   - `http://localhost:3000/autenticacion/callback`
   - `https://casitaapp.vercel.app/autenticacion/callback` o tu dominio final

## Flujo de autenticacion

- Login por magic link, sin password.
- La sesion se guarda con cookies via `@supabase/ssr`.
- El callback de autenticacion es `/autenticacion/callback`.

## Deploy en Vercel

1. Crear un proyecto nuevo en Vercel y conectar el repo `BrienzaFranco/casitaapp`.
2. Configurar las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Usar `main` como rama de produccion.
4. Cada push a `main` dispara un deploy automatico.
