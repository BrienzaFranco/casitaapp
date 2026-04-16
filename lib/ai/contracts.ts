import type { PagadorCompra } from "@/types";

export type ModoRegistroIa = "rapido" | "completo";
export type FuenteRegistroIa = "deterministico" | "ia";
export type RegistroIaIntent = "crear_o_actualizar" | "corregir" | "pregunta";

export type CampoFaltanteRegistroIa =
  | "lugar"
  | "pagador"
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
  | "total"
  | "descripcion"
  | "monto"
  | "cantidad"
  | "categoria_id"
  | "subcategoria_id";

export interface RegistroIaCorrectionOp {
  type: "replace_field";
  targetType: RegistroIaCorrectionTargetType;
  field: RegistroIaCorrectionField;
  targetItemId?: string;
  targetMatcher?: string;
  from?: string;
  to?: string | number | null;
}

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
