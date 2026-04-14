"use client";

import { useMemo } from "react";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import type { Compra } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";
import { montoFiltrado } from "./FiltroGlobal";

interface Props {
  comprasMes: Compra[];
  filtro: FiltroActivo;
  resumenMes: {
    total: number;
    franco_pago: number;
    fabiola_pago: number;
    franco_corresponde: number;
    fabiola_corresponde: number;
    balance: number;
    deudor: string | null;
    acreedor: string | null;
  };
  colorFran: string;
  colorFabi: string;
  onPersonaClick: (persona: "franco" | "fabiola" | "todos") => void;
}

export function DistribucionPersona({
  comprasMes,
  filtro,
  resumenMes,
  colorFran,
  colorFabi,
  onPersonaClick,
}: Props) {
  // Total paid by each person (filtered)
  const francoPago = useMemo(
    () => montoFiltrado(comprasMes, { ...filtro, persona: "franco" }),
    [comprasMes, filtro],
  );
  const fabiolaPago = useMemo(
    () => montoFiltrado(comprasMes, { ...filtro, persona: "fabiola" }),
    [comprasMes, filtro],
  );
  const totalPagado = francoPago + fabiolaPago || 1;

  const pctFran = Math.round((francoPago / totalPagado) * 100);
  const pctFabi = 100 - pctFran;

  // Balance details
  const { franco_corresponde, fabiola_corresponde } = resumenMes;
  const diffFran = franco_corresponde - francoPago;
  const diffFab = fabiola_corresponde - fabiolaPago;

  function hexToRgba(hex: string, alpha: number): string {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return (
    <div className="bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[14px] px-4 py-3">
      <p className="text-[10px] text-on-surface-variant/50 mb-3">Quién pagó qué</p>

      {/* Franco bar */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <button
            type="button"
            onClick={() => onPersonaClick(filtro.persona === "franco" ? "todos" : "franco")}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
            style={{ color: colorFran }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFran }} />
            Franco
            {filtro.persona === "franco" && (
              <span className="text-[9px] text-on-surface-variant/40">(activo)</span>
            )}
          </button>
          <div className="text-right">
            <span className="text-[13px] font-medium tabular-nums text-on-surface">
              {formatearPeso(francoPago)}
            </span>
            <span className="text-[10px] text-on-surface-variant/40 ml-1">({pctFran}%)</span>
          </div>
        </div>
        <div className="h-[6px] bg-surface-container-low rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pctFran}%`, backgroundColor: hexToRgba(colorFran, 0.7) }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-on-surface-variant/40 mt-0.5">
          <span>Corresponde: {formatearPeso(franco_corresponde)}</span>
          <span className={diffFran > 0 ? "text-[#0F6E56]" : diffFran < 0 ? "text-[#A32D2D]" : ""}>
            {diffFran > 0 ? "Pagó de más" : diffFran < 0 ? "Falta" : "Justo"}
          </span>
        </div>
      </div>

      {/* Fabiola bar */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-1">
          <button
            type="button"
            onClick={() => onPersonaClick(filtro.persona === "fabiola" ? "todos" : "fabiola")}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
            style={{ color: colorFabi }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorFabi }} />
            Fabiola
            {filtro.persona === "fabiola" && (
              <span className="text-[9px] text-on-surface-variant/40">(activo)</span>
            )}
          </button>
          <div className="text-right">
            <span className="text-[13px] font-medium tabular-nums text-on-surface">
              {formatearPeso(fabiolaPago)}
            </span>
            <span className="text-[10px] text-on-surface-variant/40 ml-1">({pctFabi}%)</span>
          </div>
        </div>
        <div className="h-[6px] bg-surface-container-low rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pctFabi}%`, backgroundColor: hexToRgba(colorFabi, 0.7) }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-on-surface-variant/40 mt-0.5">
          <span>Corresponde: {formatearPeso(fabiola_corresponde)}</span>
          <span className={diffFab > 0 ? "text-[#0F6E56]" : diffFab < 0 ? "text-[#A32D2D]" : ""}>
            {diffFab > 0 ? "Pagó de más" : diffFab < 0 ? "Falta" : "Justo"}
          </span>
        </div>
      </div>
    </div>
  );
}
