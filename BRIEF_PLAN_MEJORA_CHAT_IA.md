# Brief Tecnico Detallado - Plan de Mejora Chat IA

## 1) Objetivo de este documento
Este documento esta hecho para que un asistente (Claude) pueda proponer un plan de mejora del Chat IA con alta calidad, bajo riesgo y foco en impacto real.

El objetivo del modulo Chat IA no es "conversar"; es capturar gastos rapido, con friccion minima, y guardarlos como borrador util (o completo) dentro del flujo real de la app.

## 2) Resumen del producto
- Producto: web app de gastos domesticos para 2 personas.
- Stack: Next.js App Router + TypeScript + Tailwind + Supabase + Vercel.
- Dominio: compras, items, reparto, categorias/subcategorias, etiquetas, balance.
- Prioridad UX: mobile-first, una mano, pasos claros, feedback inmediato.
- El Chat IA convive con otros modos de entrada:
  - Paso a paso (manual)
  - Foto (sin OCR productivo todavia)
  - Voz

## 3) Reglas de contexto (no negociables)
- `VeciDatos - copia/` es referencia tecnica, NO entorno activo.
- No reutilizar cuentas/remotos/credenciales de proyectos viejos.
- No copiar secrets de `.env.local` entre proyectos.
- No cambiar nada en `VeciDatos - copia/` salvo pedido explicito.
- Mantener compatibilidad con stack actual y despliegue actual.

## 4) Arquitectura relevante para Chat IA

### Frontend
- Entrada al modulo: `app/(privado)/anotador-rapido/page.tsx`
- Panel de chat: `components/anotador/PanelRegistroIa.tsx`
- Orquestacion del estado conversacional: `hooks/useRegistroIa.ts`
- Voz: `hooks/useVoiceRecognition.ts`

### Logica de parsing y contratos
- Parser deterministico y conversion a borrador/compra:
  - `lib/ai/registroDeterministico.ts`
- Contratos tipados del modulo IA:
  - `lib/ai/contracts.ts`
- Parseo flexible de montos:
  - `lib/ai/montos.ts`

### Backend IA
- Endpoint server-side:
  - `app/api/ia/gastos/route.ts`
- Provider actual: OpenRouter (`/chat/completions`)
- Modelo configurable por tabla `configuracion` (clave `ia_modelo_openrouter`)

### Persistencia
- Hook de datos/compras: `hooks/usarCompras.ts`
- Guardado via RPC Supabase:
  - `guardar_compra_borrador`
  - `crear_compra_completa`
  - `actualizar_compra_completa`
- Offline fallback para guardado:
  - `hooks/usarOffline.ts`
  - `lib/offline.ts`

## 5) Flujo funcional actual del Chat IA

### 5.1 Modos
- `rapido`:
  - Permite guardar aunque falten montos en items si hay total.
  - Puede crear item de ajuste por diferencia (Ajuste IA).
- `completo`:
  - Exige faltantes minimos (lugar, pagador, total, items, montos por item) para `canSave=true`.

### 5.2 Pipeline de interpretacion
1. Usuario envia texto (o voz transcripta).
2. Hook llama `/api/ia/gastos` con:
   - `message`
   - `draft` actual
   - catalogo de categorias/subcategorias
3. Backend pide respuesta JSON al modelo.
4. Backend sanitiza:
   - intent
   - patch de borrador
   - operaciones de correccion
   - resolucion de ambiguedad
   - referencias de categoria/subcategoria
5. Frontend fusiona borrador deterministico + patch IA.
6. Aplica correcciones (`operations`) si hay.
7. Si hay ambiguedad, pide seleccion de opcion al usuario.
8. Calcula `faltantes`, `preguntaSiguiente`, `canSave`.
9. Guarda como borrador en Supabase (con fallback offline).

### 5.3 Intents soportados
- `crear_o_actualizar`
- `corregir`
- `pregunta`

### 5.4 Correcciones estructuradas
- Operacion soportada: `replace_field`
- Scope: `draft` o `item`
- Campos: `lugar`, `pagador`, `total`, `descripcion`, `monto`, `cantidad`, `categoria_id`, `subcategoria_id`.

### 5.5 Ambiguedad
- Puede devolverse `resolution` con opciones.
- UI muestra botones para elegir item/opcion.

## 6) Estado de datos y modelo de dominio

### Entidades centrales
- `compras` (con `pagador_general`, `estado: borrador|confirmada`)
- `items`
- `categorias`, `subcategorias`
- `etiquetas` + relaciones item/compra
- `configuracion` (clave-valor JSONB)

### Restricciones utiles para plan
- `pagador_general` limitado a `franco|fabiola|compartido`.
- `estado` limitado a `borrador|confirmada`.
- RLS habilitado, politica actual: autenticados pueden leer/escribir.
- Catalogo de categorias/subcategorias ya existe y debe respetarse.

## 7) Configuracion y entornos
- Variables en `.env.example`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL`
  - `NEXT_PUBLIC_SITE_URL`
- El modelo efectivo del chat se resuelve por prioridad:
  1. `configuracion.ia_modelo_openrouter`
  2. `OPENROUTER_MODEL`
  3. default hardcodeado

## 8) Fortalezas actuales (base para iterar)
- Pipeline hibrido (deterministico + LLM) ya implementado.
- Contratos tipados para intents/correcciones/resolucion.
- Sanitizacion server-side antes de impactar UI.
- UX conversacional integrada al flujo de guardado real.
- Fallback offline al guardar.
- Selector de modelo IA desde Configuracion.

## 9) Limitaciones y oportunidades reales de mejora
Estas son observaciones del estado actual para que el plan sea concreto.

1. No hay telemetria especifica de Chat IA.
- Hoy no hay metricas de precision/latencia/costo ni embudo del flujo IA.

2. Contexto limitado por request.
- Se envia mensaje actual + draft actual; no se envia historial estructurado completo de la conversacion.

3. Dependencia de prompt largo por request.
- Se inyecta catalogo de categorias/subcategorias en cada llamada.

4. Sin estrategia explicita de resiliencia de red para IA.
- No hay timeout/retry controlado en llamada OpenRouter desde endpoint.

5. Ambiguedad funcionalmente util, pero mejorable.
- Existe resolucion de ambiguedad, pero puede optimizarse UX y semantica de seguimiento.

6. Falta control de calidad orientado a costo.
- No hay presupuesto/guardrails operativos por sesion o por registro.

7. Falta de experimentacion formal.
- No hay feature flags/AB para comparar mejoras en parsing/prompt/modelos.

## 10) Objetivos de mejora (orden de prioridad)
1. Mejorar precision del borrador inicial (menos correcciones manuales).
2. Reducir tiempo hasta guardado exitoso.
3. Reducir vueltas conversacionales para completar faltantes.
4. Aumentar robustez en mensajes ambiguos o incompletos.
5. Controlar latencia y costo por registro.
6. Mantener/elevar confiabilidad del guardado final.

## 11) Restricciones de implementacion
- No romper flujos existentes (manual, rapido, completo, offline, borradores).
- No agregar complejidad innecesaria que vuelva frgil el modulo.
- Mantener estilo UX actual (simple, directo, mobile-first, fallback claro).
- Evitar propuestas de reescritura total.
- Cambios deben ser incrementales y reversibles.

## 12) KPI sugeridos para que el plan mida impacto
Definir baseline y luego medir por version/flag.

### Embudo principal
- `% sesiones Chat IA que terminan en guardado de borrador`
- `% sesiones Chat IA que abandonan sin guardar`

### Eficiencia
- `tiempo mediano desde primer mensaje hasta guardar`
- `cantidad media de mensajes por registro guardado`
- `cantidad media de correcciones por registro`

### Calidad de parseo
- `% registros guardados sin correccion manual`
- `% registros con ambiguedad`
- `% ambiguedades resueltas exitosamente`

### Operacion IA
- `latencia p50/p95 del endpoint /api/ia/gastos`
- `costo IA estimado por registro`
- `% fallback a flujo deterministico por error IA`

## 13) Riesgos a contemplar en el plan
- Sobre-automatizar y degradar confianza del usuario.
- Subir costo IA sin mejorar conversion real.
- Aumentar complejidad del estado conversacional.
- Crear deuda tecnica por prompts no versionados.
- Cambios de modelo sin evaluacion comparativa.

## 14) Lo que se espera como salida (plan de Claude)
Pedir un plan por fases con foco pragmatico:

### Fase 1 (quick wins)
- Alto impacto / bajo riesgo / baja complejidad.
- Cambios chicos de prompt, validaciones, UX de faltantes, observabilidad minima.

### Fase 2 (mediano plazo)
- Mejoras de arquitectura del modulo IA sin romper API publica.
- Experimentacion controlada (flags, comparativas de modelo/prompt).

### Fase 3 (opcional)
- Optimizaciones avanzadas si fases 1 y 2 validan retorno.

Para cada iniciativa, exigir:
- Problema que resuelve
- Cambios tecnicos concretos (frontend/backend/datos/prompt)
- Riesgo y esfuerzo (S/M/L)
- KPI afectado
- Criterio de exito
- Plan de rollback

## 15) Backlog esperado
Solicitar que cierre con:
- Top 10 tareas priorizadas
- Dependencias entre tareas
- Orden recomendado de ejecucion
- Entregables por PR/lote
- Estrategia de validacion en produccion

## 16) Notas de estilo para propuestas
- Propuestas accionables, no abstractas.
- Evitar "big bang".
- Priorizar cambios medibles en 1-2 semanas.
- Alinear todo al objetivo real: registrar gasto rapido y bien.

---

## Prompt sugerido para usar este brief
"Con base en este brief, proponeme un plan de mejora del Chat IA en fases (quick wins, mediano plazo, opcional largo plazo), con iniciativas concretas, estimacion S/M/L, riesgos, KPI impactados, plan de validacion y backlog Top 10 listo para ejecutar sin reescribir la app." 
