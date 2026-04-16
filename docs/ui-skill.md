# UI Skill - CasitaApp

Guia ejecutable para construir interfaces nuevas manteniendo el ADN de CasitaApp.
Base tomada de:
- `app/(privado)/anotador-rapido/page.tsx`
- `components/compras/FormularioCompra.tsx`
- `app/globals.css`
- `components/layout/*`

## 1) Objetivo

Usar este skill cuando disenes o implementes una pantalla nueva (o refactor grande) y quieras:
- Priorizar velocidad de carga de datos para el usuario.
- Mantener consistencia visual con la app actual.
- Evitar formularios pesados sin jerarquia.

No usar este skill para:
- Cambios de backend sin impacto de UI.
- Pantallas experimentales fuera del look and feel actual.

## 2) ADN visual de CasitaApp

### Tokens y paleta
- Superficies por capas: `bg-surface`, `bg-surface-container-lowest`, `bg-surface-container-low`, `bg-surface-container-high`.
- Accion primaria: `bg-secondary text-on-secondary`.
- Texto principal/secundario: `text-on-surface` y `text-on-surface-variant`.
- Bordes suaves: `border-outline-variant/10` a `/20`.
- El color de persona (Franco/Fabiola) viene de `usarConfiguracion().colores`.

### Tipografia
- Titulos y CTA: `font-headline`.
- Labels, metadata, caps: `font-label`.
- Valores numericos: siempre `tabular-nums`.

### Escala visual recomendada
- Hero value: `text-3xl` a `text-5xl`, `font-bold`, `tracking-tight`.
- Titulo de bloque: `text-xl` o `text-sm` + `font-semibold`.
- Label de sistema: `text-[9px]` a `text-[11px]`, uppercase, tracking ancho.

### Motion y feedback
- Animaciones cortas (200-300ms), orientadas a flujo:
  - Entrada de paso: slide horizontal.
  - Tap: `active:scale-[0.98]` o `[0.97]`.
- Feedback inmediato:
  - `toast.success/error/info/warning`.
  - Estado disabled visible (`disabled:opacity-30/50`).
  - Haptics en confirmacion (`vibrarExito`) cuando aplique.

## 3) Patrones obligatorios del Registro Rapido

## 3.1 Entrada multimodo con fallback
- Ofrecer 1 camino principal + caminos alternativos.
- Patron actual:
  - Principal: `Paso a paso`.
  - Alternativos: `Foto del ticket`, `Nota de voz`.
- Si una capacidad falla (ej. voz no soportada), redirigir a flujo manual sin bloquear.

## 3.2 Flujo por pasos cortos
- Una decision por pantalla/paso.
- Progreso visible (dots o barra).
- Navegacion redundante:
  - Swipe horizontal.
  - Boton `Atras/Siguiente`.
  - Salida clara (`Cancelar` o `X`).

## 3.3 Sugerencias inteligentes sin friccion
- Reusar historial para acelerar input:
  - Sugerencias de item por frecuencia + recencia.
  - Sugerencias de lugar segun item o ultimos lugares.
- Mostrar como chips tapables, no como modal invasivo.

## 3.4 Confirmacion compacta + continuidad
- Pantalla de resumen antes de persistir.
- CTA principal claro: `Guardar como borrador`.
- CTA secundario de continuidad: `+ Agregar otro`.
- Mantener contexto util entre altas repetidas (ej. pagador).

## 3.5 Estado offline y resiliencia
- Guardado con fallback offline cuando exista (`guardarConFallback`).
- Mensaje explicito si quedo pendiente de sync.
- Nunca perder la accion del usuario por conectividad.

## 4) Patrones del estilo global que hay que respetar

## 4.1 Jerarquia editorial
- Arrancar secciones con etiqueta pequena contextual.
- Mostrar un solo foco fuerte por vista (monto, accion principal o estado).
- Reducir ruido visual en acciones secundarias.

## 4.2 Progressive disclosure
- Avanzado colapsado por defecto:
  - Ejemplo: `Opciones avanzadas` y `Pegado masivo`.
- Mostrar mas controles solo cuando el usuario los pide.

## 4.3 Componentizacion visual
- Cards base:
  - `bg-surface-container-lowest rounded-[12px..16px] border border-outline-variant/15`
- Chips:
  - `rounded-full`, texto pequeno, contraste medio.
- Inputs:
  - Fondo suave, borde tenue, placeholder de bajo contraste.

## 4.4 Shell de pagina
- Mobile-first con anchos contenidos (`max-w-xl` para formularios de flujo).
- Respetar layout privado existente (`MarcoPrivado`, `Header`, `NavegacionInferior`).
- Mantener espaciado inferior seguro (`pb-safe` / padding para nav inferior).

## 5) Reglas Do / Don t

## Do
- Disenar para pulgar: objetivos tactiles grandes y cercanos.
- Usar un CTA principal por seccion.
- Confirmar decisiones criticas con resumen corto.
- Mantener copy simple y directo ("Que", "Donde", "Listo", "Guardar").
- Reusar historial para autocompletar y sugerir.

## Don t
- No mezclar demasiadas decisiones en una misma pantalla.
- No usar modales para pasos triviales que entran inline.
- No romper paleta base con colores fuera del sistema salvo excepcion funcional.
- No ocultar estado de guardado/error.
- No introducir desktop-first en flujos transaccionales rapidos.

## 6) Recetas reutilizables

## Receta A - Pantalla nueva de captura rapida
1. Header corto con contexto + titulo.
2. Selector de modo (principal + alternativos).
3. Flujo de 3 a 5 pasos con indicador de avance.
4. Paso final de confirmacion con CTA principal y secundario.
5. Toast + haptic + redireccion o continuar carga.

Skeleton de clases:

```tsx
<div className="min-h-screen bg-surface">
  <div className="max-w-md mx-auto px-4 pt-6 pb-8 space-y-4">
    <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">Contexto</p>
    <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Titulo</h1>
    <button className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline font-bold active:scale-[0.98] transition-transform">
      CTA principal
    </button>
  </div>
</div>
```

## Receta B - Formulario denso sin romper UX
- Arrancar con bloque de contexto (lugar, fecha, pagador).
- Lista de items en cards pequenas y repetibles.
- Mostrar total sticky abajo con accion principal fija.
- Encapsular funciones avanzadas bajo toggle.

## Receta C - Microcopy y estados
- CTA primaria:
  - `Guardar...` mientras persiste.
  - `Guardar como borrador` / `Confirmar compra`.
- Errores:
  - Cortos, accionables, sin texto tecnico.
- Placeholders:
  - Ejemplos concretos (`Ej: Yerba, Pan, Nafta...`).

## 7) Checklist QA UI/UX (pre-merge)

Marcar todo antes de cerrar PR:

- [ ] Hay un foco principal claro en la pantalla.
- [ ] El flujo principal se puede completar con una mano en mobile.
- [ ] Existe feedback de carga, exito y error.
- [ ] Los numeros importantes usan `tabular-nums`.
- [ ] Se usan tokens de color/superficie de `globals.css`.
- [ ] Las acciones secundarias no compiten con la primaria.
- [ ] Hay fallback para capacidades opcionales (ej. voz/camara).
- [ ] Funciona con y sin conexion cuando el flujo lo requiere.
- [ ] La pantalla no rompe `Header` ni `NavegacionInferior`.
- [ ] Desktop conserva el mismo orden de decisiones que mobile.

## 8) Definicion de listo para interfaces nuevas

Una interfaz se considera lista cuando:
- Resuelve la tarea principal en el menor numero de pasos razonable.
- Mantiene coherencia visual con CasitaApp.
- Tiene estados vacio/carga/error/exito.
- Pasa checklist QA sin excepciones pendientes.
