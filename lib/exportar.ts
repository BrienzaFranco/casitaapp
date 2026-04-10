import * as XLSX from "xlsx";
import type { BalanceMensualFila, CategoriaBalance, Compra, EtiquetaBalance, ResumenBalance } from "@/types";

export function generarSheets(
  compras: Compra[],
  resumenMensual: ResumenBalance,
  historico: BalanceMensualFila[],
  categoriasMes: CategoriaBalance[],
  etiquetasMes: EtiquetaBalance[],
) {
  const hojaGastos = compras.flatMap((compra) =>
    compra.items.map((item) => ({
      id_compra: compra.id,
      fecha: compra.fecha,
      lugar: compra.nombre_lugar,
      categoria: item.categoria?.nombre ?? "",
      subcategoria: item.subcategoria?.nombre ?? "",
      descripcion: item.descripcion,
      expresion_monto: item.expresion_monto,
      monto: item.monto_resuelto,
      tipo_reparto: item.tipo_reparto,
      pago_franco: item.pago_franco,
      pago_fabiola: item.pago_fabiola,
      etiquetas: item.etiquetas.map((etiqueta) => etiqueta.nombre).join(", "),
    })),
  );

  const hojaResumenMensual = historico.map((fila) => ({
    mes: fila.mes,
    total: fila.total,
    franco: fila.franco,
    fabiola: fila.fabiola,
    balance: fila.balance,
    quien_debe: fila.deudor && fila.acreedor ? `${fila.deudor} -> ${fila.acreedor}` : "Sin deuda",
  }));

  hojaResumenMensual.unshift({
    mes: "seleccionado",
    total: resumenMensual.total,
    franco: resumenMensual.franco_pago,
    fabiola: resumenMensual.fabiola_pago,
    balance: resumenMensual.balance,
    quien_debe:
      resumenMensual.deudor && resumenMensual.acreedor
        ? `${resumenMensual.deudor} -> ${resumenMensual.acreedor}`
        : "Sin deuda",
  });

  const hojaCategoria = categoriasMes.flatMap((registro) => {
    if (!registro.subcategorias.length) {
      return [
        {
          categoria: registro.categoria.nombre,
          subcategoria: "",
          total_mes: registro.total,
          limite: registro.categoria.limite_mensual ?? "",
          porcentaje_usado: registro.porcentaje ?? "",
        },
      ];
    }

    return registro.subcategorias.map((subcategoria) => ({
      categoria: registro.categoria.nombre,
      subcategoria: subcategoria.subcategoria.nombre,
      total_mes: subcategoria.total,
      limite: subcategoria.subcategoria.limite_mensual ?? registro.categoria.limite_mensual ?? "",
      porcentaje_usado: subcategoria.porcentaje ?? registro.porcentaje ?? "",
    }));
  });

  const hojaEtiquetas = etiquetasMes.map((registro) => ({
    etiqueta: registro.etiqueta.nombre,
    total: registro.total,
    cantidad_items: registro.cantidad_items,
  }));

  return {
    Gastos: hojaGastos,
    "Resumen mensual": hojaResumenMensual,
    "Por categoria": hojaCategoria,
    Etiquetas: hojaEtiquetas,
  };
}

export function exportarExcel(
  compras: Compra[],
  resumenMensual: ResumenBalance,
  historico: BalanceMensualFila[],
  categoriasMes: CategoriaBalance[],
  etiquetasMes: EtiquetaBalance[],
  mesSeleccionado: string,
) {
  const libro = XLSX.utils.book_new();
  const hojas = generarSheets(compras, resumenMensual, historico, categoriasMes, etiquetasMes);

  for (const [nombre, filas] of Object.entries(hojas)) {
    const hoja = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(libro, hoja, nombre);
  }

  XLSX.writeFile(libro, `gastos_${mesSeleccionado || "historico"}.xlsx`);
}
