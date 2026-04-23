import { NextResponse } from "next/server";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";
import { ejecutarTool } from "@/lib/ai/tools-datos";
import { parseMontoFlexible } from "@/lib/ai/montos";
import type {
  ChatIntent,
  ChatLlmResponse,
  ChatRequest,
  ChatResponse,
  ToolName,
  ToolResult,
  ChatDraftPatch,
  ChatDraftItem,
} from "@/lib/ai/contracts-chat";
import type { PagadorCompra, TipoReparto } from "@/types";

const MODELO_DEFAULT = "minimax/minimax-m2.7";
const CACHE_TTL_MS = 1000 * 60 * 5;
const TIMEOUT_FETCH_MS = 10000;

// ─── Cache de catálogo ─────────────────────────────────────────────
interface CacheCatalogo {
  resumenCats: string;
  resumenSubs: string;
  ts: number;
}

const cacheCatalogo = new Map<string, CacheCatalogo>();

function limpiarCache() {
  const ahora = Date.now();
  for (const [k, v] of cacheCatalogo.entries()) {
    if (ahora - v.ts > CACHE_TTL_MS) cacheCatalogo.delete(k);
  }
}

function obtenerResumenCatalogo(
  cats: Array<{ id: string; nombre: string }>,
  subs: Array<{ id: string; categoria_id: string; nombre: string }>,
) {
  const firma = cats.map((c) => c.id).join(",") + "::" + subs.map((s) => s.id).join(",");
  limpiarCache();
  const cached = cacheCatalogo.get(firma);
  if (cached && Date.now() - cached.ts <= CACHE_TTL_MS) {
    return { resumenCats: cached.resumenCats, resumenSubs: cached.resumenSubs };
  }
  const resumenCats = cats.map((c) => `${c.id}:${c.nombre}`).join(", ") || "sin lista";
  const resumenSubs = subs.map((s) => `${s.id}:${s.nombre}`).join(", ") || "sin lista";
  cacheCatalogo.set(firma, { resumenCats, resumenSubs, ts: Date.now() });
  return { resumenCats, resumenSubs };
}

// ─── Config ────────────────────────────────────────────────────────
async function obtenerModelo(): Promise<string> {
  try {
    const cliente = await crearClienteSupabaseServidor();
    const { data } = await cliente
      .from("configuracion")
      .select("valor")
      .eq("clave", "ia_modelo_openrouter")
      .single();
    if (data?.valor) {
      const v = typeof data.valor === "string" ? data.valor : (data.valor as { modelo?: string }).modelo;
      if (v) return v;
    }
  } catch {
    // fallback
  }
  return process.env.OPENROUTER_MODEL || MODELO_DEFAULT;
}

// ─── Sanitización ──────────────────────────────────────────────────
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function sanitizarPagador(v: unknown): PagadorCompra | null {
  return v === "franco" || v === "fabiola" || v === "compartido" ? v : null;
}

function sanitizarReparto(v: unknown): TipoReparto | null {
  return v === "50/50" || v === "solo_franco" || v === "solo_fabiola" ? v : null;
}

function resolverCategoriaId(
  item: ChatDraftItem,
  cats: Array<{ id: string; nombre: string }>,
): string {
  if (item.categoria_id && cats.some((c) => c.id === item.categoria_id)) return item.categoria_id;
  if (!item.categoria_nombre) return "";
  const nombre = normalizar(item.categoria_nombre);
  const cat = cats.find((c) => normalizar(c.nombre) === nombre)
    ?? cats.find((c) => normalizar(c.nombre).includes(nombre));
  return cat?.id ?? "";
}

function resolverSubcategoriaId(
  item: ChatDraftItem,
  categoriaId: string,
  subs: Array<{ id: string; categoria_id: string; nombre: string }>,
): string {
  if (item.subcategoria_id && subs.some((s) => s.id === item.subcategoria_id)) return item.subcategoria_id;
  if (!item.subcategoria_nombre) return "";
  const nombre = normalizar(item.subcategoria_nombre);
  const candidatas = categoriaId ? subs.filter((s) => s.categoria_id === categoriaId) : subs;
  const sub = candidatas.find((s) => normalizar(s.nombre) === nombre)
    ?? candidatas.find((s) => normalizar(s.nombre).includes(nombre));
  return sub?.id ?? "";
}

function sanitizarDraftPatch(
  raw: ChatDraftPatch,
  cats: Array<{ id: string; nombre: string }>,
  subs: Array<{ id: string; categoria_id: string; nombre: string }>,
): ChatDraftPatch {
  const warnings: string[] = [];

  const items = (raw.items ?? [])
    .map((item) => {
      const descripcion = String(item.descripcion ?? "").trim();
      if (!descripcion) return null;
      const cantidad = parseMontoFlexible(item.cantidad);
      const monto = parseMontoFlexible(item.monto);
      const categoriaId = resolverCategoriaId(item, cats);
      const subcategoriaId = resolverSubcategoriaId(item, categoriaId, subs);
      if (!categoriaId) warnings.push(`Sin categoría para ${descripcion}`);
      return {
        id: item.id ?? `chat-${Math.random().toString(16).slice(2, 10)}`,
        descripcion,
        cantidad: cantidad != null ? Math.max(1, Math.round(cantidad)) : null,
        expresionMonto: item.expresionMonto ? String(item.expresionMonto).trim() : null,
        monto,
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
        categoria_nombre: item.categoria_nombre,
        subcategoria_nombre: item.subcategoria_nombre,
      } satisfies ChatDraftItem;
    })
    .filter(Boolean) as ChatDraftItem[];

  return {
    lugar: raw.lugar ? String(raw.lugar).trim() : "",
    reparto: sanitizarReparto(raw.reparto),
    total: parseMontoFlexible(raw.total),
    pagador: sanitizarPagador(raw.pagador),
    items,
    warnings: [...(raw.warnings ?? []), ...warnings],
  };
}

// ─── Historial ─────────────────────────────────────────────────────
function sanitizarHistory(history: ChatRequest["history"]) {
  return (history ?? [])
    .map((t) => ({
      role: t?.role === "assistant" ? "assistant" as const : "user" as const,
      content: String(t?.content ?? "").trim(),
    }))
    .filter((t) => Boolean(t.content))
    .slice(-8)
    .map((t) => ({ ...t, content: t.content.slice(0, 500) }));
}

// ─── Prompt sistema ────────────────────────────────────────────────
function construirPrompt(params: {
  cats: string;
  subs: string;
  mesActual: string;
}) {
  return `Sos el asistente de CasitaApp, una app de gastos domésticos entre Franco y Fabiola.
Respondés SOLO con JSON válido (sin markdown, sin backticks).

INTENTS:
- "consulta": el usuario pregunta sobre datos. Devolvé toolCalls con la tool y params.
- "registro": el usuario quiere anotar un gasto. Devolvé draftPatch.
- "edicion": el usuario quiere modificar/borrar una compra existente. Devolvé answer explicando qué harías.
- "analisis": el usuario quiere comparar, proyectar o entender tendencias. Devolvé toolCalls.
- "conversacion": saludo, pregunta general, o algo no relacionado. Solo answer.

TOOLS DISPONIBLES (solo para intent consulta/analisis):
- gastos_por_categoria({mes?}) → total por categoría. mes=YYYY-MM, default mes actual
- gastos_por_mes({año?}) → evolución mensual del año
- compras_recientes({limite?}) → últimas N compras (max 20)
- balance_actual() → quién debe cuánto a quién
- presupuesto_status({mes?}) → % usado vs límite por categoría
- top_gastos({mes?, limite?}) → los gastos más altos
- buscar_compras({texto, limite?}) → buscar por lugar o descripción

REGLAS:
- Para "¿cuándo compramos X?" o "buscá X" → buscar_compras
- Para "¿le debo algo a Fabiola?" o "¿quién debe?" → balance_actual
- Para "¿cuánto gastamos en [categoría]?" → gastos_por_categoria
- Para "¿cuánto gastamos este mes?" → gastos_por_categoria
- Para "¿en qué gastamos más?" → top_gastos o gastos_por_categoria
- Para "¿cómo van los presupuestos?" → presupuesto_status
- Para comparar meses → gastos_por_mes
- Si menciona un monto + lugar + quién pagó → intent=registro
- Si el usuario dice "anotá", "cargá", "gasté", "compré" → intent=registro
- Siempre que puedas, completá datos inferidos (lugar, pagador, categoría)
- Si hay ambigüedad real, preguntá en answer

REGISTRO (solo si intent=registro):
- draftPatch: {lugar, pagador, reparto, total, items: [{descripcion, monto, categoria_id, subcategoria_id, categoria_nombre, subcategoria_nombre}]}
- Los IDs de categoría/subcategoría deben ser del catálogo. Si no los conocés, usá categoria_nombre/subcategoria_nombre como fallback.
- Siempre guardamos como borrador (estado=borrador)

CATÁLOGO:
Categorías: ${params.cats}
Subcategorías: ${params.subs}

MES ACTUAL: ${params.mesActual}

FORMATO JSON:
{
  "intent": "consulta|registro|edicion|analisis|conversacion",
  "answer": "respuesta en lenguaje natural (siempre incluir)",
  "toolCalls": [{"tool": "nombre_tool", "params": {}}],
  "draftPatch": { ... },
  "warnings": ["string"]
}`;
}

// ─── Formateo de resultados para el LLM ────────────────────────────
function formatearResultadoParaLlm(result: ToolResult): string {
  if (!result.ok) return `Error: ${result.error}`;
  const d = result.data as Record<string, unknown>;
  return JSON.stringify(d);
}

// ─── Respuesta desde tools (fallback si el LLM no dio answer) ─────
function construirAnswerDesdeTools(results: ToolResult[]): string {
  const partes: string[] = [];
  for (const r of results) {
    if (!r.ok) {
      partes.push(`No pude obtener datos: ${r.error}`);
      continue;
    }
    const d = r.data as Record<string, unknown>;
    switch (r.tool) {
      case "balance_actual": {
        const balance = d as { deudor: string | null; montoAdeudado: number; francoPago: number; fabiolaPago: number };
        if (!balance.deudor) {
          partes.push("Están en cero, nadie le debe nada al otro.");
        } else {
          partes.push(`${balance.deudor} le debe $${balance.montoAdeudado.toLocaleString("es-AR")} a ${balance.deudor === "Franco" ? "Fabiola" : "Franco"}.`);
        }
        break;
      }
      case "gastos_por_categoria": {
        const gc = d as { total: number; categorias: Array<{ nombre: string; total: number; porcentaje: string }>; variacion: string | null };
        partes.push(`Total del mes: $${gc.total.toLocaleString("es-AR")}.`);
        if (gc.categorias.length > 0) {
          const top3 = gc.categorias.slice(0, 3).map((c) => `${c.nombre} ($${c.total.toLocaleString("es-AR")}, ${c.porcentaje}%)`);
          partes.push(`Top: ${top3.join(", ")}.`);
        }
        if (gc.variacion) {
          const v = Number(gc.variacion);
          partes.push(v > 0 ? `📈 ${gc.variacion}% más que el mes anterior.` : `📉 ${Math.abs(v)}% menos que el mes anterior.`);
        }
        break;
      }
      default:
        // Para otros tools, devolver JSON compacto
        partes.push(JSON.stringify(d));
    }
  }
  return partes.join("\n") || "No encontré datos para eso.";
}

// ─── Llamada a OpenRouter ──────────────────────────────────────────
async function llamarOpenRouter(payload: object, apiKey: string) {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "CasitaApp-Chat",
    },
    body: JSON.stringify(payload),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_FETCH_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function extraerJsonSeguro(texto: string): ChatLlmResponse | null {
  try {
    return JSON.parse(texto) as ChatLlmResponse;
  } catch {
    const start = texto.indexOf("{");
    const end = texto.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(texto.slice(start, end + 1)) as ChatLlmResponse;
    } catch {
      return null;
    }
  }
}

function inferirIntent(raw: ChatLlmResponse): ChatIntent {
  const validos: ChatIntent[] = ["consulta", "registro", "edicion", "analisis", "conversacion"];
  if (raw.intent && validos.includes(raw.intent)) return raw.intent;
  if (raw.toolCalls && raw.toolCalls.length > 0) return "consulta";
  if (raw.draftPatch?.items && raw.draftPatch.items.length > 0) return "registro";
  return "conversacion";
}

// ─── Telemetría ────────────────────────────────────────────────────
async function registrarLog(payload: {
  userId: string;
  sessionId: string;
  intent: string;
  latenciaMs: number;
  modelo: string;
  tokensIn: number;
  tokensOut: number;
  errorCode?: string;
}) {
  try {
    const cliente = await crearClienteSupabaseServidor();
    await cliente.from("ia_logs").insert({
      session_id: payload.sessionId,
      user_id: payload.userId,
      modo: "completo",
      intent: payload.intent,
      can_save: payload.intent === "registro",
      campos_completados: 0,
      faltantes_count: 0,
      latencia_ms: payload.latenciaMs,
      modelo: payload.modelo,
      prompt_version: "chat-v1",
      retry_count: 0,
      provider_status: 0,
      fallback_used: false,
      error_code: payload.errorCode ?? null,
      tokens_in: payload.tokensIn,
      tokens_out: payload.tokensOut,
      tokens_total: payload.tokensIn + payload.tokensOut,
      costo_est_usd: 0,
    });
  } catch {
    // best-effort
  }
}

// ─── Handler POST ──────────────────────────────────────────────────
export async function POST(request: Request) {
  const inicio = Date.now();
  const cliente = await crearClienteSupabaseServidor();
  const { data: { user } } = await cliente.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 503 });
  }

  const body = await request.json() as ChatRequest;
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Falta message" }, { status: 400 });
  }

  const sessionId = String(body.sessionId ?? "").trim() || `chat-${user.id}-${Date.now()}`;
  const mesActual = new Date().toISOString().slice(0, 7);

  // Resolver catálogo (del body o cache)
  const catsBody = body.context?.categorias ?? [];
  const subsBody = body.context?.subcategorias ?? [];

  // Si no viene en body, consultar
  let cats = catsBody;
  let subs = subsBody;
  if (!cats.length) {
    const { data } = await cliente.from("categorias").select("id, nombre").order("nombre");
    cats = data ?? [];
  }
  if (!subs.length) {
    const { data } = await cliente.from("subcategorias").select("id, categoria_id, nombre").order("nombre");
    subs = data ?? [];
  }

  const { resumenCats, resumenSubs } = obtenerResumenCatalogo(cats, subs);

  const promptSistema = construirPrompt({
    cats: resumenCats,
    subs: resumenSubs,
    mesActual,
  });

  const history = sanitizarHistory(body.history);

  const modelo = await obtenerModelo();

  const payload = {
    model: modelo,
    temperature: 0.15,
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: promptSistema },
      ...history.map((t) => ({ role: t.role, content: t.content })),
      {
        role: "user",
        content: `Mensaje: ${message}${body.draft ? `\nDraft actual: ${JSON.stringify(body.draft)}` : ""}`,
      },
    ],
  };

  // Llamar al LLM
  let openRouterRes: Response;
  try {
    openRouterRes = await llamarOpenRouter(payload, apiKey);
  } catch {
    const latenciaMs = Date.now() - inicio;
    void registrarLog({ userId: user.id, sessionId, intent: "error", latenciaMs, modelo, tokensIn: 0, tokensOut: 0, errorCode: "provider_unreachable" });
    return NextResponse.json({
      intent: "conversacion",
      answer: "No pude conectar con la IA. Probá de nuevo en un momento.",
      error: { code: "provider_unreachable", retryable: true },
    } satisfies Partial<ChatResponse>);
  }

  if (!openRouterRes.ok) {
    const errTxt = await openRouterRes.text();
    const latenciaMs = Date.now() - inicio;
    void registrarLog({ userId: user.id, sessionId, intent: "error", latenciaMs, modelo, tokensIn: 0, tokensOut: 0, errorCode: "provider_error" });
    return NextResponse.json({
      intent: "conversacion",
      answer: `Error de IA: ${errTxt.slice(0, 120)}`,
      error: { code: "provider_error", retryable: true },
    } satisfies Partial<ChatResponse>);
  }

  const json = await openRouterRes.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const contenido = json.choices?.[0]?.message?.content ?? "";
  const raw = extraerJsonSeguro(contenido);

  const tokensIn = Number(json.usage?.prompt_tokens ?? 0);
  const tokensOut = Number(json.usage?.completion_tokens ?? 0);

  if (!raw) {
    const latenciaMs = Date.now() - inicio;
    void registrarLog({ userId: user.id, sessionId, intent: "error", latenciaMs, modelo, tokensIn, tokensOut, errorCode: "json_invalid" });
    return NextResponse.json({
      intent: "conversacion",
      answer: "No entendí bien. ¿Podés reformular?",
      error: { code: "json_invalid", retryable: true },
    } satisfies Partial<ChatResponse>);
  }

  const intent = inferirIntent(raw);

  // Ejecutar tools si hay
  const toolResults: ToolResult[] = [];
  if (raw.toolCalls && raw.toolCalls.length > 0) {
    for (const tc of raw.toolCalls.slice(0, 3)) {
      const toolName = tc.tool as ToolName;
      const params = (tc.params ?? {}) as Record<string, unknown>;
      const resultado = await ejecutarTool(cliente, toolName, params);
      toolResults.push(resultado);
    }
  }

  // Si es registro, sanitizar draft
  let draftPatch: ChatDraftPatch | undefined;
  if (intent === "registro" && raw.draftPatch) {
    draftPatch = sanitizarDraftPatch(raw.draftPatch, cats, subs);
  }

  const latenciaMs = Date.now() - inicio;

  void registrarLog({ userId: user.id, sessionId, intent, latenciaMs, modelo, tokensIn, tokensOut });

  // Si hay resultados de tools, hacer una segunda llamada breve para formatear
  let answerFinal = raw.answer ?? "";
  if (toolResults.length > 0 && toolResults.some((r) => r.ok)) {
    const datosFormateados = toolResults.map((r) => formatearResultadoParaLlm(r)).join("\n");
    const payloadFormato = {
      model: modelo,
      temperature: 0.2,
      max_tokens: 250,
      messages: [
        {
          role: "system",
          content: "Sos un asistente de finanzas domésticas. Con los datos que te paso, respondé en lenguaje natural de forma breve y útil. Usá pesos argentinos ($). Máximo 3 oraciones. Sin markdown.",
        },
        {
          role: "user",
          content: `Pregunta original: ${message}\n\nDatos:\n${datosFormateados}`,
        },
      ],
    };

    try {
      const resFormato = await llamarOpenRouter(payloadFormato, apiKey);
      if (resFormato.ok) {
        const jsonFormato = await resFormato.json() as { choices?: Array<{ message?: { content?: string } }> };
        const textoFormato = jsonFormato.choices?.[0]?.message?.content?.trim();
        if (textoFormato) answerFinal = textoFormato;
      }
    } catch {
      // fallback al answer del primer call o al formateo local
    }
  }

  // Si no hay answer pero hay draft, construir uno
  if (!answerFinal && draftPatch) {
    const partes: string[] = [];
    if (draftPatch.lugar) partes.push(`Lugar: ${draftPatch.lugar}`);
    if (draftPatch.total) partes.push(`Total: $${draftPatch.total.toLocaleString("es-AR")}`);
    if (draftPatch.pagador) partes.push(`Pagó: ${draftPatch.pagador}`);
    if (draftPatch.items?.length) partes.push(`${draftPatch.items.length} item(s)`);
    answerFinal = partes.length > 0
      ? `Listo, armé el borrador:\n${partes.join("\n")}`
      : "Necesito más datos para armar el borrador.";
  }

  if (!answerFinal) {
    answerFinal = "¿En qué te puedo ayudar?";
  }

  const respuesta: ChatResponse = {
    intent,
    answer: answerFinal,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    draftPatch,
    warnings: raw.warnings,
    model: modelo,
    meta: {
      sessionId,
      model: modelo,
      latencyMs: latenciaMs,
      tokensIn,
      tokensOut,
    },
  };

  return NextResponse.json(respuesta);
}
