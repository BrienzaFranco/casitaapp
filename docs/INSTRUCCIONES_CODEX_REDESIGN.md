# Instrucciones para Codex: Rediseno UX/UI Estilo Ticket/Tabla

## Contexto del Proyecto

Esta es una PWA de gestion financiera para parejas (Franco y Fabiola). El flujo principal es registrar "compras" que contienen multiples "items". Cada item tiene categoria, subcategoria, monto, tipo de reparto y etiquetas opcionales.

## Objetivo del Rediseno

Transformar el formulario actual (que usa pasos separados y cards grandes) en una **interfaz estilo ticket/planilla** compacta, rapida de llenar, con:

- Vista de tabla dinamica agrupable
- Drag and drop para reordenar items
- Tags minimalistas (chips pequenos)
- Totales y distribucion visual al final
- Sin pasos ni wizard - todo en una sola pantalla fluida

---

## Arquitectura de Archivos

### Archivos a Modificar

```
components/compras/FormularioCompra.tsx  <- Reescribir completamente
components/items/FormularioItem.tsx      <- Eliminar o reducir drasticamente  
components/items/ListaItems.tsx          <- Reemplazar por TablaItems.tsx
```

### Archivos Nuevos a Crear

```
components/compras/TablaItems.tsx        <- Tabla principal con drag & drop
components/compras/FilaItem.tsx          <- Fila individual editable inline
components/compras/ResumenTotal.tsx      <- Footer fijo con totales
components/ui/ChipMini.tsx               <- Chip pequeno para tags
```

### Archivos Existentes a Reutilizar (NO modificar)

```
types/index.ts                           <- ItemEditable, CompraEditable, etc.
lib/calculos.ts                          <- evaluarExpresion, calcularReparto
lib/formatear.ts                         <- formatearPeso
components/ui/Badge.tsx                  <- Reutilizar para categorias
```

---

## Especificacion de UI Detallada

### 1. Layout General

```
+------------------------------------------+
|  HEADER: Fecha + Lugar (una sola linea)  |
+------------------------------------------+
|                                          |
|  TABLA DE ITEMS                          |
|  +--------------------------------------+|
|  | Cat | Desc | Monto | Reparto | Tags ||
|  +--------------------------------------+|
|  | [fila editable inline]               ||
|  | [fila editable inline]               ||
|  | [+ Agregar fila]                     ||
|  +--------------------------------------+|
|                                          |
|  AGRUPACION POR CATEGORIA (colapsable)   |
|                                          |
+------------------------------------------+
|  FOOTER FIJO: Total + Distribucion       |
+------------------------------------------+
```

### 2. Header Compacto

**HTML Structure:**
```tsx
<header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
  <div className="flex items-center gap-3">
    {/* Fecha - input compacto */}
    <input 
      type="date" 
      className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white"
    />
    
    {/* Lugar - input que crece */}
    <input 
      type="text"
      placeholder="Lugar..."
      className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white"
    />
    
    {/* Boton guardar pequeno */}
    <button className="h-9 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg">
      Guardar
    </button>
  </div>
</header>
```

**Reglas:**
- NO usar labels visibles, usar placeholders
- Todo en UNA sola linea horizontal
- Height de inputs: `h-9` (36px)
- Border radius: `rounded-lg` (8px)
- Sin sombras en el header

### 3. Tabla de Items

**Estructura de columnas:**

| Columna | Ancho | Contenido |
|---------|-------|-----------|
| Drag handle | 24px | Icono `GripVertical` de lucide |
| Categoria | 90px | Select compacto o texto |
| Subcategoria | 80px | Select compacto o texto |
| Descripcion | flex-1 | Input de texto |
| Monto | 100px | Input numerico alineado derecha |
| Reparto | 70px | Iconos o mini-select |
| Tags | 60px | Chips mini |
| Acciones | 32px | Boton eliminar |

**HTML Structure para fila:**
```tsx
<div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 hover:bg-gray-50 group">
  {/* Drag handle - visible on hover */}
  <div className="w-6 opacity-0 group-hover:opacity-100 cursor-grab">
    <GripVertical className="h-4 w-4 text-gray-400" />
  </div>
  
  {/* Categoria - select pequeno */}
  <select className="w-[90px] h-8 px-2 text-xs border-0 bg-transparent rounded">
    <option>Supermercado</option>
  </select>
  
  {/* Subcategoria */}
  <select className="w-[80px] h-8 px-2 text-xs border-0 bg-transparent rounded">
    <option>Alimentos</option>
  </select>
  
  {/* Descripcion */}
  <input 
    type="text"
    placeholder="Descripcion..."
    className="flex-1 h-8 px-2 text-sm border-0 bg-transparent"
  />
  
  {/* Monto - alineado derecha */}
  <input 
    type="text"
    placeholder="0"
    className="w-[100px] h-8 px-2 text-sm text-right font-mono border-0 bg-transparent"
  />
  
  {/* Reparto - iconos */}
  <div className="w-[70px] flex justify-center">
    <button className="h-7 px-2 text-xs bg-gray-100 rounded">50/50</button>
  </div>
  
  {/* Tags - chips mini */}
  <div className="w-[60px] flex gap-1">
    <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">IMP</span>
  </div>
  
  {/* Eliminar */}
  <button className="w-8 h-8 opacity-0 group-hover:opacity-100">
    <X className="h-4 w-4 text-gray-400" />
  </button>
</div>
```

**Reglas de la tabla:**
- Filas compactas: `py-2` (8px vertical)
- SIN bordes en inputs cuando estan dentro de la fila
- Inputs usan `bg-transparent` y `border-0`
- Al hacer focus en un input, mostrar borde sutil: `focus:ring-1 focus:ring-gray-200`
- Drag handle invisible hasta hover en la fila
- Boton eliminar invisible hasta hover

### 4. Fila Nueva (para agregar)

```tsx
<div className="flex items-center gap-2 px-3 py-2 border-b border-dashed border-gray-200">
  <div className="w-6" /> {/* Spacer para drag handle */}
  
  <button className="flex-1 h-8 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
    <Plus className="h-4 w-4" />
    Agregar item
  </button>
</div>
```

### 5. Agrupacion por Categoria

Cuando hay items, agruparlos visualmente:

```tsx
<div className="mt-4">
  {/* Header de grupo */}
  <button 
    onClick={toggleGrupo}
    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-lg"
  >
    <div className="flex items-center gap-2">
      <ChevronDown className="h-4 w-4" />
      <span className="text-sm font-medium">Supermercado</span>
      <span className="text-xs text-gray-500">3 items</span>
    </div>
    <span className="text-sm font-mono font-medium">$45.200</span>
  </button>
  
  {/* Items del grupo */}
  <div className="border border-gray-100 border-t-0 rounded-b-lg">
    {/* FilaItem components */}
  </div>
</div>
```

### 6. Chips de Tags Minimalistas

**Crear componente `ChipMini.tsx`:**

```tsx
interface Props {
  label: string;      // Solo mostrar 3 caracteres max
  color: string;      // Color hex del tag
  onRemove?: () => void;
}

export function ChipMini({ label, color, onRemove }: Props) {
  // Extraer primeras 3 letras en mayuscula
  const abreviado = label.slice(0, 3).toUpperCase();
  
  return (
    <span 
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded"
      style={{ 
        backgroundColor: `${color}20`, // Color con 20% opacidad
        color: color 
      }}
    >
      {abreviado}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
```

**Reglas para tags:**
- Mostrar MAXIMO 2 tags por fila en la tabla
- Si hay mas, mostrar "+N" 
- Font size: `text-[10px]` (10px)
- Padding: `px-1.5 py-0.5`
- NO mostrar el nombre completo, solo abreviatura

### 7. Footer Fijo con Totales

```tsx
<footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 pb-safe">
  <div className="max-w-lg mx-auto">
    {/* Barra de distribucion visual */}
    <div className="h-2 flex rounded-full overflow-hidden mb-3">
      <div 
        className="bg-indigo-500" 
        style={{ width: `${porcentajeFranco}%` }}
      />
      <div 
        className="bg-emerald-500" 
        style={{ width: `${porcentajeFabiola}%` }}
      />
    </div>
    
    {/* Numeros */}
    <div className="flex items-center justify-between">
      {/* Franco */}
      <div className="text-left">
        <p className="text-xs text-gray-500">Franco</p>
        <p className="text-lg font-mono font-semibold text-indigo-600">
          ${formatearPeso(pagoFranco)}
        </p>
      </div>
      
      {/* Total central */}
      <div className="text-center">
        <p className="text-xs text-gray-500">Total</p>
        <p className="text-2xl font-mono font-bold">
          ${formatearPeso(total)}
        </p>
      </div>
      
      {/* Fabiola */}
      <div className="text-right">
        <p className="text-xs text-gray-500">Fabiola</p>
        <p className="text-lg font-mono font-semibold text-emerald-600">
          ${formatearPeso(pagoFabiola)}
        </p>
      </div>
    </div>
  </div>
</footer>
```

**Reglas del footer:**
- Usar `pb-safe` para dispositivos con notch
- Barra de distribucion: altura `h-2` (8px)
- Total en el centro, mas grande: `text-2xl`
- Montos individuales a los lados: `text-lg`
- Colores: Franco = `indigo-600`, Fabiola = `emerald-600`

---

## Implementacion de Drag & Drop

### Usar @dnd-kit/core

**Instalacion:**
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Estructura basica:**

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function FilaItemSortable({ item, index }: { item: ItemEditable; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `item-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Handle de drag - solo este elemento escucha el drag */}
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4" />
      </div>
      
      {/* Resto de la fila */}
      {/* ... */}
    </div>
  );
}

function TablaItems({ items, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor)
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      // Calcular nuevos indices y llamar onReorder
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <FilaItemSortable key={index} item={item} index={index} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

## Reglas de Estilo Obligatorias

### Colores (usar exactamente estos)

```css
/* Backgrounds */
bg-white          /* Fondo principal */
bg-gray-50        /* Fondo de grupos/headers */
bg-gray-100       /* Hover en botones */

/* Borders */
border-gray-100   /* Bordes sutiles entre filas */
border-gray-200   /* Bordes de inputs */

/* Text */
text-gray-900     /* Texto principal */
text-gray-700     /* Texto secundario */
text-gray-500     /* Texto terciario/placeholders */
text-gray-400     /* Iconos inactivos */

/* Accent */
text-indigo-600   /* Franco */
bg-indigo-500     /* Barra Franco */
text-emerald-600  /* Fabiola */
bg-emerald-500    /* Barra Fabiola */
```

### Spacing

```css
/* Padding de filas */
px-3 py-2         /* Filas de tabla */
px-4 py-3         /* Header y footer */

/* Gaps */
gap-2             /* Entre elementos en una fila */
gap-1             /* Entre chips */
```

### Typography

```css
/* Sizes */
text-xs           /* 12px - labels, hints */
text-sm           /* 14px - contenido de tabla */
text-base         /* 16px - titulos de seccion */
text-lg           /* 18px - montos individuales */
text-2xl          /* 24px - total principal */

/* Weights */
font-normal       /* Texto comun */
font-medium       /* Labels, chips */
font-semibold     /* Montos, titulos */
font-bold         /* Total principal */

/* Monospace para numeros */
font-mono         /* SIEMPRE para montos */
```

### Border Radius

```css
rounded           /* 4px - chips mini */
rounded-lg        /* 8px - inputs, botones */
rounded-xl        /* 12px - cards si hay */
rounded-full      /* Barra de distribucion */
```

---

## Logica de Negocio a Mantener

### Expresiones Aritmeticas en Monto

El input de monto debe seguir aceptando expresiones como `4000-521+200`.

```tsx
// Usar la funcion existente
import { evaluarExpresion } from "@/lib/calculos";

// En el onChange del input monto:
function handleMontoChange(valor: string) {
  setExpresionMonto(valor);
  try {
    const resultado = evaluarExpresion(valor);
    setMontoResuelto(resultado);
    setErrorMonto("");
  } catch {
    setMontoResuelto(0);
    setErrorMonto("Expresion invalida");
  }
}
```

### Calculo de Reparto

```tsx
import { calcularReparto } from "@/lib/calculos";

// Cuando cambia el tipo de reparto o el monto:
const reparto = calcularReparto(tipoReparto, montoResuelto);
// reparto.pago_franco y reparto.pago_fabiola
```

### Tipos a Usar

```tsx
import type { 
  ItemEditable, 
  CompraEditable, 
  Categoria, 
  Subcategoria, 
  Etiqueta,
  TipoReparto 
} from "@/types";
```

---

## Comportamiento UX

### Edicion Inline

1. Al hacer click en cualquier campo de una fila, ese campo se vuelve editable
2. NO abrir modales ni formularios separados
3. Tab navega al siguiente campo de la misma fila
4. Enter en el ultimo campo de una fila agrega una nueva fila vacia

### Agregar Items

1. Click en "Agregar item" inserta una fila vacia al final
2. El focus va automaticamente al primer campo (categoria)
3. La fila se mantiene aunque este incompleta

### Eliminar Items

1. Boton X visible al hacer hover
2. Eliminar sin confirmacion (es facil deshacer agregando de nuevo)

### Feedback Visual

1. Mostrar resultado de expresion debajo del input monto en gris claro
2. Si hay error en expresion, borde rojo en el input
3. Total se actualiza en tiempo real mientras se escribe

---

## Responsive

### Mobile (< 640px)

- Ocultar columna Subcategoria
- Reducir ancho de Categoria a 70px
- Tags debajo de la descripcion (nueva linea)
- Footer: apilar verticalmente (Total arriba, Franco/Fabiola abajo lado a lado)

### Tablet+ (>= 640px)

- Mostrar todas las columnas
- Footer horizontal como se describio

---

## Checklist de Implementacion

- [ ] Crear `components/ui/ChipMini.tsx`
- [ ] Crear `components/compras/FilaItem.tsx` con edicion inline
- [ ] Crear `components/compras/TablaItems.tsx` con DnD
- [ ] Crear `components/compras/ResumenTotal.tsx` (footer fijo)
- [ ] Reescribir `FormularioCompra.tsx` integrando todo
- [ ] Eliminar `FormularioItem.tsx` (ya no se usa)
- [ ] Actualizar `ListaItems.tsx` o eliminarlo
- [ ] Agregar estilos para `pb-safe` en globals.css si no existe
- [ ] Testear en mobile y desktop
- [ ] Verificar que expresiones aritmeticas funcionan
- [ ] Verificar que drag & drop funciona en touch

---

## Notas Adicionales

- NO cambiar los tipos en `types/index.ts`
- NO cambiar las funciones en `lib/calculos.ts` o `lib/formatear.ts`
- Mantener compatibilidad con el resto de la app (historial, dashboard, etc.)
- El formulario debe seguir llamando a `onGuardar(compra: CompraEditable)`
- Respetar el patron de estado con `useState` que ya usa la app

---

# PARTE 2: MEJORAS GENERALES DE LA APP

## Crear Pagina de Inicio con Dashboard

Actualmente no existe `app/(privado)/page.tsx`. Crear esta pagina como **landing principal** al entrar a la app.

### Archivo a crear: `app/(privado)/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { Plus, ChevronRight, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { TarjetaResumen } from "@/components/balance/TarjetaResumen";
import { BarraProgreso } from "@/components/ui/BarraProgreso";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { usarBalance } from "@/hooks/usarBalance";
import { usarCompras } from "@/hooks/usarCompras";

export default function PaginaInicio() {
  const balance = usarBalance();
  const compras = usarCompras();
  
  // Obtener ultima compra
  const ultimaCompra = compras.compras[0];
  
  if (balance.compras.cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-32 w-full rounded-[28px]" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {/* Header con saludo y fecha */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Hola de nuevo</p>
          <h1 className="text-2xl font-bold text-gray-950">Resumen del mes</h1>
        </div>
        <Link
          href="/nueva-compra"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>

      {/* Ultima actividad */}
      {ultimaCompra ? (
        <div className="rounded-2xl bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Ultimo registro: {formatearFecha(ultimaCompra.fecha)}</span>
            {ultimaCompra.lugar ? <span>en {ultimaCompra.lugar}</span> : null}
          </div>
        </div>
      ) : null}

      {/* Resumen del mes actual */}
      <div className="grid grid-cols-2 gap-3">
        <TarjetaResumen
          titulo="Total mes"
          valor={formatearPeso(balance.resumenMes.total)}
          icono={<TrendingUp className="h-5 w-5 text-indigo-600" />}
        />
        <TarjetaResumen
          titulo="Balance"
          valor={formatearPeso(Math.abs(balance.resumenMes.balance))}
          detalle={balance.resumenMes.deudor ? `Debe ${balance.resumenMes.deudor}` : "Sin deuda"}
          icono={<TrendingDown className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      {/* Distribucion visual */}
      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-900">Quien pago este mes</p>
        <div className="mb-2 h-3 flex rounded-full overflow-hidden">
          <div 
            className="bg-indigo-500" 
            style={{ width: `${(balance.resumenMes.franco_pago / (balance.resumenMes.total || 1)) * 100}%` }}
          />
          <div 
            className="bg-emerald-500" 
            style={{ width: `${(balance.resumenMes.fabiola_pago / (balance.resumenMes.total || 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-indigo-600 font-medium">{balance.nombres.franco}: {formatearPeso(balance.resumenMes.franco_pago)}</span>
          <span className="text-emerald-600 font-medium">{balance.nombres.fabiola}: {formatearPeso(balance.resumenMes.fabiola_pago)}</span>
        </div>
      </section>

      {/* Accesos rapidos */}
      <div className="space-y-2">
        <Link 
          href="/historial" 
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <span className="text-sm font-semibold text-gray-900">Ver historial completo</span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
        <Link 
          href="/balance" 
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <span className="text-sm font-semibold text-gray-900">Analisis detallado</span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>
    </section>
  );
}
```

### Actualizar NavegacionInferior

Modificar `components/layout/NavegacionInferior.tsx` para agregar link a Inicio:

```tsx
const enlaces = [
  { href: "/", etiqueta: "Inicio", icono: Home },           // AGREGAR
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/nueva-compra", etiqueta: "Nueva", icono: Plus, destacada: true },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
];
```

**Notas:**
- Quitar "Configuracion" del nav inferior (moverlo al header como icono)
- Importar `Home` de lucide-react
- Mantener 4 items maximo en el nav

---

## Mejorar Pagina de Historial con Filtros Rapidos

Modificar `app/(privado)/historial/page.tsx` para agregar filtros mas accesibles.

### Filtros de Persona (Chips Toggle)

Agregar arriba de los filtros existentes:

```tsx
{/* Filtros rapidos de persona */}
<div className="flex gap-2">
  <button
    onClick={() => setFiltroPersona(null)}
    className={combinarClases(
      "h-9 px-4 rounded-full text-sm font-medium transition",
      filtroPersona === null 
        ? "bg-gray-900 text-white" 
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    )}
  >
    Todos
  </button>
  <button
    onClick={() => setFiltroPersona("franco")}
    className={combinarClases(
      "h-9 px-4 rounded-full text-sm font-medium transition",
      filtroPersona === "franco" 
        ? "bg-indigo-600 text-white" 
        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
    )}
  >
    Solo Franco
  </button>
  <button
    onClick={() => setFiltroPersona("fabiola")}
    className={combinarClases(
      "h-9 px-4 rounded-full text-sm font-medium transition",
      filtroPersona === "fabiola" 
        ? "bg-emerald-600 text-white" 
        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
    )}
  >
    Solo Fabiola
  </button>
</div>
```

### Selector de Mes como Pills

Reemplazar el input date por pills de meses recientes:

```tsx
{/* Meses recientes como pills */}
<div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
  {ultimosMeses.map((mesItem) => (
    <button
      key={mesItem.valor}
      onClick={() => setMes(mesItem.valor)}
      className={combinarClases(
        "flex-shrink-0 h-9 px-4 rounded-full text-sm font-medium transition whitespace-nowrap",
        mes === mesItem.valor 
          ? "bg-gray-900 text-white" 
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
    >
      {mesItem.etiqueta}
    </button>
  ))}
</div>
```

**Funcion helper para generar meses:**

```tsx
function generarUltimosMeses(cantidad: number) {
  const meses = [];
  const hoy = new Date();
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      valor: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`,
      etiqueta: fecha.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
    });
  }
  return meses;
}

const ultimosMeses = generarUltimosMeses(6);
```

### Actualizar funcion de filtrado

En `lib/calculos.ts`, agregar filtro por persona:

```tsx
export function filtrarComprasHistorial(
  compras: Compra[],
  filtros: {
    mes?: string;
    categoria_id?: string;
    etiqueta_id?: string;
    persona?: "franco" | "fabiola" | null;  // AGREGAR
  }
): Compra[] {
  return compras.filter((compra) => {
    // ... filtros existentes ...
    
    // Filtro por persona
    if (filtros.persona) {
      const tieneItemsPersona = compra.items.some((item) => {
        if (filtros.persona === "franco") {
          return item.pago_franco > 0;
        }
        if (filtros.persona === "fabiola") {
          return item.pago_fabiola > 0;
        }
        return true;
      });
      if (!tieneItemsPersona) return false;
    }
    
    return true;
  });
}
```

---

## Resumen Visual Compacto en Cards de Historial

Modificar `components/compras/CardCompra.tsx` para mostrar distribucion visual.

### Agregar mini barra de distribucion

```tsx
{/* Despues del total, agregar: */}
<div className="mt-2 h-1.5 flex rounded-full overflow-hidden">
  <div 
    className="bg-indigo-400" 
    style={{ width: `${(compra.total_franco / (compra.total || 1)) * 100}%` }}
  />
  <div 
    className="bg-emerald-400" 
    style={{ width: `${(compra.total_fabiola / (compra.total || 1)) * 100}%` }}
  />
</div>
```

---

## Estilos de Filtros - Reglas Obligatorias

### Chips/Pills Toggle

```css
/* Inactivo */
bg-gray-100 text-gray-600 hover:bg-gray-200

/* Activo */
bg-gray-900 text-white

/* Activo con color (persona) */
bg-indigo-600 text-white     /* Franco */
bg-emerald-600 text-white    /* Fabiola */
```

### Contenedor de filtros scroll horizontal

```tsx
<div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
```

Agregar en `globals.css`:

```css
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

---

## Estructura Final de Navegacion

```
NavegacionInferior (4 items):
  - Inicio (/)           -> Dashboard con resumen del mes
  - Historial (/historial) -> Lista con filtros rapidos  
  - Nueva (+)            -> Formulario ticket
  - Balance              -> Analisis detallado

Header:
  - Icono configuracion (engranaje) a la derecha
```

---

## Checklist Parte 2

- [ ] Crear `app/(privado)/page.tsx` con dashboard
- [ ] Actualizar `NavegacionInferior.tsx` (agregar Home, quitar Config)
- [ ] Mover icono Config al `Header.tsx`
- [ ] Agregar filtros de persona en `historial/page.tsx`
- [ ] Cambiar selector de mes a pills horizontales
- [ ] Agregar filtro por persona en `lib/calculos.ts`
- [ ] Agregar mini barra de distribucion en `CardCompra.tsx`
- [ ] Agregar estilos `scrollbar-hide` en `globals.css`
- [ ] Testear navegacion y filtros en mobile
