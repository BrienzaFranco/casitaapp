import type { PagadorCompra, TipoReparto, CompraEditable } from "@/types";
import { calcularReparto } from "@/lib/calculos";
import { fechaLocalISO } from "@/lib/utiles";

// ─── Intents del chat global ───────────────────────────────────────
export type ChatIntent = "consulta" | "registro" | "registro_incompleto" | "edicion" | "edicion_borrador" | "analisis" | "conversacion" | "clarificacion";

// ─── Tools de datos disponibles ────────────────────────────────────
export type ToolName =
  | "gastos_por_categoria"
  | "gastos_por_mes"
  | "compras_recientes"
  | "balance_actual"
  | "presupuesto_status"
  | "top_gastos"
  | "ultima_compra_item"
  | "buscar_compras"
  | "items_frecuentes"
  | "borradores_pendientes"
  | "ejecutar_sql";

// ─── Parámetros de cada tool ───────────────────────────────────────
export interface ParamsGastosPorCategoria {
  mes?: string; // YYYY-MM
}

export interface ParamsGastosPorMes {
  año?: string; // YYYY
}

export interface ParamsComprasRecientes {
  limite?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParamsBalanceActual {
  // sin parámetros
}

export interface ParamsPresupuestoStatus {
  mes?: string; // YYYY-MM
}

export interface ParamsTopGastos {
  mes?: string; // YYYY-MM
  limite?: number;
}

export interface ParamsUltimaCompraItem {
  texto: string;
}

export interface ParamsBuscarCompras {
  texto: string;
  limite?: number;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
}

export interface ParamsItemsFrecuentes {
  limite?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParamsBorradoresPendientes {
  // sin parámetros
}

export interface ParamsEjecutarSql {
  sql: string;
}

export type ToolParams =
  | ParamsGastosPorCategoria
  | ParamsGastosPorMes
  | ParamsComprasRecientes
  | ParamsBalanceActual
  | ParamsPresupuestoStatus
  | ParamsTopGastos
  | ParamsUltimaCompraItem
  | ParamsBuscarCompras
  | ParamsItemsFrecuentes
  | ParamsBorradoresPendientes
  | ParamsEjecutarSql;

// ─── Tool call del LLM ─────────────────────────────────────────────
export interface ToolCall {
  tool: ToolName;
  params: ToolParams;
}

// ─── Resultado de ejecutar un tool ─────────────────────────────────
export interface ToolResultOk {
  ok: true;
  tool: ToolName;
  data: unknown;
  resumen?: string;
}

export interface ToolResultErr {
  ok: false;
  tool: ToolName;
  error: string;
}

export type ToolResult = ToolResultOk | ToolResultErr;

// ─── Draft para registro (reutiliza estructura existente) ──────────
export interface ChatDraftItem {
  id?: string;
  descripcion: string;
  cantidad: number | null;
  monto: number | null;
  expresionMonto: string | null;
  categoria_id: string;
  subcategoria_id: string;
  categoria_nombre?: string;
  subcategoria_nombre?: string;
}

export interface ChatDraftPatch {
  lugar?: string;
  reparto?: TipoReparto | null;
  total?: number | null;
  pagador?: PagadorCompra | null;
  items?: ChatDraftItem[];
  warnings?: string[];
  /** Campos que faltan para considerar el registro completo */
  camposFaltantes?: string[];
}

// ─── Respuesta cruda del LLM ───────────────────────────────────────
export interface ChatLlmResponse {
  intent: ChatIntent;
  answer?: string;
  toolCalls?: ToolCall[];
  draftPatch?: ChatDraftPatch;
  operations?: unknown[];
  resolution?: unknown;
  warnings?: string[];
}

// ─── Respuesta final del endpoint al cliente ───────────────────────
export interface ChatSugerencia {
  id: string;
  label: string;
  action: "consulta" | "registro" | "reintentar";
  payload?: string;
}

export interface ChatResponse {
  intent: ChatIntent;
  answer: string;
  toolResults?: ToolResult[];
  draftPatch?: ChatDraftPatch;
  operations?: unknown[];
  resolution?: unknown;
  warnings?: string[];
  sugerencias?: ChatSugerencia[];
  camposFaltantes?: string[];
  model?: string;
  error?: {
    code: string;
    message?: string;
    retryable?: boolean;
  };
  meta?: {
    sessionId: string;
    model: string;
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
  };
}

// ─── Mensaje del historial ─────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Cuerpo de la request al endpoint ──────────────────────────────
export interface ChatRequest {
  message: string;
  sessionId?: string;
  history?: ChatMessage[];
  // Para flujo de registro
  draft?: unknown;
  mode?: "rapido" | "completo";
  previousIntent?: ChatIntent;
  /** Fuerza la intención directamente, saltando clasificación */
  forceIntent?: ChatIntent;
  context?: {
    categorias?: Array<{ id: string; nombre: string }>;
    subcategorias?: Array<{ id: string; categoria_id: string; nombre: string }>;
  };
}

// ─── Conversión ChatDraftPatch → CompraEditable ────────────────────
function tipoRepartoDesdePagador(pagador: PagadorCompra): TipoReparto {
  if (pagador === "franco") return "solo_franco";
  if (pagador === "fabiola") return "solo_fabiola";
  return "50/50";
}

export function convertirChatDraftACompraEditable(
  draft: ChatDraftPatch,
  opciones: {
    registradoPor: string;
    textoOriginal?: string;
    etiquetasCompraIds?: string[];
    compraId?: string;
  },
): CompraEditable {
  const pagador = draft.pagador ?? "compartido";
  const tipoReparto = draft.reparto && draft.reparto !== "personalizado"
    ? draft.reparto
    : tipoRepartoDesdePagador(pagador);

  const itemsBase = draft.items && draft.items.length > 0
    ? draft.items
    : [{
        descripcion: "Compra sin detalle",
        monto: draft.total ?? 0,
        expresionMonto: draft.total != null ? String(draft.total) : "0",
        categoria_id: "",
        subcategoria_id: "",
      }];

  const items = itemsBase.map((item) => {
    const monto = item.monto ?? 0;
    const reparto = calcularReparto(tipoReparto, monto);
    return {
      descripcion: item.descripcion || "Sin descripción",
      categoria_id: item.categoria_id || "",
      subcategoria_id: item.subcategoria_id || "",
      expresion_monto: item.expresionMonto || String(monto),
      monto_resuelto: monto,
      tipo_reparto: tipoReparto,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
      etiquetas_ids: [] as string[],
    };
  });

  const notas = [
    "Cargado desde chat IA",
    opciones.textoOriginal ? `Texto original: ${opciones.textoOriginal}` : null,
  ].filter(Boolean).join("\n");

  return {
    id: opciones.compraId,
    fecha: fechaLocalISO(),
    nombre_lugar: draft.lugar || "Sin especificar",
    notas,
    registrado_por: opciones.registradoPor,
    pagador_general: pagador,
    estado: "borrador",
    etiquetas_compra_ids: opciones.etiquetasCompraIds ?? [],
    items,
  };
}
