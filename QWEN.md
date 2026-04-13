# QWEN.md - CasitaApp Context

## Project Overview

**CasitaApp** is a domestic expense tracking web application built for two users ("Franco" and "Fabiola"). It allows tracking shared household purchases, categorizing items, splitting costs between users, and viewing balance reports.

### Key Features
- **Purchase tracking** — Create, edit, and confirm purchases with line items.
- **Cost splitting** — Supports 50/50, single-payer, or custom split types per item.
- **Categories & subcategories** — Pre-seeded with ~16 categories and ~60 subcategories (e.g., Vivienda, Alimentos, Transporte).
- **Tags** — Items and purchases can be tagged (e.g., IMPREVISTO, VACACIONES, REGALO).
- **Balance reports** — Monthly summaries, category breakdowns, and settlement calculations.
- **Drafts** — Purchases can be saved as drafts before confirmation.
- **PWA support** — Includes service worker registration and manifest for installability.
- **Offline support** — Offline queueing via `lib/offline.ts`.
- **Charts** — Visualizations using Chart.js and Recharts.
- **Excel export** — Data export via `xlsx` library.

### Architecture

```
App gastos/
├── app/                 # Next.js App Router pages & layouts
│   ├── (privado)/       # Authenticated routes (dashboard, balance, historial, etc.)
│   ├── autenticacion/   # Auth callback routes
│   ├── ingresar/        # Login page
│   └── layout.tsx       # Root layout with providers
├── components/          # React component tree
│   ├── auth/            # Auth-related components
│   ├── balance/         # Balance & settlement UI
│   ├── compras/         # Purchase creation/editing
│   ├── dashboard/       # Dashboard widgets
│   ├── historial/       # History & filtering
│   ├── items/           # Item-level components
│   ├── layout/          # Layout shells
│   ├── pwa/             # PWA registration
│   └── ui/              # Reusable UI primitives
├── hooks/               # Custom React hooks (useBalance, useCompras, etc.)
├── lib/                 # Utility modules
│   ├── supabase/        # Supabase client & middleware
│   ├── calculos.ts      # Financial calculations
│   ├── categorizacion.ts
│   ├── chart.ts
│   ├── exportar.ts      # Excel/CSV export
│   ├── offline.ts       # Offline queue
│   └── sync.ts          # Data synchronization
├── supabase/            # Database schema & migrations
├── types/               # Shared TypeScript types
└── public/              # Static assets
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Database / Auth | Supabase (PostgreSQL) |
| State / Data fetching | TanStack React Query |
| Charts | Chart.js + Recharts |
| DnD | @dnd-kit |
| Icons | lucide-react |
| Toasts | sonner |
| Linting | ESLint (Next.js config) |

## Building and Running

### Prerequisites
- Node.js 22+
- npm 10+

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint with zero warnings allowed |

### Database Setup

1. Create a Supabase project.
2. Run `supabase/esquema.sql` in the SQL Editor.
3. Create two users in Supabase Auth (email + password).
4. Adjust profile names in the `perfiles` table if needed.

## Conventions

- **Strict TypeScript** — `strict: true` in tsconfig, with path aliases (`@/*` maps to root).
- **Supabase SSR** — Auth sessions managed via `@supabase/ssr` with cookie persistence. Middleware in `proxy.ts` handles session refresh on each request.
- **React Query** — Shared `QueryClient` via `Providers.tsx`, 5-minute stale time, refetch on window focus, 2 retries.
- **Auth** — Email/password login. Users created from Supabase Auth panel, not from the app.
- **Row Level Security** — All tables have RLS enabled with `authenticated`-only access.
- **Error resilience** — `queryConReintento()` retry wrapper for Supabase queries facing auth lock contention.

## Related Reference

This project follows the technical patterns established in `VeciDatos - copia/` (refer to `AGENTS.md` in the parent directory for the broader workflow). However, CasitaApp has its own independent Supabase project, Vercel deployment, and credentials.
