# CasitaApp - Dashboard Redesign Brief

## 1. APP OVERVIEW

**CasitaApp** is a domestic expense tracking web application for two users ("Franco" and "Fabiola"). It allows tracking shared household purchases, categorizing items, splitting costs between users, and viewing balance reports.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Database / Auth | Supabase (PostgreSQL) |
| State / Data fetching | TanStack React Query |
| Charts | Chart.js + Recharts |
| Icons | lucide-react |
| Toasts | sonner |
| Excel Export | xlsx |

### Core Data Model

- **Compra (Purchase)**: Transaction with date, place, notes, payer (`pagador_general`: franco/fabiola/compartido), status (`estado`: borrador/confirmada), tags, and line items.
- **Item (Line Item)**: Description, amount (`monto_resuelto`), category, subcategory, split type (`tipo_reparto`: 50/50, solo_franco, solo_fabiola, personalizado), per-person payment amounts (`pago_franco`, `pago_fabiola`), tags.
- **Categoria**: 16 seeded categories with name, color, monthly budget limit (`limite_mensual`), fixed flag (`es_fijo`).
- **Subcategoria**: ~60 subcategories belonging to categories, optional monthly limits.
- **Etiqueta**: 7 seeded tags (e.g., IMPREVISTO, VACACIONES, REGALO) with name + color.
- **SettlementCut**: Balance settlement records with date, note, active flag.

### Data Architecture

```
usarUsuario (auth)
     |
     v
usarCompras (all purchases) --+
     |                         |
usarCategorias (cats/subs/tags) +---> usarBalance (aggregates everything)
     |                                                       |
usarSettlementCuts (cuts) ----------------------------------+
```

---

## 2. CURRENT DASHBOARD PAGE

**File**: `app/(privado)/dashboard/page.tsx`

### Current Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                  │
│ [Month Selector] [Export Button]                        │
│ "Metricas" + Month Label                                 │
├─────────────────────────────────────────────────────────┤
│ KPI GRID (4 cards)                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐          │
│ │Gasto     │Promedio  │Mayor     │Balance   │          │
│ │Total     │Diario    │Categoria │Pendiente │          │
│ └──────────┴──────────┴──────────┴──────────┘          │
├─────────────────────────────────────────────────────────┤
│ USER CONTRIBUTIONS (2 cards side-by-side)               │
│ ┌───────────────────┬───────────────────┐              │
│ │ Franco paid X     │ Fabiola paid Y    │              │
│ └───────────────────┴───────────────────┘              │
├─────────────────────────────────────────────────────────┤
│ SPENDING TREND + FIXED/VARIABLE (2 columns)             │
│ ┌─────────────────────────┬───────────────────┐        │
│ │ GraficoRitmoGasto       │ DonutFijosVariables│       │
│ │ (cumulative daily line) │ (fixed vs variable)│       │
│ └─────────────────────────┴───────────────────┘        │
├─────────────────────────────────────────────────────────┤
│ GraficoAportesMensuales (full-width stacked bar chart)  │
│ Monthly contributions - last 6 months                   │
├─────────────────────────────────────────────────────────┤
│ BUDGET + TREEMAP (2 columns)                            │
│ ┌─────────────────────────┬───────────────────┐        │
│ │ EstadoPresupuestos      │ TreemapSubcategorias│       │
│ │ (budget vs actual bars) │ (top 10 subcats)   │       │
│ └─────────────────────────┴───────────────────┘        │
├─────────────────────────────────────────────────────────┤
│ ComparativaPersonal (full-width horizontal stacked bar)  │
│ Per-category spending by person                         │
├─────────────────────────────────────────────────────────┤
│ Insights Automaticos (3 cards)                          │
│ Auto-generated alerts and observations                   │
└─────────────────────────────────────────────────────────┘
```

### Current KPI Cards

1. **Gasto total**: Total monthly spending + month-over-month variance (% change)
2. **Promedio diario**: Daily average spending (total / days in month)
3. **Mayor categoria**: Top spending category + % of total
4. **Balance pendiente**: Who owes whom and how much

### Current Charts/Components

| Component | Type | Data | Library |
|-----------|------|------|---------|
| `GraficoRitmoGasto` | Cumulative daily spending line chart | Current month vs previous month, day-by-day running total | Recharts |
| `DonutFijosVariables` | Donut chart | Fixed vs variable expenses split | Recharts |
| `GraficoAportesMensuales` | Stacked bar chart | Monthly contributions last 6 months (Franco vs Fabiola) | Recharts |
| `EstadoPresupuestos` | Progress bars with projections | Budget vs actual + end-of-month projection per category | N/A (custom) |
| `TreemapSubcategorias` | Treemap | Top 10 subcategories by spending | Recharts |
| `ComparativaPersonal` | Horizontal stacked bar | Per-category spending by person | Recharts |
| Insights Automaticos | Alert cards | Auto-generated warnings/observations | N/A (custom) |

---

## 3. AVAILABLE DATA (from `useBalance` hook)

All data is computed and available via `usarBalance()` hook:

### Balance Summary (`resumenMes`)
- `total`: Total spending for selected month
- `franco_pago`: Total Franco paid
- `fabiola_pago`: Total Fabiola paid
- `franco_corresponde`: What corresponds to Franco
- `fabiola_corresponde`: What corresponds to Fabiola
- `balance`: Net balance (who owes whom)
- `deudor`: Name of debtor
- `acreedor`: Name of creditor

### Month-over-Month Variance (`variacionMensual`)
- `actual`: Current month total
- `anterior`: Previous month total
- `diferencia`: Absolute difference
- `porcentaje`: Percentage change

### Historical Summary (`resumenHistorico`)
- Array of monthly summaries: `{mes, total, franco, fabiola, balance, deudor, acreedor}`

### Open Balance Since Last Settlement (`saldoAbierto`)
- Same structure as `resumenMes` but filtered since last `settlement_cut`

### Category Breakdown (`categoriasMes`)
- Sorted array of: `{categoria, es_fijo, total, porcentaje (of budget), subcategorias[]}`
- Each subcategoria: `{subcategoria, total, porcentaje}`

### Tag Breakdown (`etiquetasMes`)
- Sorted array of: `{etiqueta, total, cantidad_items}`

### Top Spending Days (`diasMasGasto`)
- Top 5: `{fecha, total}`

### Daily Spending Trend (`tendenciaDiariaMes`)
- Array of: `{fecha, total}`

### Additional Computed Data
- `comprasMes`: All purchases for selected month (with full items)
- `comprasMesAnterior`: All purchases for previous month
- `comprasAbiertas`: All purchases since last settlement cut
- `nombres`: `{franco, fabiola}` - user names
- `colores`: `{franco, fabiola}` - user colors (from `usarConfiguracion`)

---

## 4. CALCULATIONS LIBRARY (`lib/calculos.ts`)

Available functions that can power new charts:

| Function | Returns | Use Case |
|----------|---------|----------|
| `calcularBalance()` | Who owes whom | Balance calculations |
| `construirBalanceHistorico()` | Monthly historical data | Historical trend charts |
| `calcularCategoriasMes()` | Category breakdown | Category donuts, treemaps |
| `calcularEtiquetasMes()` | Tag breakdown | Tag charts |
| `calcularDiasMasGasto()` | Top 5 spending days | Top days widget |
| `calcularSerieGastoDiario()` | Daily spending series | Line charts |
| `calcularGastoAcumuladoDia()` | Cumulative daily (current vs prev) | Running total comparison |
| `calcularVariacionPeriodo()` | Month-over-month variance | KPI variance indicator |
| `analizarDeudaPorCategoria()` | Debt breakdown by category | Detailed debt analysis |
| `filtrarComprasPorMes()` | Filtered purchases | Month filtering |
| `filtrarComprasDesdeFechaExclusiva()` | Filtered purchases | Post-settlement filtering |
| `obtenerMesAnterior()` | Previous month key | Comparison logic |
| `calcularReparto()` | Split calculation | Per-item split logic |
| `totalCompra()` | Purchase total | Sum line items |

---

## 5. CHARTING LIBRARIES AVAILABLE

### Recharts (Primary - currently used in dashboard)
- Already installed and configured
- Used for: Line charts, Bar charts, Pie/Donut, Treemap
- Supports: ResponsiveContainer, Tooltips, Gradients, Custom shapes
- Components available: `LineChart`, `BarChart`, `PieChart`, `Treemap`, `AreaChart`, `ComposedChart`, `ScatterChart`, `RadialBarChart`, `RadarChart`

### Chart.js + react-chartjs-2 (Secondary)
- Already installed and configured
- Used in other components (not dashboard)
- Supports: Line, Bar, Doughnut, Pie, Radar, PolarArea, Bubble, Scatter
- Components available: `ChartComponent`, all chart types

### Other available libraries
- `lucide-react`: Icons
- `mathjs`: Expression evaluation
- `@dnd-kit`: Drag and drop (for reorderable items)

---

## 6. TYPES DEFINITION (`types/index.ts`)

Key types used throughout the app:

```typescript
type TipoReparto = "50/50" | "solo_franco" | "solo_fabiola" | "personalizado";
type PagadorCompra = "franco" | "fabiola" | "compartido";
type EstadoCompra = "borrador" | "confirmada";

interface Compra { id, fecha, nombre_lugar, notas, pagador_general, estado, items[], etiquetas_compra[] }
interface Item { id, descripcion, monto_resuelto, tipo_reparto, pago_franco, pago_fabiola, categoria, subcategoria, etiquetas[] }
interface Categoria { id, nombre, color, limite_mensual, es_fijo }
interface Subcategoria { id, nombre, limite_mensual }
interface Etiqueta { id, nombre, color }
interface ResumenBalance { total, franco_pago, fabiola_pago, balance, deudor, acreedor }
interface BalanceMensualFila { mes, total, franco, fabiola, balance, deudor, acreedor }
interface CategoriaBalance { categoria, es_fijo, total, porcentaje, subcategorias[] }
interface EtiquetaBalance { etiqueta, total, cantidad_items }
interface VariacionPeriodo { actual, anterior, diferencia, porcentaje }
```

---

## 7. DESIGN SYSTEM

### Color Palette (Material Design 3 inspired)
- `--primary`, `--on-primary`
- `--surface`, `--surface-container-low`, `--surface-container-lowest`, `--surface-container-high`, `--surface-container-highest`
- `--on-surface`, `--on-surface-variant`
- `--outline`, `--outline-variant`
- `--success`, `--error`
- User-specific colors: `colorFran`, `colorFabi` (dynamic from config)

### Typography
- `font-headline`: Section titles
- `font-label`: Labels, captions, small text

### Component Patterns
- Cards: `bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4`
- Section titles: `font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant/70`
- Charts wrapped in: `<section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">`

---

## 8. HOOKS AVAILABLE

| Hook | File | Provides |
|------|------|----------|
| `usarBalance()` | `hooks/usarBalance.ts` | All computed dashboard data |
| `usarCompras()` | `hooks/usarCompras.ts` | CRUD for purchases |
| `usarCategorias()` | `hooks/usarCategorias.ts` | Categories, subcategories, tags + CRUD |
| `usarConfiguracion()` | `hooks/usarConfiguracion.ts` | User colors, hidden places, user names |
| `usarSettlementCuts()` | `hooks/usarSettlementCuts.ts` | Settlement records, create new cut |
| `usarUsuario()` | `hooks/usarUsuario.ts` | Auth user, profiles, session |

---

## 9. ROUTES STRUCTURE

```
/(privado)/
  ├── dashboard/        ← TARGET FOR REDESIGN
  ├── /                 ← Home page
  ├── balance/          ← Settlement calculations
  ├── historial/        ← Purchase history + filters
  ├── nueva-compra/     ← Create purchase
  ├── anotador-rapido/  ← Quick entry
  ├── borradores/       ← Drafts
  └── configuracion/    ← Settings
```

---

## 10. POTENTIAL NEW METRICS/CHARTS

Based on available data, here are metrics/charts that COULD be added:

### New KPIs
- **Savings vs previous month**: Absolute savings amount
- **% Shared vs Individual spending**: Split type breakdown percentage
- **Days until month end**: Remaining days counter
- **Budget health score**: Overall budget utilization across all categories
- **Average purchase size**: Total / number of purchases
- **Number of purchases**: Purchase count for the month
- **Debt reduction rate**: How much debt decreased since last settlement

### New Chart Ideas
1. **Spending by Split Type Donut**: 50/50 vs solo_franco vs solo_fabiola vs personalizado
2. **Tag Spending Bar Chart**: Total spending per tag
3. **Category Trend Line**: Top categories over last 6 months (multi-line)
4. **Debt Over Time**: Balance progression month by month
5. **Spending by Day of Week**: Heatmap or bar chart showing which days spend more
6. **Spending Rate vs Budget**: Gauges showing how fast budget is consumed
7. **Category Correlation Matrix**: Which categories tend to appear together
8. **Running Balance Chart**: Who owes whom over time (cumulative)
9. **Purchase Frequency**: Number of purchases per week
10. **Top Places**: Most expensive stores/places
11. **Category Ring Chart**: Interactive donut showing category breakdown
12. **Weekly Comparison**: This week vs last week vs average
13. **Spending Velocity**: Days elapsed vs % of budget consumed
14. **Monthly Forecast**: Predict end-of-month total based on current pace
15. **Personal Debt Breakdown**: Detailed who-owes-whom by category

### UI Enhancements
- **Summary cards with sparklines**: KPI + mini trend
- **Interactive filters**: Filter dashboard by tag/category/person
- **Drill-down modals**: Click chart element to see underlying purchases
- **Goal progress rings**: Visual budget completion indicators
- **Comparison badges**: Quick visual indicators for good/bad trends
- **Personalized insights**: AI-generated observations
- **Quick settlement button**: One-click "quedar a mano"

---

## 11. EXISTING DASHBOARD COMPONENTS (for reference)

Located in `components/dashboard/` (18 files):

| File | Status | Description |
|------|--------|-------------|
| `GraficoRitmoGasto.tsx` | ✅ USED | Cumulative daily spending (Recharts Line) |
| `GraficoAportesMensuales.tsx` | ✅ USED | Monthly contributions (Recharts Bar) |
| `EstadoPresupuestos.tsx` | ✅ USED | Budget progress bars |
| `DonutFijosVariables.tsx` | ✅ USED | Fixed vs variable donut |
| `TreemapSubcategorias.tsx` | ✅ USED | Subcategory treemap |
| `ComparativaPersonal.tsx` | ✅ USED | Personal comparison (horizontal stacked bar) |
| `ChartCategoriaInteractivo.tsx` | ⏸️ AVAILABLE | Interactive category donut |
| `ChartDesgloseReparto.tsx` | ⏸️ AVAILABLE | Split type donut |
| `ChartEtiquetasInteractivo.tsx` | ⏸️ AVAILABLE | Tag spending chart |
| `ChartGastoMensual.tsx` | ⏸️ AVAILABLE | Monthly spending overview |
| `ChartAportesMensuales.tsx` | ⏸️ AVAILABLE | Monthly contributions (Chart.js) |
| `ChartComparativaPersonal.tsx` | ⏸️ AVAILABLE | Personal comparison (Chart.js) |
| `ChartRitmoGasto.tsx` | ⏸️ AVAILABLE | Spending rhythm (Chart.js) |
| `DesgloseReparto.tsx` | ⏸️ AVAILABLE | Split breakdown (Recharts) |
| `HeatmapGasto.tsx` | ⏸️ AVAILABLE | Spending heatmap |
| `TopDiasGasto.tsx` | ⏸️ AVAILABLE | Top 5 spending days |
| `TarjetaSaldoAbierto.tsx` | ⏸️ AVAILABLE | Open balance card |
| `ModalExpensesDashboard.tsx` | ⏸️ AVAILABLE | Modal with purchase details |

---

## 12. TECHNICAL CONSTRAINTS

- **Must use**: Next.js 16 App Router, TypeScript strict mode, Tailwind CSS v4
- **Charts**: Prefer Recharts (already integrated), Chart.js available as alternative
- **Data source**: Must use `usarBalance()` hook as single source of truth
- **Auth**: Supabase SSR, RLS enabled on all tables
- **Users**: Only 2 users (Franco, Fabiola)
- **Currency**: Argentine Pesos (ARS) - formatted with `formatearPeso()`
- **Language**: Spanish
- **PWA**: Installable, offline support
- **Performance**: All data computed client-side, no server-side aggregation

---

## 13. WHAT TO PRESERVE

1. **Month selector** functionality
2. **Export to Excel** button
3. **User colors** (dynamic Franco/Fabiola)
4. **KPI cards** (at least the core 4)
5. **Responsive design** (mobile-first)
6. **Material Design 3** styling patterns
7. **Insights/alerts** system
8. **Settlement** integration (saldoAbierto)

---

## 14. PAIN POINTS TO ADDRESS

1. Too many charts competing for attention → **Need better hierarchy**
2. No clear "at a glance" summary → **Need a hero metric**
3. Charts not interactive enough → **Need drill-down/click-through**
4. Budget status hard to read → **Need clearer visual indicators**
5. No comparison context → **Need benchmarks (avg, target, goal)**
6. Static layout → **Need customizable widget arrangement**
7. Insights are text-only → **Need actionable insights with links**

---

## 15. FILES TO MODIFY

Primary target:
- `app/(privado)/dashboard/page.tsx` - Main page (complete rewrite)

Supporting files (may need updates):
- `hooks/usarBalance.ts` - If new computations needed
- `lib/calculos.ts` - If new aggregations needed
- `components/dashboard/*` - New/replaced chart components
- `types/index.ts` - If new data types needed

---

## 16. REQUEST

Please design a complete redesign of the DASHBOARD section that:

1. **Prioritizes clarity over complexity** - Less is more
2. **Introduces a hero metric** - One big number that tells the story
3. **Makes charts interactive** - Click to see details
4. **Adds new meaningful metrics** - See section 10 for ideas
5. **Creates a better visual hierarchy** - What matters most should be biggest
6. **Maintains all existing functionality** - Month selector, export, etc.
7. **Uses Recharts** as primary charting library
8. **Is mobile-first** responsive
9. **Preserves the design system** (colors, typography, spacing)
10. **Provides actionable insights** - Not just data, but what to do about it
