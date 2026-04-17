import { NextResponse } from "next/server";
import type { PagadorCompra, TipoReparto } from "@/types";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";
import { parseMontoFlexible } from "@/lib/ai/montos";
import type {
  RegistroIaCorrectionField,
  RegistroIaCorrectionOp,
  RegistroIaIntent,
  RegistroIaResolution,
} from "@/lib/ai/contracts";

const MODELO_DEFAULT = "minimax/minimax-m2.7";
const CACHE_TTL_MS = 1000 * 60 * 5;
const TIMEOUT_FETCH_MS = 8000;

interface CuerpoEntrada {
  message?: string;
  mode?: "rapido" | "completo";
  sessionId?: string;
  history?: Array<{ role?: string; content?: string }>;
  draft?: unknown;
  context?: {
    categorias?: Array<{ id: string; nombre: string }>;
    subcategorias?: Array<{ id: string; categoria_id: string; nombre: string }>;
  };
}

interface ItemIaRaw {
  id?: string;
  descripcion?: string;
  cantidad?: number | string | null;
  monto?: number | string | null;
  expresionMonto?: string | null;
  categoria_id?: string;
  subcategoria_id?: string;
  categoria_nombre?: string;
  subcategoria_nombre?: string;
}

interface DraftPatchRaw {
  lugar?: string;
  reparto?: TipoReparto | null | string;
  total?: number | string | null;
  pagador?: PagadorCompra | null;
  items?: ItemIaRaw[];
  warnings?: string[];
}

interface OperationRaw {
  type?: string;
  targetType?: string;
  field?: string;
  targetItemId?: string;
  targetMatcher?: string;
  from?: string;
  to?: unknown;
  item?: ItemIaRaw;
}

interface ResolutionOptionRaw {
  id?: string;
  label?: string;
  targetItemId?: string;
}

interface ResolutionRaw {
  reason?: string;
  field?: string;
  options?: ResolutionOptionRaw[];
}

interface RespuestaIaRaw {
  intent?: string;
  answer?: string;
  draftPatch?: DraftPatchRaw;
  operations?: OperationRaw[];
  resolution?: ResolutionRaw;
  warnings?: string[];
  lugar?: string;
  reparto?: TipoReparto | null | string;
  total?: number | string | null;
  pagador?: PagadorCompra | null;
  items?: ItemIaRaw[];
}

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  total_cost?: number;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: OpenRouterUsage;
}

interface FlagsIa {
  promptV2: boolean;
  networkGuard: boolean;
  history: boolean;
  catalogCompact: boolean;
  questionPlanner: boolean;
}

interface ConfigIa {
  modelo: string;
  flags: FlagsIa;
  promptVersion: string;
}

interface CatalogoContexto {
  categorias: Array<{ id: string; nombre: string }>;
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>;
}

interface RegistroContextoCache {
  contexto: CatalogoContexto;
  ts: number;
}

interface RegistroResumenCatalogo {
  resumenCategorias: string;
  resumenSubcategorias: string;
  ts: number;
}

const cacheContextoSesion = new Map<string, RegistroContextoCache>();
const cacheResumenCatalogo = new Map<string, RegistroResumenCatalogo>();

const FIELDS: RegistroIaCorrectionField[] = [
  "lugar",
  "pagador",
  "reparto",
  "total",
  "descripcion",
  "monto",
  "cantidad",
  "categoria_id",
  "subcategoria_id",
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extraerJsonSeguro(texto: string): RespuestaIaRaw | null {
  try {
    return JSON.parse(texto) as RespuestaIaRaw;
  } catch {
    const start = texto.indexOf("{");
    const end = texto.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(texto.slice(start, end + 1)) as RespuestaIaRaw;
    } catch {
      return null;
    }
  }
}

function parsearNumeroSeguro(v: unknown): number | null {
  return parseMontoFlexible(v);
}

function sanitizarPagador(v: unknown): PagadorCompra | null {
  return v === "franco" || v === "fabiola" || v === "compartido" ? v : null;
}

function sanitizarReparto(v: unknown): TipoReparto | null {
  return v === "50/50" || v === "solo_franco" || v === "solo_fabiola" ? v : null;
}

function resolverCategoriaId(
  item: ItemIaRaw,
  categorias: Array<{ id: string; nombre: string }>,
): string {
  if (item.categoria_id && categorias.some((c) => c.id === item.categoria_id)) {
    return item.categoria_id;
  }
  if (!item.categoria_nombre) return "";
  const nombre = normalizar(item.categoria_nombre);
  const cat = categorias.find((c) => normalizar(c.nombre) === nombre)
    ?? categorias.find((c) => normalizar(c.nombre).includes(nombre));
  return cat?.id ?? "";
}

function resolverSubcategoriaId(
  item: ItemIaRaw,
  categoriaId: string,
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>,
): string {
  if (item.subcategoria_id && subcategorias.some((s) => s.id === item.subcategoria_id)) {
    return item.subcategoria_id;
  }
  if (!item.subcategoria_nombre) return "";
  const nombre = normalizar(item.subcategoria_nombre);
  const candidatas = categoriaId
    ? subcategorias.filter((s) => s.categoria_id === categoriaId)
    : subcategorias;
  const sub = candidatas.find((s) => normalizar(s.nombre) === nombre)
    ?? candidatas.find((s) => normalizar(s.nombre).includes(nombre));
  return sub?.id ?? "";
}

function sanitizarPatch(
  raw: DraftPatchRaw,
  categorias: Array<{ id: string; nombre: string }>,
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>,
) {
  const warnings: string[] = [];

  function sanitizarItemRaw(item: ItemIaRaw) {
    const descripcion = String(item.descripcion ?? "").trim();
    if (!descripcion) return null;
    const cantidad = parsearNumeroSeguro(item.cantidad);
    const monto = parsearNumeroSeguro(item.monto);
    const categoriaId = resolverCategoriaId(item, categorias);
    const subcategoriaId = resolverSubcategoriaId(item, categoriaId, subcategorias);

    if (!categoriaId) warnings.push(`No se pudo asignar categoria para ${descripcion}`);
    if (item.subcategoria_nombre && !subcategoriaId) {
      warnings.push(`No se pudo asignar subcategoria para ${descripcion}`);
    }

    return {
      id: item.id ? String(item.id) : `ia-${Math.random().toString(16).slice(2, 10)}`,
      descripcion,
      cantidad: cantidad != null ? Math.max(1, Math.round(cantidad)) : null,
      expresionMonto: item.expresionMonto ? String(item.expresionMonto).trim() : null,
      monto,
      categoria_id: categoriaId,
      subcategoria_id: subcategoriaId,
      fuente: "ia" as const,
    };
  }

  const items = (raw.items ?? [])
    .map((item) => sanitizarItemRaw(item))
    .filter(Boolean);

  const total = parsearNumeroSeguro(raw.total);
  const pagador = sanitizarPagador(raw.pagador);
  const reparto = sanitizarReparto(raw.reparto);

  return {
    draftPatch: {
      lugar: raw.lugar ? String(raw.lugar).trim() : "",
      reparto,
      total,
      pagador,
      items,
      warnings: [...(raw.warnings ?? []).map((w) => String(w)), ...warnings],
      fuente: "ia" as const,
    },
  };
}

function sanitizarOperation(
  raw: OperationRaw,
  categorias: Array<{ id: string; nombre: string }>,
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>,
): RegistroIaCorrectionOp | null {
  if (raw.type === "add_item") {
    const itemRaw = raw.item;
    if (!itemRaw) return null;
    const descripcion = String(itemRaw.descripcion ?? "").trim();
    if (!descripcion) return null;
    const cantidad = parsearNumeroSeguro(itemRaw.cantidad);
    const monto = parsearNumeroSeguro(itemRaw.monto);
    const categoriaId = resolverCategoriaId(itemRaw, categorias);
    const subcategoriaId = resolverSubcategoriaId(itemRaw, categoriaId, subcategorias);

    return {
      type: "add_item",
      item: {
        descripcion,
        cantidad: cantidad != null ? Math.max(1, Math.round(cantidad)) : null,
        monto,
        expresionMonto: itemRaw.expresionMonto ? String(itemRaw.expresionMonto).trim() : null,
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
      },
    };
  }

  if (raw.type === "remove_item") {
    const targetItemId = raw.targetItemId ? String(raw.targetItemId) : undefined;
    const targetMatcher = raw.targetMatcher ? String(raw.targetMatcher) : undefined;
    const from = raw.from ? String(raw.from) : undefined;
    if (!targetItemId && !targetMatcher && !from) return null;
    return {
      type: "remove_item",
      targetItemId,
      targetMatcher,
      from,
    };
  }

  if (raw.type !== "replace_field") return null;
  if (raw.targetType !== "draft" && raw.targetType !== "item") return null;
  if (!FIELDS.includes(raw.field as RegistroIaCorrectionField)) return null;

  const field = raw.field as RegistroIaCorrectionField;
  let to: string | number | null = null;

  if (field === "total" || field === "monto" || field === "cantidad") {
    const num = parsearNumeroSeguro(raw.to);
    if (num == null) return null;
    to = field === "cantidad" ? Math.max(1, Math.round(num)) : num;
  } else if (field === "pagador") {
    const pagador = sanitizarPagador(raw.to);
    if (!pagador) return null;
    to = pagador;
  } else if (field === "reparto") {
    const reparto = sanitizarReparto(raw.to);
    if (!reparto) return null;
    to = reparto;
  } else if (field === "categoria_id") {
    const v = String(raw.to ?? "").trim();
    if (!categorias.some((c) => c.id === v)) return null;
    to = v;
  } else if (field === "subcategoria_id") {
    const v = String(raw.to ?? "").trim();
    if (!subcategorias.some((s) => s.id === v)) return null;
    to = v;
  } else {
    to = raw.to == null ? null : String(raw.to).trim();
    if (to === "") to = null;
  }

  return {
    type: "replace_field",
    targetType: raw.targetType,
    field,
    targetItemId: raw.targetItemId ? String(raw.targetItemId) : undefined,
    targetMatcher: raw.targetMatcher ? String(raw.targetMatcher) : undefined,
    from: raw.from ? String(raw.from) : undefined,
    to,
  };
}

function sanitizarResolution(raw: ResolutionRaw | undefined): RegistroIaResolution | null {
  if (!raw?.reason || !raw?.field || !FIELDS.includes(raw.field as RegistroIaCorrectionField)) return null;
  const options = (raw.options ?? [])
    .map((opt) => ({
      id: String(opt.id ?? ""),
      label: String(opt.label ?? "").trim(),
      targetItemId: opt.targetItemId ? String(opt.targetItemId) : undefined,
    }))
    .filter((opt) => opt.id && opt.label);
  if (!options.length) return null;
  return {
    reason: String(raw.reason),
    field: raw.field as RegistroIaCorrectionField,
    options,
  };
}

function inferirIntent(
  rawIntent: string | undefined,
  answer: string,
  operationsCount: number,
): RegistroIaIntent {
  if (rawIntent === "crear_o_actualizar" || rawIntent === "corregir" || rawIntent === "pregunta") {
    return rawIntent;
  }
  if (operationsCount > 0) return "corregir";
  if (answer) return "pregunta";
  return "crear_o_actualizar";
}

function extraerModelo(valor: unknown): string {
  if (typeof valor === "string") return valor;
  if (valor && typeof valor === "object" && "modelo" in valor) {
    return String((valor as { modelo?: unknown }).modelo ?? "");
  }
  return "";
}

function extraerBoolean(valor: unknown, fallback: boolean): boolean {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "string") {
    const n = valor.trim().toLowerCase();
    if (n === "true") return true;
    if (n === "false") return false;
  }
  if (valor && typeof valor === "object" && "enabled" in valor) {
    const enabled = (valor as { enabled?: unknown }).enabled;
    if (typeof enabled === "boolean") return enabled;
  }
  return fallback;
}

function extraerTexto(valor: unknown, fallback: string): string {
  if (typeof valor === "string" && valor.trim()) return valor.trim();
  if (valor && typeof valor === "object" && "version" in valor) {
    const v = String((valor as { version?: unknown }).version ?? "").trim();
    if (v) return v;
  }
  return fallback;
}

async function obtenerConfigIa(): Promise<ConfigIa> {
  const cliente = await crearClienteSupabaseServidor();
  const claves = [
    "ia_modelo_openrouter",
    "ia_prompt_v2_enabled",
    "ia_network_guard_enabled",
    "ia_history_enabled",
    "ia_catalog_compact_enabled",
    "ia_fullmode_question_planner_v2",
    "ia_prompt_version",
  ];

  const { data } = await cliente
    .from("configuracion")
    .select("clave, valor")
    .in("clave", claves);

  const mapa = new Map<string, unknown>();
  (data ?? []).forEach((row) => {
    mapa.set(String((row as { clave?: unknown }).clave ?? ""), (row as { valor?: unknown }).valor);
  });

  const modelo = extraerModelo(mapa.get("ia_modelo_openrouter")) || process.env.OPENROUTER_MODEL || MODELO_DEFAULT;

  return {
    modelo,
    promptVersion: extraerTexto(mapa.get("ia_prompt_version"), "v2"),
    flags: {
      promptV2: extraerBoolean(mapa.get("ia_prompt_v2_enabled"), true),
      networkGuard: extraerBoolean(mapa.get("ia_network_guard_enabled"), true),
      history: extraerBoolean(mapa.get("ia_history_enabled"), true),
      catalogCompact: extraerBoolean(mapa.get("ia_catalog_compact_enabled"), true),
      questionPlanner: extraerBoolean(mapa.get("ia_fullmode_question_planner_v2"), true),
    },
  };
}

function limpiarCaches() {
  const ahora = Date.now();
  for (const [clave, valor] of cacheContextoSesion.entries()) {
    if (ahora - valor.ts > CACHE_TTL_MS) cacheContextoSesion.delete(clave);
  }
  for (const [clave, valor] of cacheResumenCatalogo.entries()) {
    if (ahora - valor.ts > CACHE_TTL_MS) cacheResumenCatalogo.delete(clave);
  }
}

function resolverContextoCatalogo(body: CuerpoEntrada): CatalogoContexto {
  limpiarCaches();

  const sessionId = String(body.sessionId ?? "").trim();
  const categoriasBody = body.context?.categorias?.slice(0, 80) ?? [];
  const subcategoriasBody = body.context?.subcategorias?.slice(0, 160) ?? [];

  if (sessionId && (categoriasBody.length || subcategoriasBody.length)) {
    cacheContextoSesion.set(sessionId, {
      ts: Date.now(),
      contexto: {
        categorias: categoriasBody,
        subcategorias: subcategoriasBody,
      },
    });
  }

  if (sessionId && !categoriasBody.length && !subcategoriasBody.length) {
    const cache = cacheContextoSesion.get(sessionId);
    if (cache && Date.now() - cache.ts <= CACHE_TTL_MS) {
      return cache.contexto;
    }
  }

  return {
    categorias: categoriasBody,
    subcategorias: subcategoriasBody,
  };
}

function firmaCatalogo(contexto: CatalogoContexto): string {
  const baseCategorias = contexto.categorias
    .map((c) => `${c.id}:${normalizar(c.nombre)}`)
    .join("|");
  const baseSubcategorias = contexto.subcategorias
    .map((s) => `${s.id}:${s.categoria_id}:${normalizar(s.nombre)}`)
    .join("|");
  return `${baseCategorias}::${baseSubcategorias}`;
}

function obtenerResumenCatalogo(contexto: CatalogoContexto, compactar: boolean) {
  const firma = firmaCatalogo(contexto);
  const cache = cacheResumenCatalogo.get(firma);
  if (cache && Date.now() - cache.ts <= CACHE_TTL_MS) {
    return {
      resumenCategorias: cache.resumenCategorias,
      resumenSubcategorias: cache.resumenSubcategorias,
    };
  }

  const resumenCategorias = contexto.categorias.map((c) => `${c.id}:${c.nombre}`).join(", ") || "sin lista";
  const resumenSubcategorias = compactar
    ? (contexto.subcategorias.map((s) => `${s.id}:${s.nombre}`).join(", ") || "sin lista")
    : (contexto.subcategorias.map((s) => `${s.id}:${s.categoria_id}:${s.nombre}`).join(", ") || "sin lista");

  cacheResumenCatalogo.set(firma, {
    resumenCategorias,
    resumenSubcategorias,
    ts: Date.now(),
  });

  return { resumenCategorias, resumenSubcategorias };
}

function construirPromptSistema(params: {
  mode: "rapido" | "completo";
  categorias: string;
  subcategorias: string;
  flags: FlagsIa;
  promptVersion: string;
}) {
  if (!params.flags.promptV2) {
    return [
      "Sos un agente de registro de gastos para una app domestica.",
      "Respondes SOLO con JSON valido (sin markdown).",
      "Si es consulta sin cambios, devolve intent=pregunta y answer.",
      "Si es carga/actualizacion, devolve intent=crear_o_actualizar y draftPatch.",
      "Si es correccion, devolve intent=corregir y operations.",
      "No inventes categorias/subcategorias fuera del catalogo.",
      `Categorias disponibles (id:nombre): ${params.categorias}.`,
      `Subcategorias disponibles: ${params.subcategorias}.`,
    ].join("\n");
  }

  const lineas = [
    "Sos un agente de registro de gastos para una app domestica.",
    "Objetivo: resolver en la menor cantidad de preguntas posible y dejar un draft usable.",
    "Respondes SOLO con JSON valido (sin markdown).",
    `Version de prompt: ${params.promptVersion}`,
    "Inferencia proactiva: completa lugar, pagador, reparto y categorias cuando la evidencia sea alta.",
    "No pidas confirmacion de datos con evidencia alta.",
    "Solo preguntes si falta un dato critico sin senal clara.",
    "Importante: distinguir quien pago efectivamente de como se reparte la compra.",
    "Si falta pagador o reparto y no hay senal clara, preguntalo en una sola pregunta consolidada.",
    "Para alimentos/comida/supermercado/almacen/panaderia/carniceria/verduleria, prioriza categoria ALIMENTOS y una subcategoria coherente.",
    "Si hay ambiguedad real (2+ candidatos), no adivines: devolve resolution con opciones.",
    "No inventes categorias/subcategorias fuera del catalogo (usar IDs existentes o nombres del catalogo).",
    "Si el usuario pide editar, preferi operations precisas en vez de reescribir todo el draft.",
    "Usa add_item para agregar items y remove_item para quitar items cuando la instruccion sea clara.",
    "Si el usuario corrige algo, usa intent=corregir y operations.",
    "Si el usuario solo consulta, usa intent=pregunta y answer.",
    "Si carga o actualiza datos, usa intent=crear_o_actualizar y draftPatch.",
    "En answer: si falta dato, hace UNA pregunta concreta; si ya queda guardable, responde empezando con 'Listo'.",
  ];

  if (params.mode === "rapido") {
    lineas.push("Modo rapido: prioriza dejar el draft guardable en un solo mensaje cuando haya total o items.");
    lineas.push("No abras preguntas no criticas en modo rapido.");
  } else {
    lineas.push("Modo completo: pedir solo datos faltantes criticos en orden total > lugar > pagador > reparto > items > montos por item.");
    if (params.flags.questionPlanner) {
      lineas.push("Si faltan 2 campos compatibles, consolidalos en UNA sola pregunta.");
    }
  }

  lineas.push(
    "Formato JSON:",
    "{",
    '  "intent": "crear_o_actualizar|corregir|pregunta",',
    '  "answer": "string opcional",',
    '  "draftPatch": {',
    '    "lugar": "string|vacio",',
    '    "reparto": "50/50|solo_franco|solo_fabiola|null",',
    '    "total": "number|null",',
    '    "pagador": "franco|fabiola|compartido|null",',
    '    "items": [',
    "      {",
    '        "id": "string opcional",',
    '        "descripcion": "string",',
    '        "cantidad": "number|null",',
    '        "monto": "number|null",',
    '        "expresionMonto": "string|null",',
    '        "categoria_id": "id existente opcional",',
    '        "subcategoria_id": "id existente opcional",',
    '        "categoria_nombre": "fallback opcional",',
    '        "subcategoria_nombre": "fallback opcional"',
    "      }",
    "    ],",
    '    "warnings": ["string"]',
    "  },",
    '  "operations": [',
    "    {",
    '      "type": "replace_field|add_item|remove_item",',
    '      "targetType": "draft|item (solo replace_field)",',
    '      "field": "lugar|pagador|reparto|total|descripcion|monto|cantidad|categoria_id|subcategoria_id (solo replace_field)",',
    '      "targetItemId": "string opcional",',
    '      "targetMatcher": "string opcional",',
    '      "from": "string opcional",',
    '      "to": "string|number|null (solo replace_field)",',
    '      "item": { "descripcion":"string", "cantidad":"number|null", "monto":"number|null", "expresionMonto":"string|null", "categoria_id":"id opcional", "subcategoria_id":"id opcional", "categoria_nombre":"fallback", "subcategoria_nombre":"fallback" } (solo add_item)',
    "    }",
    "  ],",
    '  "resolution": {',
    '    "reason": "string",',
    '    "field": "descripcion|monto|cantidad|categoria_id|subcategoria_id",',
    '    "options": [{"id":"string","label":"string","targetItemId":"string opcional"}]',
    "  },",
    '  "warnings": ["string"]',
    "}",
    `Categorias disponibles (id:nombre): ${params.categorias}.`,
    `Subcategorias disponibles: ${params.subcategorias}.`,
  );

  return lineas.join("\n");
}

function sanitizarHistory(history: CuerpoEntrada["history"]): Array<{ role: "user" | "assistant"; content: string }> {
  return (history ?? [])
    .map((turno) => ({
      role: turno?.role === "assistant" ? "assistant" as const : "user" as const,
      content: String(turno?.content ?? "").trim(),
    }))
    .filter((turno) => Boolean(turno.content))
    .slice(-6)
    .map((turno) => ({ ...turno, content: turno.content.slice(0, 400) }));
}

async function fetchConTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function llamarOpenRouter(payload: object, apiKey: string, usarGuard: boolean) {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "CasitaApp",
    },
    body: JSON.stringify(payload),
  };

  if (!usarGuard) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", init);
    return { response, retries: 0, timeout: false };
  }

  let timeout = false;
  try {
    const response = await fetchConTimeout("https://openrouter.ai/api/v1/chat/completions", init, TIMEOUT_FETCH_MS);
    return { response, retries: 0, timeout: false };
  } catch {
    timeout = true;
  }

  const response = await fetchConTimeout("https://openrouter.ai/api/v1/chat/completions", init, TIMEOUT_FETCH_MS);
  return { response, retries: 1, timeout };
}

function costoEstimado(usage: OpenRouterUsage | undefined): number {
  if (!usage) return 0;
  if (typeof usage.cost === "number" && Number.isFinite(usage.cost)) return usage.cost;
  if (typeof usage.total_cost === "number" && Number.isFinite(usage.total_cost)) return usage.total_cost;
  return 0;
}

async function registrarLogIa(payload: {
  userId: string;
  sessionId: string;
  modo: "rapido" | "completo";
  intent: string;
  canSave: boolean;
  camposCompletados: number;
  faltantesCount: number;
  latenciaMs: number;
  modelo: string;
  promptVersion: string;
  retryCount: number;
  providerStatus: number;
  fallbackUsed: boolean;
  errorCode: string | null;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  costoEstUsd: number;
}) {
  try {
    const cliente = await crearClienteSupabaseServidor();
    await cliente.from("ia_logs").insert({
      session_id: payload.sessionId,
      user_id: payload.userId,
      modo: payload.modo,
      intent: payload.intent,
      can_save: payload.canSave,
      campos_completados: payload.camposCompletados,
      faltantes_count: payload.faltantesCount,
      latencia_ms: payload.latenciaMs,
      modelo: payload.modelo,
      prompt_version: payload.promptVersion,
      retry_count: payload.retryCount,
      provider_status: payload.providerStatus,
      fallback_used: payload.fallbackUsed,
      error_code: payload.errorCode,
      tokens_in: payload.tokensIn,
      tokens_out: payload.tokensOut,
      tokens_total: payload.tokensTotal,
      costo_est_usd: payload.costoEstUsd,
    });
  } catch {
    // log best-effort, no bloquear flujo
  }
}

function countCamposCompletados(draft: DraftPatchRaw | undefined) {
  if (!draft) return 0;
  let total = 0;
  if (draft.lugar) total += 1;
  if (draft.reparto) total += 1;
  if (draft.total != null) total += 1;
  if (draft.pagador) total += 1;
  if ((draft.items ?? []).length > 0) total += 1;
  return total;
}

export async function POST(request: Request) {
  const inicio = Date.now();
  const cliente = await crearClienteSupabaseServidor();
  const {
    data: { user },
  } = await cliente.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 503 });
  }

  const body = await request.json() as CuerpoEntrada;
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Falta message" }, { status: 400 });
  }

  const modo: "rapido" | "completo" = body.mode === "completo" ? "completo" : "rapido";
  const sessionId = String(body.sessionId ?? "").trim() || `ria-${user.id}-${Date.now()}`;

  const config = await obtenerConfigIa();
  const contexto = resolverContextoCatalogo(body);

  const { resumenCategorias, resumenSubcategorias } = obtenerResumenCatalogo(contexto, config.flags.catalogCompact);

  const promptSistema = construirPromptSistema({
    mode: modo,
    categorias: resumenCategorias,
    subcategorias: resumenSubcategorias,
    flags: config.flags,
    promptVersion: config.promptVersion,
  });

  const history = config.flags.history ? sanitizarHistory(body.history) : [];

  const payload = {
    model: config.modelo,
    temperature: 0.1,
    max_tokens: 520,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: promptSistema },
      ...history.map((turno) => ({ role: turno.role, content: turno.content })),
      {
        role: "user",
        content: `Modo: ${modo}\nMensaje usuario:\n${message}\n\nDraft actual:\n${JSON.stringify(body.draft ?? {}, null, 2)}`,
      },
    ],
  };

  let providerStatus = 0;
  let retryCount = 0;
  let fallbackUsed = false;
  let errorCode: string | null = null;

  let openRouterRes: Response;
  try {
    const orCall = await llamarOpenRouter(payload, apiKey, config.flags.networkGuard);
    openRouterRes = orCall.response;
    retryCount = orCall.retries;
    if (orCall.timeout) fallbackUsed = true;
  } catch {
    const latenciaMs = Date.now() - inicio;
    errorCode = "provider_unreachable";
    fallbackUsed = true;
    void registrarLogIa({
      userId: user.id,
      sessionId,
      modo,
      intent: "error",
      canSave: false,
      camposCompletados: 0,
      faltantesCount: 1,
      latenciaMs,
      modelo: config.modelo,
      promptVersion: config.promptVersion,
      retryCount,
      providerStatus,
      fallbackUsed,
      errorCode,
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      costoEstUsd: 0,
    });

    return NextResponse.json({
      error: {
        code: errorCode,
        message: "No se pudo conectar con IA. Podes reintentar.",
        retryable: true,
      },
      meta: {
        sessionId,
        model: config.modelo,
        promptVersion: config.promptVersion,
        retryCount,
        latencyMs: latenciaMs,
      },
    });
  }

  providerStatus = openRouterRes.status;

  if (!openRouterRes.ok) {
    const errTxt = await openRouterRes.text();
    const latenciaMs = Date.now() - inicio;
    errorCode = "provider_error";
    fallbackUsed = true;

    void registrarLogIa({
      userId: user.id,
      sessionId,
      modo,
      intent: "error",
      canSave: false,
      camposCompletados: 0,
      faltantesCount: 1,
      latenciaMs,
      modelo: config.modelo,
      promptVersion: config.promptVersion,
      retryCount,
      providerStatus,
      fallbackUsed,
      errorCode,
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      costoEstUsd: 0,
    });

    return NextResponse.json({
      error: {
        code: errorCode,
        message: `OpenRouter error: ${errTxt.slice(0, 180)}`,
        retryable: true,
      },
      meta: {
        sessionId,
        model: config.modelo,
        promptVersion: config.promptVersion,
        retryCount,
        latencyMs: latenciaMs,
      },
    });
  }

  const json = await openRouterRes.json() as OpenRouterResponse;
  const contenido = json.choices?.[0]?.message?.content ?? "";
  const raw = extraerJsonSeguro(contenido);

  const usage = json.usage;
  const tokensIn = Number(usage?.prompt_tokens ?? 0);
  const tokensOut = Number(usage?.completion_tokens ?? 0);
  const tokensTotal = Number(usage?.total_tokens ?? (tokensIn + tokensOut));
  const costoEstUsd = costoEstimado(usage);

  if (!raw) {
    const latenciaMs = Date.now() - inicio;
    errorCode = "model_json_invalid";
    fallbackUsed = true;

    void registrarLogIa({
      userId: user.id,
      sessionId,
      modo,
      intent: "error",
      canSave: false,
      camposCompletados: 0,
      faltantesCount: 1,
      latenciaMs,
      modelo: config.modelo,
      promptVersion: config.promptVersion,
      retryCount,
      providerStatus,
      fallbackUsed,
      errorCode,
      tokensIn,
      tokensOut,
      tokensTotal,
      costoEstUsd,
    });

    return NextResponse.json({
      error: {
        code: errorCode,
        message: "No se pudo interpretar la respuesta de IA. Reintenta.",
        retryable: true,
      },
      meta: {
        sessionId,
        model: config.modelo,
        promptVersion: config.promptVersion,
        retryCount,
        latencyMs: latenciaMs,
      },
    });
  }

  const draftRaw: DraftPatchRaw | undefined = raw.draftPatch
    ?? (raw.lugar !== undefined || raw.reparto !== undefined || raw.total !== undefined || raw.pagador !== undefined || raw.items !== undefined
      ? { lugar: raw.lugar, reparto: raw.reparto, total: raw.total, pagador: raw.pagador, items: raw.items, warnings: raw.warnings }
      : undefined);

  const draftSanitizado = draftRaw
    ? sanitizarPatch(draftRaw, contexto.categorias, contexto.subcategorias)
    : { draftPatch: undefined };

  const operations = (raw.operations ?? [])
    .map((op) => sanitizarOperation(op, contexto.categorias, contexto.subcategorias))
    .filter((op): op is RegistroIaCorrectionOp => Boolean(op));

  const answer = raw.answer ? String(raw.answer).trim() : "";
  const intent = inferirIntent(raw.intent, answer, operations.length);
  const resolution = sanitizarResolution(raw.resolution);
  const warnings = [
    ...(draftSanitizado.draftPatch?.warnings ?? []),
    ...((raw.warnings ?? []).map((w) => String(w))),
  ];

  const latenciaMs = Date.now() - inicio;
  const camposCompletados = countCamposCompletados(draftRaw);

  void registrarLogIa({
    userId: user.id,
    sessionId,
    modo,
    intent,
    canSave: intent !== "pregunta",
    camposCompletados,
    faltantesCount: 0,
    latenciaMs,
    modelo: config.modelo,
    promptVersion: config.promptVersion,
    retryCount,
    providerStatus,
    fallbackUsed,
    errorCode,
    tokensIn,
    tokensOut,
    tokensTotal,
    costoEstUsd,
  });

  return NextResponse.json({
    intent,
    answer,
    draftPatch: draftSanitizado.draftPatch,
    operations,
    resolution,
    warnings,
    model: config.modelo,
    meta: {
      sessionId,
      model: config.modelo,
      promptVersion: config.promptVersion,
      retryCount,
      latencyMs: latenciaMs,
    },
  });
}
