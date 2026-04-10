import { evaluate } from "mathjs";
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
import { mesClave, normalizarTexto } from "@/lib/utiles";

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
  let francoPago = 0;
  let fabiolaPago = 0;

  for (const compra of compras) {
    for (const item of compra.items) {
      total += item.monto_resuelto;
      francoPago += item.pago_franco;
      fabiolaPago += item.pago_fabiola;
    }
  }

  const francoCorresponde = total / 2;
  const fabiolaCorresponde = total / 2;
  const balance = Number((francoPago - francoCorresponde).toFixed(2));

  if (balance > 0) {
    return {
      total,
      franco_pago: francoPago,
      fabiola_pago: fabiolaPago,
      franco_corresponde: francoCorresponde,
      fabiola_corresponde: fabiolaCorresponde,
      balance,
      deudor: nombres.fabiola,
      acreedor: nombres.franco,
    };
  }

  if (balance < 0) {
    return {
      total,
      franco_pago: francoPago,
      fabiola_pago: fabiolaPago,
      franco_corresponde: francoCorresponde,
      fabiola_corresponde: fabiolaCorresponde,
      balance,
      deudor: nombres.franco,
      acreedor: nombres.fabiola,
    };
  }

  return {
    total,
    franco_pago: francoPago,
    fabiola_pago: fabiolaPago,
    franco_corresponde: francoCorresponde,
    fabiola_corresponde: fabiolaCorresponde,
    balance,
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

export function filtrarComprasHistorial(
  compras: Compra[],
  filtros: {
    mes?: string;
    categoria_id?: string;
    etiqueta_id?: string;
    etiqueta_compra_id?: string;
    persona?: "franco" | "fabiola" | null;
  },
) {
  return compras.filter((compra) => {
    const coincideMes = filtros.mes ? mesClave(compra.fecha) === filtros.mes : true;
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
      ? compra.items.some((item) =>
          filtros.persona === "franco" ? item.pago_franco > 0 : item.pago_fabiola > 0,
        )
      : true;

    return coincideMes && coincideCategoria && coincideEtiqueta && coincideEtiquetaCompra && coincidePersona;
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

  const franco = nombres.find((nombre) => normalizarTexto(nombre).includes("franco")) ?? nombres[0] ?? "Franco";
  const fabiola = nombres.find((nombre) => normalizarTexto(nombre).includes("fabiola")) ?? nombres[1] ?? "Fabiola";

  return { franco, fabiola };
}
