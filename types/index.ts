export type TipoReparto = "50/50" | "solo_franco" | "solo_fabiola" | "personalizado";

export interface Perfil {
  id: string;
  nombre: string | null;
  creado_en: string;
}

export interface Categoria {
  id: string;
  hogar_id: string | null;
  nombre: string;
  color: string;
  limite_mensual: number | null;
  creado_en: string;
}

export interface Subcategoria {
  id: string;
  categoria_id: string;
  nombre: string;
  limite_mensual: number | null;
  creado_en: string;
}

export interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
}

export interface ItemEtiquetaRelacion {
  etiqueta_id: string;
  etiquetas: Etiqueta | null;
}

export interface ItemBaseDatos {
  id: string;
  compra_id: string;
  hogar_id: string | null;
  categoria_id: string | null;
  subcategoria_id: string | null;
  descripcion: string | null;
  expresion_monto: string;
  monto_resuelto: number;
  tipo_reparto: TipoReparto;
  pago_franco: number;
  pago_fabiola: number;
  creado_en: string;
  categorias: Categoria | null;
  subcategorias: Subcategoria | null;
  item_etiquetas: ItemEtiquetaRelacion[];
}

export interface Item {
  id: string;
  compra_id: string;
  hogar_id: string | null;
  categoria_id: string | null;
  subcategoria_id: string | null;
  descripcion: string;
  expresion_monto: string;
  monto_resuelto: number;
  tipo_reparto: TipoReparto;
  pago_franco: number;
  pago_fabiola: number;
  creado_en: string;
  categoria: Categoria | null;
  subcategoria: Subcategoria | null;
  etiquetas: Etiqueta[];
}

export interface CompraBaseDatos {
  id: string;
  fecha: string;
  hogar_id: string | null;
  nombre_lugar: string | null;
  notas: string | null;
  registrado_por: string;
  creado_en: string;
  items: ItemBaseDatos[];
}

export interface Compra {
  id: string;
  fecha: string;
  hogar_id: string | null;
  nombre_lugar: string;
  notas: string;
  registrado_por: string;
  creado_en: string;
  items: Item[];
}

export interface ItemEditable {
  id?: string;
  descripcion: string;
  categoria_id: string;
  subcategoria_id: string;
  expresion_monto: string;
  monto_resuelto: number;
  tipo_reparto: TipoReparto;
  pago_franco: number;
  pago_fabiola: number;
  etiquetas_ids: string[];
}

export interface CompraEditable {
  id?: string;
  fecha: string;
  nombre_lugar: string;
  notas: string;
  registrado_por: string;
  hogar_id?: string | null;
  items: ItemEditable[];
}

export interface ResumenBalance {
  total: number;
  franco_pago: number;
  fabiola_pago: number;
  franco_corresponde: number;
  fabiola_corresponde: number;
  balance: number;
  deudor: string | null;
  acreedor: string | null;
}

export interface BalanceMensualFila {
  mes: string;
  total: number;
  franco: number;
  fabiola: number;
  balance: number;
  deudor: string | null;
  acreedor: string | null;
}

export interface CategoriaBalance {
  categoria: Categoria;
  total: number;
  porcentaje: number | null;
  subcategorias: Array<{
    subcategoria: Subcategoria;
    total: number;
    porcentaje: number | null;
  }>;
}

export interface EtiquetaBalance {
  etiqueta: Etiqueta;
  total: number;
  cantidad_items: number;
}

export interface DiaGasto {
  fecha: string;
  total: number;
}

export interface FiltrosHistorial {
  mes: string;
  categoria_id: string;
  etiqueta_id: string;
}

export interface DatosImportados {
  fecha: string;
  nombre_lugar: string;
  categoria: string;
  subcategoria: string;
  descripcion: string;
  expresion_monto: string;
  monto: number;
  tipo_reparto: TipoReparto;
  pago_franco: number;
  pago_fabiola: number;
  etiquetas: string[];
}
