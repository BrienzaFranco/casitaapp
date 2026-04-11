"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  calcularBalance,
  calcularCategoriasMes,
  calcularSerieGastoDiario,
  calcularDiasMasGasto,
  calcularEtiquetasMes,
  calcularVariacionPeriodo,
  construirBalanceHistorico,
  deducirNombresParticipantes,
  filtrarComprasDesdeFechaExclusiva,
  filtrarComprasPorMes,
  obtenerMesAnterior,
} from "@/lib/calculos";
import { exportarExcel } from "@/lib/exportar";
import { mesLocalISO } from "@/lib/utiles";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarSettlementCuts } from "@/hooks/usarSettlementCuts";
import { usarUsuario } from "@/hooks/usarUsuario";

function mesActual() {
  return mesLocalISO();
}

export function useBalance() {
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual());
  const compras = usarCompras();
  const categorias = usarCategorias();
  const cortes = usarSettlementCuts();
  const usuario = usarUsuario();

  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const comprasMes = filtrarComprasPorMes(compras.compras, mesSeleccionado);
  const mesAnterior = obtenerMesAnterior(mesSeleccionado);
  const comprasMesAnterior = mesAnterior ? filtrarComprasPorMes(compras.compras, mesAnterior) : [];
  const resumenMes = calcularBalance(comprasMes, nombres);
  const resumenMesAnterior = calcularBalance(comprasMesAnterior, nombres);
  const variacionMensual = calcularVariacionPeriodo(resumenMes.total, resumenMesAnterior.total);
  const resumenHistorico = construirBalanceHistorico(compras.compras, nombres);
  const acumulado = calcularBalance(compras.compras, nombres);
  const comprasAbiertas = filtrarComprasDesdeFechaExclusiva(compras.compras, cortes.corteActivo?.fecha_corte);
  const saldoAbierto = calcularBalance(comprasAbiertas, nombres);
  const categoriasMes = calcularCategoriasMes(comprasMes, categorias.categorias, categorias.subcategorias);
  const etiquetasMes = calcularEtiquetasMes(comprasMes, categorias.etiquetas);
  const diasMasGasto = calcularDiasMasGasto(comprasMes);
  const tendenciaDiariaMes = calcularSerieGastoDiario(comprasMes);

  function exportar() {
    exportarExcel(comprasMes, resumenMes, resumenHistorico, categoriasMes, etiquetasMes, mesSeleccionado);
    toast.success(`Exportado: ${mesSeleccionado || "historico"} (${comprasMes.length} compras)`);
  }

  return {
    mesSeleccionado,
    setMesSeleccionado,
    nombres,
    compras,
    categorias,
    cortes,
    usuario,
    comprasMes,
    resumenMes,
    resumenMesAnterior,
    variacionMensual,
    resumenHistorico,
    acumulado,
    comprasAbiertas,
    saldoAbierto,
    categoriasMes,
    etiquetasMes,
    diasMasGasto,
    tendenciaDiariaMes,
    exportar,
  };
}

export const usarBalance = useBalance;
