import { evaluate } from "mathjs";
import { mesClave, normalizarTexto, nombreLegible } from "@/lib/utiles";
import type {
  BalanceMensualFila,
  Categoria,
  CategoriaBalance,
  Compra,
  DiaGasto,
  Etiqueta,
  EtiquetaBalance,
  PuntoTendenciaDiaria,
  ResumenBalance,
  Subcategoria,
  TipoReparto,
  VariacionPeriodo,
} from "@/types";

function asegurarNumero(valor: number) {
  return Number.isFinite(valor) ? Number(valor) : 0;
}

export function evaluarExpresion(expresion: string) {
  const saneada = expresion.replace(",", ".").replace(/\s+/g, "");

  if (!/^[\d+\-*/().]+$/.test(saneada)) {
    throw new Error("La expresion contiene caracteres invalidos.");
  }

  const resultado = evaluate(saneada);

  if (typeof resultado !== "number" || Number.isNaN(resultado)) {
    throw new Error("La expresion no pudo resolverse.");
  }

  return Number(resultado.toFixed(2));
}

export function calcularReparto(
  tipoReparto: TipoReparto,
  monto: number,
  pagoFrancoPersonalizado = 0,
  pagoFabiolaPersonalizado = 0,
) {
  const valor = asegurarNumero(monto);

  if (tipoReparto === "solo_franco") {
    return { pago_franco: valor, pago_fabiola: 0 };
  }

  if (tipoReparto === "solo_fabiola") {
    return { pago_franco: 0, pago_fabiola: valor };
  }

  if (tipoReparto === "personalizado") {
    return {
      pago_franco: asegurarNumero(pagoFrancoPersonalizado),
      pago_fabiola: asegurarNumero(pagoFabiolaPersonalizado),
    };
  }

  const mitad = Number((valor / 2).toFixed(2));
  return { pago_franco: mitad, pago_fabiola: Number((valor - mitad).toFixed(2)) };
}

export function totalCompra(compra: Compra) {
  return compra.items.reduce((acumulado, item) => acumulado + item.monto_resuelto, 0);
}

export function calcularBalance(compras: Compra[], nombres = { franco: "Franco", fabiola: "Fabiola" }): ResumenBalance {
  let total = 0;
  let francoPagoReal = 0;
  let fabiolaPagoReal = 0;
  let francoCorresponde = 0;
  let fabiolaCorresponde = 0;

  for (const compra of compras) {
    for (const item of compra.items) {
      total += item.monto_resuelto;
      // A quien le corresponde (segun tipo_reparto del item)
      francoCorresponde += item.pago_franco;
      fabiolaCorresponde += item.pago_fabiola;

      // Quien pago realmente (segun pagador_general de la compra)
      if (compra.pagador_general === "franco") {
        francoPagoReal += item.monto_resuelto;
      } else if (compra.pagador_general === "fabiola") {
        fabiolaPagoReal += item.monto_resuelto;
      } else {
        // compartido: se divide segun el reparto del item
        francoPagoReal += item.pago_franco;
        fabiolaPagoReal += item.pago_fabiola;
      }
    }
  }

  // Balance: lo que Franco pago menos lo que le corresponde
  const balance = Number((francoPagoReal - francoCorresponde).toFixed(2));

  if (balance > 0.01) {
    // Franco pago de mas → Fabiola le debe
    return {
      total,
      franco_pago: francoPagoReal,
      fabiola_pago: fabiolaPagoReal,
      franco_corresponde: francoCorresponde,
      fabiola_corresponde: fabiolaCorresponde,
      balance,
      deudor: nombres.fabiola,
      acreedor: nombres.franco,
    };
  }

  if (balance < -0.01) {
    // Franco pago de menos → Franco le debe
    return {
      total,
      franco_pago: francoPagoReal,
      fabiola_pago: fabiolaPagoReal,
      franco_corresponde: francoCorresponde,
      fabiola_corresponde: fabiolaCorresponde,
      balance,
      deudor: nombres.franco,
      acreedor: nombres.fabiola,
    };
  }

  return {
    total,
    franco_pago: francoPagoReal,
    fabiola_pago: fabiolaPagoReal,
    franco_corresponde: francoCorresponde,
    fabiola_corresponde: fabiolaCorresponde,
    balance: 0,
    deudor: null,
    acreedor: null,
  };
}

export function construirBalanceHistorico(compras: Compra[], nombres = { franco: "Franco", fabiola: "Fabiola" }) {
  const porMes = new Map<string, Compra[]>();

  for (const compra of compras) {
    const clave = mesClave(compra.fecha);
    const actuales = porMes.get(clave) ?? [];
    actuales.push(compra);
    porMes.set(clave, actuales);
  }

  return [...porMes.entries()]
    .sort(([mesA], [mesB]) => mesA.localeCompare(mesB))
    .map(([mes, comprasDelMes]) => {
      const resumen = calcularBalance(comprasDelMes, nombres);
      return {
        mes,
        total: resumen.total,
        franco: resumen.franco_pago,
        fabiola: resumen.fabiola_pago,
        balance: resumen.balance,
        deudor: resumen.deudor,
        acreedor: resumen.acreedor,
      } satisfies BalanceMensualFila;
    });
}

export function calcularCategoriasMes(
  compras: Compra[],
  categorias: Categoria[],
  subcategorias: Subcategoria[],
) {
  const acumulado = new Map<string, { total: number; subcategorias: Map<string, number> }>();

  for (const compra of compras) {
    for (const item of compra.items) {
      if (!item.categoria_id) {
        continue;
      }

      const registro = acumulado.get(item.categoria_id) ?? {
        total: 0,
        subcategorias: new Map<string, number>(),
      };

      registro.total += item.monto_resuelto;

      if (item.subcategoria_id) {
        registro.subcategorias.set(
          item.subcategoria_id,
          (registro.subcategorias.get(item.subcategoria_id) ?? 0) + item.monto_resuelto,
        );
      }

      acumulado.set(item.categoria_id, registro);
    }
  }

  const registros = categorias
    .map((categoria) => {
      const registro = acumulado.get(categoria.id);

      if (!registro) {
        return null;
      }

      return {
        categoria,
        es_fijo: categoria.es_fijo ?? false,
        total: registro.total,
        porcentaje: categoria.limite_mensual
          ? (registro.total / Number(categoria.limite_mensual)) * 100
          : null,
        subcategorias: subcategorias
          .filter((subcategoria) => subcategoria.categoria_id === categoria.id)
          .map((subcategoria) => {
            const total = registro.subcategorias.get(subcategoria.id) ?? 0;
            return {
              subcategoria,
              total,
              porcentaje: subcategoria.limite_mensual
                ? (total / Number(subcategoria.limite_mensual)) * 100
                : null,
            };
          })
          .filter((subcategoria) => subcategoria.total > 0),
      } satisfies CategoriaBalance;
    })
    .filter((valor): valor is CategoriaBalance => Boolean(valor));

  return registros.sort((a, b) => b.total - a.total);
}

export function calcularEtiquetasMes(compras: Compra[], etiquetas: Etiqueta[]) {
  const acumulado = new Map<string, EtiquetaBalance>();

  for (const compra of compras) {
    for (const item of compra.items) {
      for (const etiqueta of item.etiquetas) {
        const registro = acumulado.get(etiqueta.id) ?? {
          etiqueta,
          total: 0,
          cantidad_items: 0,
        };

        registro.total += item.monto_resuelto;
        registro.cantidad_items += 1;
        acumulado.set(etiqueta.id, registro);
      }
    }
  }

  const registros = etiquetas
    .map((etiqueta) => acumulado.get(etiqueta.id))
    .filter((valor): valor is EtiquetaBalance => Boolean(valor));

  return registros.sort((a, b) => b.total - a.total);
}

export function calcularDiasMasGasto(compras: Compra[]) {
  const acumulado = new Map<string, number>();

  for (const compra of compras) {
    acumulado.set(compra.fecha, (acumulado.get(compra.fecha) ?? 0) + totalCompra(compra));
  }

  return [...acumulado.entries()]
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5) as DiaGasto[];
}

export function filtrarComprasPorMes(compras: Compra[], mes: string) {
  if (!mes) {
    return compras;
  }

  return compras.filter((compra) => mesClave(compra.fecha) === mes);
}

export function filtrarComprasDesdeFechaExclusiva(compras: Compra[], fechaCorte: string | null | undefined) {
  if (!fechaCorte) {
    return compras;
  }

  return compras.filter((compra) => compra.fecha > fechaCorte);
}

export function obtenerMesAnterior(mes: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return "";
  }

  const [anioTexto, mesTexto] = mes.split("-");
  const anio = Number(anioTexto);
  const numeroMes = Number(mesTexto);

  if (!Number.isFinite(anio) || !Number.isFinite(numeroMes) || numeroMes < 1 || numeroMes > 12) {
    return "";
  }

  const fecha = new Date(anio, numeroMes - 2, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

export function calcularVariacionPeriodo(actual: number, anterior: number): VariacionPeriodo {
  const valorActual = asegurarNumero(actual);
  const valorAnterior = asegurarNumero(anterior);
  const diferencia = Number((valorActual - valorAnterior).toFixed(2));
  const porcentaje = valorAnterior > 0 ? Number(((diferencia / valorAnterior) * 100).toFixed(2)) : null;

  return {
    actual: valorActual,
    anterior: valorAnterior,
    diferencia,
    porcentaje,
  };
}

export function calcularSerieGastoDiario(compras: Compra[]) {
  const acumulado = new Map<string, number>();

  for (const compra of compras) {
    acumulado.set(compra.fecha, (acumulado.get(compra.fecha) ?? 0) + totalCompra(compra));
  }

  return [...acumulado.entries()]
    .map(([fecha, total]) => ({
      fecha,
      total,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha)) as PuntoTendenciaDiaria[];
}

/**
 * Calculates cumulative (running total) spending by day of month for two months.
 * Returns an array of 31 entries (one per day), each with accumulated totals
 * for both the current and previous month.
 */
export function calcularGastoAcumuladoDia(
  comprasMesActual: Compra[],
  comprasMesAnterior: Compra[],
): Array<{ dia: number; acumuladoActual: number; acumuladoAnterior: number }> {
  // Accumulate by day for current month
  const porDiaActual = new Map<number, number>();
  for (const compra of comprasMesActual) {
    const dia = new Date(`${compra.fecha}T00:00:00`).getDate();
    porDiaActual.set(dia, (porDiaActual.get(dia) ?? 0) + totalCompra(compra));
  }

  // Accumulate by day for previous month
  const porDiaAnterior = new Map<number, number>();
  for (const compra of comprasMesAnterior) {
    const dia = new Date(`${compra.fecha}T00:00:00`).getDate();
    porDiaAnterior.set(dia, (porDiaAnterior.get(dia) ?? 0) + totalCompra(compra));
  }

  // Build cumulative arrays for both months
  const acumuladoActual = new Map<number, number>();
  const acumuladoAnterior = new Map<number, number>();

  let runningActual = 0;
  let runningAnterior = 0;
  for (let dia = 1; dia <= 31; dia++) {
    runningActual += porDiaActual.get(dia) ?? 0;
    runningAnterior += porDiaAnterior.get(dia) ?? 0;
    acumuladoActual.set(dia, Number(runningActual.toFixed(2)));
    acumuladoAnterior.set(dia, Number(runningAnterior.toFixed(2)));
  }

  return Array.from({ length: 31 }, (_, i) => ({
    dia: i + 1,
    acumuladoActual: acumuladoActual.get(i + 1) ?? 0,
    acumuladoAnterior: acumuladoAnterior.get(i + 1) ?? 0,
  }));
}

export function filtrarComprasHistorial(
  compras: Compra[],
  filtros: {
    mes?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    categoria_id?: string;
    etiqueta_id?: string;
    etiqueta_compra_id?: string;
    persona?: "franco" | "fabiola" | null;
  },
) {
  return compras.filter((compra) => {
    const coincideMes = filtros.mes ? mesClave(compra.fecha) === filtros.mes : true;
    const coincideFechaDesde = filtros.fecha_desde ? compra.fecha >= filtros.fecha_desde : true;
    const coincideFechaHasta = filtros.fecha_hasta ? compra.fecha <= filtros.fecha_hasta : true;
    const coincideCategoria = filtros.categoria_id
      ? compra.items.some((item) => item.categoria_id === filtros.categoria_id)
      : true;
    const coincideEtiqueta = filtros.etiqueta_id
      ? compra.items.some((item) => item.etiquetas.some((etiqueta) => etiqueta.id === filtros.etiqueta_id))
      : true;
    const coincideEtiquetaCompra = filtros.etiqueta_compra_id
      ? compra.etiquetas_compra.some((etiqueta) => etiqueta.id === filtros.etiqueta_compra_id)
      : true;
    const coincidePersona = filtros.persona
      ? compra.pagador_general === filtros.persona
      : true;

    return coincideMes && coincideFechaDesde && coincideFechaHasta && coincideCategoria && coincideEtiqueta && coincideEtiquetaCompra && coincidePersona;
  });
}

export function obtenerCategoriasUsadas(compra: Compra) {
  const mapa = new Map<string, string>();

  for (const item of compra.items) {
    if (item.categoria?.id) {
      mapa.set(item.categoria.id, item.categoria.nombre);
    }
  }

  return [...mapa.values()];
}

export function colorProgreso(porcentaje: number | null) {
  if (porcentaje === null) {
    return "bg-gray-300";
  }

  if (porcentaje < 60) {
    return "bg-green-500";
  }

  if (porcentaje <= 80) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

export function deducirNombresParticipantes(perfiles: Array<{ nombre: string | null }>) {
  const nombres = perfiles
    .map((perfil) => perfil.nombre?.trim())
    .filter(Boolean) as string[];

  const francoRaw = nombres.find((nombre) => normalizarTexto(nombre).includes("franco")) ?? nombres[0] ?? "Franco";
  const fabiolaRaw = nombres.find((nombre) => normalizarTexto(nombre).includes("fabiola")) ?? nombres[1] ?? "Fabiola";

  const franco = nombreLegible(francoRaw);
  const fabiola = nombreLegible(fabiolaRaw);

  return { franco, fabiola };
}

/**
 * Analiza la deuda por categoria/subcategoria.
 * Calcula quien debe a quien basandose en quien pago vs a quien corresponde.
 */
export interface DeudaPorCategoria {
  categoria: string;
  color: string;
  subcategorias: { nombre: string; francoDebe: number; fabiolaDebe: number }[];
  totalFrancoDebe: number;
  totalFabiolaDebe: number;
  compras: Array<{ id: string; fecha: string; lugar: string; items: Array<{ descripcion: string; monto: number }> }>;
}

/**
 * Calcula la deuda de un item segun quien pago vs a quien corresponde.
 *
 * pagador_general = quien EFECTIVAMENTE puso la plata
 * tipo_reparto = a quien CORRESPONDE pagar
 *
 * Franco pago + corresponde a Fabiola → Fabiola le debe a Franco
 * Fabiola pago + corresponde a Franco → Franco le debe a Fabiola
 * Compartido + corresponde a Franco → Franco ya puso mitad, debe la otra mitad a Fabiola
 */
function calcularDeudaItem(
  pagador: "franco" | "fabiola" | "compartido",
  tipoReparto: TipoReparto,
  monto: number,
  pagoFranco: number,
  pagoFabiola: number,
): { francoLeDebeAFabiola: number; fabiolaLeDebeAFranco: number } {
  let francoLeDebeAFabiola = 0;
  let fabiolaLeDebeAFranco = 0;

  if (pagador === "franco") {
    // Franco puso la plata
    if (tipoReparto === "solo_fabiola") {
      fabiolaLeDebeAFranco = monto; // Fabiola deberia pagar todo
    } else if (tipoReparto === "50/50") {
      fabiolaLeDebeAFranco = pagoFabiola; // Fabiola deberia pagar su mitad
    }
    // solo_franco: Franco puso, es para Franco → nadie debe
  } else if (pagador === "fabiola") {
    // Fabiola puso la plata
    if (tipoReparto === "solo_franco") {
      francoLeDebeAFabiola = monto; // Franco deberia pagar todo
    } else if (tipoReparto === "50/50") {
      francoLeDebeAFabiola = pagoFranco; // Franco deberia pagar su mitad
    }
    // solo_fabiola: Fabiola puso, es para Fabiola → nadie debe
  } else {
    // compartido: ambos pusieron la mitad del total
    // Cada uno ya pago el 50% de cada item
    if (tipoReparto === "solo_franco") {
      // Franco deberia pagar todo pero solo puso la mitad → debe la otra mitad a Fabiola
      francoLeDebeAFabiola = monto * 0.5;
    } else if (tipoReparto === "solo_fabiola") {
      // Fabiola deberia pagar todo pero solo puso la mitad → debe la otra mitad a Franco
      fabiolaLeDebeAFranco = monto * 0.5;
    }
    // 50/50 + compartido: ambos pusieron mitad, ambos deben mitad → balancea
  }

  return { francoLeDebeAFabiola, fabiolaLeDebeAFranco };
}

export function analizarDeudaPorCategoria(
  compras: Compra[],
): DeudaPorCategoria[] {
  const mapa = new Map<string, DeudaPorCategoria>();

  for (const compra of compras) {
    if (compra.estado === "borrador") continue;

    for (const item of compra.items) {
      const catNombre = item.categoria?.nombre ?? "Sin categoria";
      const catColor = item.categoria?.color ?? "#6b7280";
      const subNombre = item.subcategoria?.nombre ?? "";

      if (!mapa.has(catNombre)) {
        mapa.set(catNombre, {
          categoria: catNombre,
          color: catColor,
          subcategorias: [],
          totalFrancoDebe: 0,
          totalFabiolaDebe: 0,
          compras: [],
        });
      }

      const cat = mapa.get(catNombre)!;
      const deuda = calcularDeudaItem(
        compra.pagador_general,
        item.tipo_reparto,
        item.monto_resuelto,
        item.pago_franco,
        item.pago_fabiola,
      );

      cat.totalFrancoDebe += deuda.francoLeDebeAFabiola;
      cat.totalFabiolaDebe += deuda.fabiolaLeDebeAFranco;

      const sub = cat.subcategorias.find(s => s.nombre === subNombre);
      if (sub) {
        sub.francoDebe += deuda.francoLeDebeAFabiola;
        sub.fabiolaDebe += deuda.fabiolaLeDebeAFranco;
      } else if (subNombre) {
        cat.subcategorias.push({ nombre: subNombre, francoDebe: deuda.francoLeDebeAFabiola, fabiolaDebe: deuda.fabiolaLeDebeAFranco });
      }

      const compraExistente = cat.compras.find(c => c.id === compra.id);
      if (!compraExistente) {
        cat.compras.push({
          id: compra.id,
          fecha: compra.fecha,
          lugar: compra.nombre_lugar || "Sin lugar",
          items: [{ descripcion: item.descripcion || "", monto: item.monto_resuelto }],
        });
      } else {
        compraExistente.items.push({ descripcion: item.descripcion || "", monto: item.monto_resuelto });
      }
    }
  }

  return [...mapa.values()].filter(c => c.totalFrancoDebe > 0.01 || c.totalFabiolaDebe > 0.01);
}
