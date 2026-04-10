# Concepto de Rediseño UX/UI - Casita App

## Resumen Ejecutivo

Este documento presenta un rediseño completo de la experiencia de usuario para **Casita**, una PWA de gestión financiera y gastos compartidos para parejas. El objetivo principal es crear una interfaz **mobile-first** con un flujo guiado paso a paso que priorice la facilidad de uso y minimice la sobrecarga cognitiva.

---

## 1. Principios de Diseño

### 1.1 Filosofía Core

| Principio | Descripción |
|-----------|-------------|
| **Progressive Disclosure** | Mostrar información solo cuando es relevante |
| **Mobile-First** | Diseñar para pantallas táctiles pequeñas primero |
| **Guided Flow** | Guiar al usuario paso a paso en el proceso |
| **Minimal Friction** | Reducir toques y decisiones al mínimo |
| **Real-time Feedback** | Mostrar resultados instantáneamente |

### 1.2 Paleta de Colores

```css
/* Colores Primarios */
--emerald-500: #10b981;  /* Acción principal, éxito */
--emerald-50:  #ecfdf5;  /* Backgrounds suaves */
--teal-500:    #14b8a6;  /* Acentos secundarios */

/* Neutrales */
--gray-900: #111827;  /* Texto principal */
--gray-700: #374151;  /* Texto secundario */
--gray-500: #6b7280;  /* Texto terciario */
--gray-100: #f3f4f6;  /* Backgrounds */
--gray-50:  #f9fafb;  /* Background base */

/* Semánticos */
--danger:  #ef4444;  /* Errores, eliminar */
--warning: #f59e0b;  /* Alertas */
--info:    #0ea5e9;  /* Información */
```

### 1.3 Tipografía

- **Sans-serif principal**: Inter (Google Fonts)
- **Monospace para montos**: JetBrains Mono / SF Mono
- **Jerarquía de tamaños**:
  - Heading principal: 24px / bold
  - Heading secundario: 18px / semibold
  - Body: 16px / regular
  - Caption: 14px / medium
  - Small: 12px / medium

---

## 2. Flujo de Entrada de Datos

### 2.1 Orden de los Pasos

El nuevo flujo guía al usuario en un orden lógico y natural:

```
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: FECHA Y LUGAR                                      │
│  ├─ Selección rápida: Hoy / Ayer / Otra fecha              │
│  ├─ Input de lugar con sugerencias                          │
│  └─ ¿Quién registra? (Franco / Fabiola)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 2: CATEGORÍA Y SUBCATEGORÍA                           │
│  ├─ Grid de categorías con íconos                          │
│  └─ Chips de subcategorías (aparecen dinámicamente)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 3: DESCRIPCIÓN                                        │
│  ├─ Textarea libre                                          │
│  └─ Etiquetas (minimalistas, al final)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 4: MONTO                                              │
│  ├─ Input con soporte para expresiones (4000-521)          │
│  └─ Preview en tiempo real del resultado                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 5: REPARTO (Final)                                    │
│  ├─ Opciones: 50/50 / Solo Franco / Solo Fabiola / Custom  │
│  ├─ Inputs personalizados (si aplica)                      │
│  └─ ✨ RESUMEN VISUAL DEL REPARTO ✨                        │
│      ├─ Barra de distribución animada                      │
│      ├─ Cuánto paga cada uno                               │
│      └─ Total de la compra                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Justificación del Orden

| Paso | Campo | Razón |
|------|-------|-------|
| 1 | Fecha/Lugar | Contexto temporal y espacial primero |
| 2 | Categoría | Organización antes de detalles |
| 3 | Descripción | Qué se compró específicamente |
| 4 | Monto | Cuánto costó (con cálculos) |
| 5 | Reparto | División al final con resumen visual |

---

## 3. Componentes Clave

### 3.1 Indicador de Progreso

```
○ ○ ● ○ ○    →    ○ ○ ○ ● ○    →    ○ ○ ○ ○ ●
                     
Paso activo: Barra más ancha + color primario
Pasos completados: Barra corta + color suave
Pasos pendientes: Barra corta + gris
```

### 3.2 Botones de Selección Rápida

Para fechas, lugares frecuentes y tipo de reparto:

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│   Hoy   │ │  Ayer   │ │  Otra   │
│    ●    │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘
```

### 3.3 Grid de Categorías

```
┌───────────────┐ ┌───────────────┐
│    🍽️         │ │    🧴         │
│  Alimentos    │ │   Higiene     │
└───────────────┘ └───────────────┘
┌───────────────┐ ┌───────────────┐
│    🏠         │ │    🚗         │
│  Vivienda     │ │  Transporte   │
└───────────────┘ └───────────────┘
```

### 3.4 Input de Monto con Calculadora

```
┌────────────────────────────────────┐
│ $  4000-521+200           [calc]  │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ Resultado:              $3.679    │
│             (fondo verde suave)    │
└────────────────────────────────────┘
```

### 3.5 Visualización del Reparto (Paso Final)

```
┌────────────────────────────────────────────┐
│  RESUMEN DEL REPARTO                       │
│                                            │
│  [█████████████░░░░░░░░░░░] ← Barra visual │
│                                            │
│  ┌──────────┐    ┌──────────┐              │
│  │  Franco  │    │ Fabiola  │              │
│  │ $1.840   │    │ $1.839   │              │
│  └──────────┘    └──────────┘              │
│                                            │
│  ─────────────────────────────             │
│  Total                     $3.679          │
└────────────────────────────────────────────┘
```

---

## 4. Etiquetas (Tags) - Visibilidad Mínima

### 4.1 Filosofía

Las etiquetas son **opcionales y secundarias**. El diseño las minimiza:

- Aparecen solo en el **Paso 3** (Descripción)
- Se muestran como **chips pequeños** al final de la sección
- Colores **sutiles** cuando no están activas
- Solo se destacan con color cuando están **seleccionadas**

### 4.2 Implementación Visual

```
Etiquetas (opcional)
┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐
│IMPREVISTO│ │VACACIONES│ │ REGALO │ │URGENCIA │
│ (gris)  │ │  (gris)  │ │(activo)│ │ (gris)  │
└─────────┘ └──────────┘ └────────┘ └─────────┘
```

---

## 5. Drag & Drop

### 5.1 Lista de Items Agregados

Después de agregar múltiples items, el usuario puede:

- **Reordenar** arrastrando con el handle
- **Eliminar** con swipe o botón
- **Ver total** acumulado en tiempo real

```
┌─────────────────────────────────────────────┐
│ Items agregados                    $14.524  │
├─────────────────────────────────────────────┤
│ ≡  🍽️  Pollo entero                $6.180  ✕│
│ ≡  🧴  Shampoo anticaspa           $6.137  ✕│
│ ≡  🍽️  Coca cola 2.5L              $2.207  ✕│
└─────────────────────────────────────────────┘
```

### 5.2 Tecnología

Usar **Framer Motion** con `Reorder.Group` para animaciones fluidas:

```tsx
<Reorder.Group axis="y" values={items} onReorder={setItems}>
  {items.map((item) => (
    <Reorder.Item key={item.id} value={item}>
      {/* Contenido del item */}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

---

## 6. Responsividad Mobile

### 6.1 Breakpoints

| Dispositivo | Ancho | Comportamiento |
|-------------|-------|----------------|
| Mobile S | 320px | Layout comprimido |
| Mobile M | 375px | Layout estándar |
| Mobile L | 428px | Layout espaciado |
| Tablet | 768px | 2 columnas donde aplique |

### 6.2 Touch Targets

- Mínimo **44x44px** para todos los elementos interactivos
- Espaciado mínimo de **8px** entre elementos tocables
- Botones principales con **altura de 48-56px**

### 6.3 Safe Areas

```css
padding-bottom: max(16px, env(safe-area-inset-bottom));
```

---

## 7. Microinteracciones

### 7.1 Transiciones entre Pasos

```tsx
<AnimatePresence mode="wait">
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
  >
    {/* Contenido del paso */}
  </motion.div>
</AnimatePresence>
```

### 7.2 Feedback de Validación

- **Éxito**: Fondo verde suave + checkmark
- **Error**: Sacudida (shake animation) + borde rojo
- **Loading**: Skeleton o spinner subtle

### 7.3 Cálculo de Monto en Tiempo Real

El preview del monto se actualiza instantáneamente mientras el usuario escribe, con una animación de fade suave.

---

## 8. Navegación

### 8.1 Barra Inferior

```
┌───────────────────────────────────────────────┐
│                                               │
│  📋          ➕          📊          ⚙️        │
│ Historial   Nueva     Balance    Config       │
│            Compra                             │
│             (destacado)                       │
└───────────────────────────────────────────────┘
```

### 8.2 Header Contextual

El header muestra información relevante según la pantalla:

```
┌───────────────────────────────────────────────┐
│ ← Nueva compra                    3 items     │
│   Coto Palermo · 10 abr 2024                 │
│   ○ ○ ● ○ ○                                  │
└───────────────────────────────────────────────┘
```

---

## 9. Estados y Edge Cases

### 9.1 Estado Vacío

```
┌───────────────────────────────────────────────┐
│                                               │
│              📦                               │
│                                               │
│     Todavía no agregaste items               │
│     a esta compra.                           │
│                                               │
│     [+ Agregar primer item]                  │
│                                               │
└───────────────────────────────────────────────┘
```

### 9.2 Error de Conexión (Offline)

```
┌───────────────────────────────────────────────┐
│ ⚠️ Sin conexión                               │
│ Los cambios se guardarán cuando vuelvas      │
│ a estar online.                              │
└───────────────────────────────────────────────┘
```

### 9.3 Expresión de Monto Inválida

```
┌────────────────────────────────────┐
│ $  4000-521++200          [calc]  │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ ⚠️ Expresión inválida             │
│   (fondo rojo suave)              │
└────────────────────────────────────┘
```

---

## 10. Accesibilidad

### 10.1 Requisitos

- [ ] Contraste mínimo 4.5:1 para texto
- [ ] Labels descriptivos en todos los inputs
- [ ] Navegación por teclado funcional
- [ ] Roles ARIA apropiados
- [ ] Reducir movimiento si `prefers-reduced-motion`

### 10.2 Screen Reader

```tsx
<button aria-label="Seleccionar categoría Alimentos">
  <span aria-hidden="true">🍽️</span>
  Alimentos
</button>
```

---

## 11. Comparación: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Formulario | Todo visible a la vez | Pasos progresivos |
| Categorías | Dropdown plano | Grid visual con íconos |
| Monto | Input simple | Input con calculadora |
| Reparto | Siempre visible | Solo al final |
| Etiquetas | Prominentes | Minimizadas |
| Items | Cards grandes | Lista compacta con D&D |
| Feedback | Estático | Animaciones suaves |

---

## 12. Próximos Pasos

1. **Prototipo interactivo** ✅ Creado en `/app/(privado)/nueva-compra-v2`
2. **Testing con usuarios** reales (Franco y Fabiola)
3. **Iteración** basada en feedback
4. **Migración** gradual desde el formulario actual
5. **Métricas** de tiempo de entrada y errores

---

## 13. Archivos Relacionados

- **Prototipo funcional**: `/app/(privado)/nueva-compra-v2/page.tsx`
- **Componentes actuales**: `/components/compras/FormularioCompra.tsx`
- **Esquema de BD**: `/supabase/esquema.sql`
- **Tipos**: `/types/index.ts`

---

*Documento creado para el proyecto Casita - PWA de gestión financiera para parejas.*
