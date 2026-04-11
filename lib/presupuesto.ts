import type { Categoria, ItemEditable } from "@/types";

export interface AlertaPresupuesto {
  categoria: string;
  color: string;
  limite: number;
  gastado: number;
  porcentaje: number;
  tipo: "advertencia" | "excedido";
}

/**
 * Verifica si al agregar estos items se supera el limite de alguna categoria.
 * Devuelve alertas para cada categoria que este cerca o haya superado el limite.
 */
export function verificarLimites(
  items: ItemEditable[],
  categorias: Categoria[],
): AlertaPresupuesto[] {
  const alertas: AlertaPresupuesto[] = [];

  // Calcular gasto por categoria en este mes (items confirmados + nuevos)
  const gastoPorCategoria = new Map<string, number>();
  for (const item of items) {
    if (item.categoria_id && item.monto_resuelto > 0) {
      gastoPorCategoria.set(
        item.categoria_id,
        (gastoPorCategoria.get(item.categoria_id) ?? 0) + item.monto_resuelto,
      );
    }
  }

  for (const cat of categorias) {
    if (!cat.limite_mensual || cat.limite_mensual <= 0) continue;

    const gastado = gastoPorCategoria.get(cat.id) ?? 0;
    const porcentaje = (gastado / cat.limite_mensual) * 100;

    if (porcentaje >= 100) {
      alertas.push({
        categoria: cat.nombre,
        color: cat.color,
        limite: cat.limite_mensual,
        gastado,
        porcentaje,
        tipo: "excedido",
      });
    } else if (porcentaje >= 80) {
      alertas.push({
        categoria: cat.nombre,
        color: cat.color,
        limite: cat.limite_mensual,
        gastado,
        porcentaje,
        tipo: "advertencia",
      });
    }
  }

  return alertas;
}
