import type { Compra, CategoriaBalance, BalanceMensualFila } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";

// ─── Types ──────────────────────────────────────────────────────────────────

export type InsightTipo = "warning" | "positive" | "info" | "anomaly";

export interface Insight {
  tipo: InsightTipo;
  titulo: string;
  detalle: string;
  accion?: { label: string; onClick: () => void };
  valor?: number; // para ordenar por severity
}

// ─── Input data para generarInsights ────────────────────────────────────────

export interface DatosInsights {
  categoriasConLimite: CategoriaBalance[];
  totalGastado: number;
  presupuestoTotal: number;
  diffProyeccion: number;
  proyeccionFinMes: number;
  variacionDiaria: number;
  mesAnteriorKey: string | null;
  totalMesAnterior: number;
  deudor: string | null;
  acreedor: string | null;
  saldoAbiertoBalance: number;
  numBorradores: number;
  totalBorradores: number;
  comprasMes: Compra[];
  resumenHistorico: BalanceMensualFila[];
  diasDelMes: number;
  diaDelMes: number;
}

// ─── Pure function ──────────────────────────────────────────────────────────

export function generarInsights(data: DatosInsights): Insight[] {
  const list: Insight[] = [];

  // ── WARNINGS ──

  // 1. Categoría excedida
  const excedidas = data.categoriasConLimite.filter((c) => (c.porcentaje ?? 0) > 100);
  for (const cat of excedidas) {
    const excedido = cat.total - Number(cat.categoria.limite_mensual);
    list.push({
      tipo: "warning",
      titulo: `${cat.categoria.nombre} excedida`,
      detalle: `Superó el límite en ${formatearPeso(excedido)} (${formatearPorcentaje(cat.porcentaje ?? 0)} del presupuesto).`,
      valor: cat.porcentaje ?? 0,
    });
  }

  // 2. Ritmo peligroso (proyección sobre presupuesto)
  if (data.diffProyeccion > 0 && excedidas.length === 0) {
    list.push({
      tipo: "warning",
      titulo: "Ritmo de gasto acelerado",
      detalle: `A este ritmo, el mes cierra ${formatearPeso(data.diffProyeccion)} sobre el presupuesto proyectado de ${formatearPeso(data.proyeccionFinMes)}.`,
      valor: data.diffProyeccion,
    });
  }

  // 3. Categoría con aceleración brusca vs mes anterior
  // (Derivamos comparando gasto actual vs anterior por categoría)
  // This requires additional data we'll pass in; for now we use what's available.
  // If a category has 3x+ increase (placeholder logic — needs catHistorico data)
  // Skip for now since we don't have per-category previous month totals here.

  // 4. Día más caro inusual (concentró >50% del gasto del mes)
  if (data.comprasMes.length > 0) {
    const porDia = new Map<string, number>();
    for (const compra of data.comprasMes) {
      for (const item of compra.items) {
        porDia.set(compra.fecha, (porDia.get(compra.fecha) ?? 0) + item.monto_resuelto);
      }
    }
    let maxDia = "";
    let maxDiaTotal = 0;
    for (const [dia, total] of porDia.entries()) {
      if (total > maxDiaTotal) {
        maxDiaTotal = total;
        maxDia = dia;
      }
    }
    const pctDelMes = data.totalGastado > 0 ? (maxDiaTotal / data.totalGastado) * 100 : 0;
    if (pctDelMes > 40 && data.comprasMes.length > 3) {
      const diaNum = new Date(`${maxDia}T00:00:00`).getDate();
      list.push({
        tipo: "anomaly",
        titulo: "Día atípico",
        detalle: `El día ${diaNum} concentró ${formatearPorcentaje(Math.round(pctDelMes))} del gasto total del mes (${formatearPeso(maxDiaTotal)} en un solo día).`,
        valor: pctDelMes,
      });
    }
  }

  // 5. Muchos borradores
  if (data.numBorradores > 0) {
    list.push({
      tipo: "info",
      titulo: "Borradores pendientes",
      detalle: `Tenés ${data.numBorradores} ${data.numBorradores === 1 ? "compra sin confirmar" : "compras sin confirmar"} que suman ${formatearPeso(data.totalBorradores)}.`,
      valor: data.totalBorradores,
    });
  }

  // ── POSITIVES ──

  // 6. Categoría mejoró vs mes anterior
  // (Necesitaríamos per-category previous data — skip for now, handled in drawer)

  // 7. Bajo promedio diario
  if (data.variacionDiaria < -15 && data.totalMesAnterior > 0) {
    list.push({
      tipo: "positive",
      titulo: "Buen ritmo de gasto",
      detalle: `El gasto diario bajó un ${formatearPorcentaje(Math.abs(Math.round(data.variacionDiaria)))} respecto al mes anterior. Buen control.`,
      valor: Math.abs(data.variacionDiaria),
    });
  }

  // 8. Mes más barato en 6 meses
  if (data.resumenHistorico.length >= 2) {
    const ultimos6 = data.resumenHistorico.slice(-6);
    const mesActual = ultimos6.find((m) => m.mes === data.mesAnteriorKey);
    // We compare current month partial vs full previous months
    const minPrevio = Math.min(...ultimos6.map((m) => m.total));
    const parcialActual = data.totalGastado;
    // Only flag if we're past mid-month and still below the cheapest full month
    if (data.diaDelMes > data.diasDelMes * 0.5 && parcialActual < minPrevio * 0.8) {
      list.push({
        tipo: "positive",
        titulo: "Mes económico",
        detalle: `Este va a ser tu mes más barato en ${ultimos6.length} meses. Llevás ${formatearPeso(parcialActual)} vs el mínimo anterior de ${formatearPeso(minPrevio)}.`,
        valor: minPrevio - parcialActual,
      });
    }
  }

  // 9. Balance al día
  if (!data.deudor && data.saldoAbiertoBalance === 0) {
    list.push({
      tipo: "positive",
      titulo: "Sin deuda",
      detalle: "El balance está al día entre los dos.",
      valor: 0,
    });
  }

  // ── INFORMATIVOS ──

  // 10. Etiqueta activa (if filters applied — shown when relevant)
  // This is context-dependent, handled in page.tsx

  // 11. Mejor día de la semana
  if (data.comprasMes.length > 5) {
    const porDiaSemana = new Map<number, number>();
    const diasNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    for (const compra of data.comprasMes) {
      const fecha = new Date(`${compra.fecha}T00:00:00`);
      const diaSemana = fecha.getDay();
      const totalDia = compra.items.reduce((a, i) => a + i.monto_resuelto, 0);
      porDiaSemana.set(diaSemana, (porDiaSemana.get(diaSemana) ?? 0) + totalDia);
    }
    // Count occurrences per day of week
    const conteoPorDia = new Map<number, number>();
    for (const compra of data.comprasMes) {
      const diaSemana = new Date(`${compra.fecha}T00:00:00`).getDay();
      conteoPorDia.set(diaSemana, (conteoPorDia.get(diaSemana) ?? 0) + 1);
    }
    // Calculate average per day of week
    let mejorDia = -1;
    let mejorPromedio = 0;
    for (const [dia, total] of porDiaSemana.entries()) {
      const conteo = conteoPorDia.get(dia) ?? 1;
      const promedio = total / conteo;
      if (promedio > mejorPromedio) {
        mejorPromedio = promedio;
        mejorDia = dia;
      }
    }
    if (mejorDia >= 0 && porDiaSemana.size > 1) {
      // Find the cheapest day
      let peorDia = -1;
      let peorPromedio = Infinity;
      for (const [dia, total] of porDiaSemana.entries()) {
        const conteo = conteoPorDia.get(dia) ?? 1;
        const promedio = total / conteo;
        if (promedio < peorPromedio) {
          peorPromedio = promedio;
          peorDia = dia;
        }
      }
      if (peorDia >= 0 && mejorPromedio > peorPromedio * 1.5) {
        list.push({
          tipo: "info",
          titulo: "Patrón semanal",
          detalle: `Los ${diasNombres[mejorDia]} gastan en promedio ${formatearPeso(Math.round(mejorPromedio))}, ${mejorPromedio > peorPromedio * 2 ? "más del doble" : "más"} que los ${diasNombres[peorDia]}.`,
          valor: mejorPromedio,
        });
      }
    }
  }

  // 12. Compra más grande del mes
  if (data.comprasMes.length > 0) {
    let mayorCompra: Compra | null = null;
    let mayorMonto = 0;
    for (const compra of data.comprasMes) {
      const total = compra.items.reduce((a, i) => a + i.monto_resuelto, 0);
      if (total > mayorMonto) {
        mayorMonto = total;
        mayorCompra = compra;
      }
    }
    if (mayorCompra && mayorMonto > 0) {
      list.push({
        tipo: "info",
        titulo: "Compra más grande",
        detalle: `La compra más grande del mes fue ${formatearPeso(mayorMonto)} en "${mayorCompra.nombre_lugar || "sin lugar"}".`,
        valor: mayorMonto,
      });
    }
  }

  // 13. Racha sin gastos grandes (umbral derivado del promedio histórico)
  const promedioHistoricoMensual = data.resumenHistorico.length > 0
    ? data.resumenHistorico.reduce((a, m) => a + m.total, 0) / data.resumenHistorico.length
    : 0;
  const promedioDiarioHistorico = promedioHistoricoMensual > 0 ? promedioHistoricoMensual / 30 : 0;
  const umbralGastoGrande = Math.round(promedioDiarioHistorico * 3);

  if (umbralGastoGrande > 0 && data.comprasMes.length > 0) {
    // Find the last day with a big expense
    let ultimoDiaGrande = 0;
    for (const compra of data.comprasMes) {
      const total = compra.items.reduce((a, i) => a + i.monto_resuelto, 0);
      if (total >= umbralGastoGrande) {
        const dia = new Date(`${compra.fecha}T00:00:00`).getDate();
        if (dia > ultimoDiaGrande) ultimoDiaGrande = dia;
      }
    }
    if (ultimoDiaGrande > 0) {
      const diasSinGrande = data.diaDelMes - ultimoDiaGrande;
      if (diasSinGrande >= 5) {
        list.push({
          tipo: "info",
          titulo: "Racha controlada",
          detalle: `No hacen compras mayores a ${formatearPeso(umbralGastoGrande)} hace ${diasSinGrande} días.`,
          valor: diasSinGrande,
        });
      }
    }
  }

  // 14. Distribución 50/50
  if (data.comprasMes.length > 2) {
    let francoPago = 0;
    let fabiolaPago = 0;
    for (const compra of data.comprasMes) {
      for (const item of compra.items) {
        francoPago += item.pago_franco;
        fabiolaPago += item.pago_fabiola;
      }
    }
    const totalAmbos = francoPago + fabiolaPago;
    if (totalAmbos > 0) {
      const pctFran = (francoPago / totalAmbos) * 100;
      if (pctFran >= 45 && pctFran <= 55) {
        list.push({
          tipo: "positive",
          titulo: "Distribución equilibrada",
          detalle: `El gasto está distribuido casi 50/50 este mes (${formatearPorcentaje(Math.round(pctFran))} Franco / ${formatearPorcentaje(100 - Math.round(pctFran))} Fabiola).`,
          valor: Math.abs(50 - pctFran),
        });
      }
    }
  }

  // ── Ordenar: warnings primero, luego positives, luego info ──
  const ordenTipo: Record<InsightTipo, number> = {
    warning: 0,
    anomaly: 1,
    positive: 2,
    info: 3,
  };

  list.sort((a, b) => {
    const oa = ordenTipo[a.tipo] ?? 99;
    const ob = ordenTipo[b.tipo] ?? 99;
    if (oa !== ob) return oa - ob;
    // Within same type, sort by valor descending (higher severity first)
    return (b.valor ?? 0) - (a.valor ?? 0);
  });

  return list;
}
