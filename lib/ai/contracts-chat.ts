import type { PagadorCompra, TipoReparto } from "@/types";

// ─── Intents del chat global ───────────────────────────────────────
export type ChatIntent = "consulta" | "registro" | "edicion" | "analisis" | "conversacion";

// ─── Tools de datos disponibles ────────────────────────────────────
export type ToolName =
  | "gastos_por_categoria"
  | "gastos_por_mes"
  | "compras_recientes"
  | "balance_actual"
  | "presupuesto_status"
  | "top_gastos"
  | "buscar_compras";

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

export interface ParamsBuscarCompras {
  texto: string;
  limite?: number;
}

export type ToolParams =
  | ParamsGastosPorCategoria
  | ParamsGastosPorMes
  | ParamsComprasRecientes
  | ParamsBalanceActual
  | ParamsPresupuestoStatus
  | ParamsTopGastos
  | ParamsBuscarCompras;

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
export interface ChatResponse {
  intent: ChatIntent;
  answer: string;
  toolResults?: ToolResult[];
  draftPatch?: ChatDraftPatch;
  operations?: unknown[];
  resolution?: unknown;
  warnings?: string[];
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
  context?: {
    categorias?: Array<{ id: string; nombre: string }>;
    subcategorias?: Array<{ id: string; categoria_id: string; nombre: string }>;
  };
}
