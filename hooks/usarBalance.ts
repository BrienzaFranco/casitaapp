"use client";

import { useState } from "react";
import {
  calcularBalance,
  calcularCategoriasMes,
  calcularDiasMasGasto,
  calcularEtiquetasMes,
  construirBalanceHistorico,
  deducirNombresParticipantes,
  filtrarComprasPorMes,
} from "@/lib/calculos";
import { exportarExcel } from "@/lib/exportar";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarUsuario } from "@/hooks/usarUsuario";

function mesActual() {
  return new Date().toISOString().slice(0, 7);
}

export function useBalance() {
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual());
  const compras = usarCompras();
  const categorias = usarCategorias();
  const usuario = usarUsuario();

  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const comprasMes = filtrarComprasPorMes(compras.compras, mesSeleccionado);
  const resumenMes = calcularBalance(comprasMes, nombres);
  const resumenHistorico = construirBalanceHistorico(compras.compras, nombres);
  const acumulado = calcularBalance(compras.compras, nombres);
  const categoriasMes = calcularCategoriasMes(comprasMes, categorias.categorias, categorias.subcategorias);
  const etiquetasMes = calcularEtiquetasMes(comprasMes, categorias.etiquetas);
  const diasMasGasto = calcularDiasMasGasto(comprasMes);

  function exportar() {
    exportarExcel(comprasMes, resumenMes, resumenHistorico, categoriasMes, etiquetasMes, mesSeleccionado);
  }

  return {
    mesSeleccionado,
    setMesSeleccionado,
    nombres,
    compras,
    categorias,
    usuario,
    comprasMes,
    resumenMes,
    resumenHistorico,
    acumulado,
    categoriasMes,
    etiquetasMes,
    diasMasGasto,
    exportar,
  };
}

export const usarBalance = useBalance;
