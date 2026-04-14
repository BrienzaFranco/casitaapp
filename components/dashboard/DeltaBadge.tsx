"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";

interface Props {
  actual: number;
  anterior: number;
  formato?: "pesos" | "porcentaje" | "numero";
  inverso?: boolean; // true = bajar es malo, subir es bueno (ej: ingresos)
  className?: string;
}

export function DeltaBadge({ actual, anterior, formato = "pesos", inverso = false, className }: Props) {
  if (anterior === 0 || anterior === actual) return null;

  const diff = actual - anterior;
  const pct = Math.abs(anterior) > 0 ? (diff / Math.abs(anterior)) * 100 : 0;
  const esAumento = diff > 0;

  // Determine color: for gastos, increase = bad (red), decrease = good (green)
  // For inverse (ingresos), increase = good (green), decrease = bad (red)
  const malo = inverso ? !esAumento : esAumento;
  const colorClass = malo ? "text-[#A32D2D]" : "text-[#0F6E56]";
  const bgClass = malo ? "bg-[#FCEBEB]/50" : "bg-[#EAF3DE]/50";
  const Icon = esAumento ? ArrowUpRight : ArrowDownRight;

  function formatearValor(val: number): string {
    if (formato === "pesos") return formatearPeso(Math.abs(Math.round(val)));
    if (formato === "porcentaje") return formatearPorcentaje(Math.abs(Math.round(val)));
    return Math.abs(Math.round(val)).toString();
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${colorClass} ${bgClass} px-1.5 py-0.5 rounded-full ${className || ""}`}>
      <Icon className="h-2.5 w-2.5" />
      {formatearValor(diff)}
      <span className="opacity-60">({formatearPorcentaje(Math.abs(Math.round(pct)))})</span>
    </span>
  );
}
