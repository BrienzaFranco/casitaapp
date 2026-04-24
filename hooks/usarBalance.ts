"use client";

import { useState, useMemo } from "react";
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

  const nombres = useMemo(
    () => deducirNombresParticipantes(usuario.perfiles),
    [usuario.perfiles]
  );

  const comprasMes = useMemo(
    () => filtrarComprasPorMes(compras.compras, mesSeleccionado),
    [compras.compras, mesSeleccionado]
  );

  const mesAnterior = useMemo(
    () => obtenerMesAnterior(mesSeleccionado),
    [mesSeleccionado]
  );

  const comprasMesAnterior = useMemo(
    () => mesAnterior ? filtrarComprasPorMes(compras.compras, mesAnterior) : [],
    [compras.compras, mesAnterior]
  );

  const resumenMes = useMemo(
    () => calcularBalance(comprasMes, nombres),
    [comprasMes, nombres]
  );

  const resumenMesAnterior = useMemo(
    () => calcularBalance(comprasMesAnterior, nombres),
    [comprasMesAnterior, nombres]
  );

  const variacionMensual = useMemo(
    () => calcularVariacionPeriodo(resumenMes.total, resumenMesAnterior.total),
    [resumenMes.total, resumenMesAnterior.total]
  );

  const resumenHistorico = useMemo(
    () => construirBalanceHistorico(compras.compras, nombres),
    [compras.compras, nombres]
  );

  const acumulado = useMemo(
    () => calcularBalance(compras.compras, nombres),
    [compras.compras, nombres]
  );

  const comprasAbiertas = useMemo(
    () => filtrarComprasDesdeFechaExclusiva(compras.compras, cortes.corteActivo?.fecha_corte),
    [compras.compras, cortes.corteActivo?.fecha_corte]
  );

  const saldoAbierto = useMemo(
    () => calcularBalance(comprasAbiertas, nombres),
    [comprasAbiertas, nombres]
  );

  const categoriasMes = useMemo(
    () => calcularCategoriasMes(comprasMes, categorias.categorias, categorias.subcategorias),
    [comprasMes, categorias.categorias, categorias.subcategorias]
  );

  const etiquetasMes = useMemo(
    () => calcularEtiquetasMes(comprasMes, categorias.etiquetas),
    [comprasMes, categorias.etiquetas]
  );

  const diasMasGasto = useMemo(
    () => calcularDiasMasGasto(comprasMes),
    [comprasMes]
  );

  const tendenciaDiariaMes = useMemo(
    () => calcularSerieGastoDiario(comprasMes),
    [comprasMes]
  );

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
