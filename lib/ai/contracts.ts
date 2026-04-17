import type { PagadorCompra, TipoReparto } from "@/types";

export type ModoRegistroIa = "rapido" | "completo";
export type FuenteRegistroIa = "deterministico" | "ia";
export type RegistroIaIntent = "crear_o_actualizar" | "corregir" | "pregunta";

export type CampoFaltanteRegistroIa =
  | "lugar"
  | "pagador"
  | "reparto"
  | "total"
  | "items"
  | "items_sin_monto";

export interface RegistroIaItem {
  id: string;
  descripcion: string;
  cantidad: number | null;
  expresionMonto: string | null;
  monto: number | null;
  categoria_id: string;
  subcategoria_id: string;
  fuente: FuenteRegistroIa;
}

export type RegistroIaCorrectionTargetType = "draft" | "item";
export type RegistroIaCorrectionField =
  | "lugar"
  | "pagador"
  | "reparto"
  | "total"
  | "descripcion"
  | "monto"
  | "cantidad"
  | "categoria_id"
  | "subcategoria_id";

export interface RegistroIaReplaceFieldOp {
  type: "replace_field";
  targetType: RegistroIaCorrectionTargetType;
  field: RegistroIaCorrectionField;
  targetItemId?: string;
  targetMatcher?: string;
  from?: string;
  to?: string | number | null;
}

export interface RegistroIaOperationItem {
  descripcion: string;
  cantidad?: number | null;
  monto?: number | null;
  expresionMonto?: string | null;
  categoria_id?: string;
  subcategoria_id?: string;
}

export interface RegistroIaAddItemOp {
  type: "add_item";
  item: RegistroIaOperationItem;
}

export interface RegistroIaRemoveItemOp {
  type: "remove_item";
  targetItemId?: string;
  targetMatcher?: string;
  from?: string;
}

export type RegistroIaCorrectionOp =
  | RegistroIaReplaceFieldOp
  | RegistroIaAddItemOp
  | RegistroIaRemoveItemOp;

export interface RegistroIaResolutionOption {
  id: string;
  label: string;
  targetItemId?: string;
}

export interface RegistroIaResolution {
  reason: string;
  field: RegistroIaCorrectionField;
  options: RegistroIaResolutionOption[];
}

export interface RegistroIaDraft {
  textoOriginal: string;
  fecha: string;
  lugar: string;
  pagador: PagadorCompra | null;
  reparto: TipoReparto | null;
  total: number | null;
  items: RegistroIaItem[];
  fuente: FuenteRegistroIa;
  confidence: number;
  warnings: string[];
}

export interface RegistroIaResultado {
  draft: RegistroIaDraft;
  faltantes: CampoFaltanteRegistroIa[];
  preguntaSiguiente: string | null;
  canSave: boolean;
}

export interface RegistroIaContexto {
  categorias: Array<{ id: string; nombre: string }>;
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>;
}

export interface RegistroIaError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface RegistroIaMeta {
  promptVersion?: string;
  retryCount?: number;
  latencyMs?: number;
  model?: string;
  sessionId?: string;
}
