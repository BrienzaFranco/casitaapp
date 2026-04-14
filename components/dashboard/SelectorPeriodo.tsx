"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";

export type PeriodoTipo =
  | "este-mes"
  | "mes-anterior"
  | "ultimos-7"
  | "ultimos-30"
  | "ultimos-3-meses"
  | "rango"
  | "anio-completo";

export interface PeriodoActivo {
  tipo: PeriodoTipo;
  desde?: Date;
  hasta?: Date;
  label: string;
}

interface Props {
  periodo: PeriodoActivo;
  setPeriodo: (p: PeriodoActivo) => void;
  mesActualLabel: string;
  mesAnteriorLabel?: string;
}

function formatearRangoLabel(desde: Date, hasta: Date): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = `${desde.getDate()} ${meses[desde.getMonth()]}`;
  const h = `${hasta.getDate()} ${meses[hasta.getMonth()]}`;
  if (desde.getFullYear() !== hasta.getFullYear()) return `${d} ${desde.getFullYear()} – ${h} ${hasta.getFullYear()}`;
  if (desde.getMonth() === hasta.getMonth()) return `${d} – ${h} ${desde.getFullYear()}`;
  return `${d} – ${h}`;
}

export function SelectorPeriodo({ periodo, setPeriodo, mesActualLabel, mesAnteriorLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [rangoDesde, setRangoDesde] = useState("");
  const [rangoHasta, setRangoHasta] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const opciones: { id: PeriodoTipo; label: string; sub?: string }[] = [
    { id: "este-mes", label: `Este mes (${mesActualLabel})` },
    { id: "mes-anterior", label: `Mes anterior (${mesAnteriorLabel || "—"})` },
    { id: "ultimos-7", label: "Últimos 7 días", sub: "Semana" },
    { id: "ultimos-30", label: "Últimos 30 días", sub: "Mes" },
    { id: "ultimos-3-meses", label: "Últimos 3 meses" },
    { id: "anio-completo", label: `Año ${new Date().getFullYear()} completo` },
    { id: "rango", label: "Rango personalizado", sub: "Custom" },
  ];

  function seleccionar(tipo: PeriodoTipo) {
    const ahora = new Date();
    let desde: Date | undefined;
    let hasta: Date | undefined;
    let label = "";

    switch (tipo) {
      case "este-mes":
        label = `Este mes`;
        break;
      case "mes-anterior":
        label = `Mes anterior`;
        break;
      case "ultimos-7":
        desde = new Date(ahora);
        desde.setDate(desde.getDate() - 6);
        hasta = ahora;
        label = "Últimos 7 días";
        break;
      case "ultimos-30":
        desde = new Date(ahora);
        desde.setDate(desde.getDate() - 29);
        hasta = ahora;
        label = "Últimos 30 días";
        break;
      case "ultimos-3-meses":
        desde = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1);
        hasta = ahora;
        label = "Últimos 3 meses";
        break;
      case "anio-completo":
        desde = new Date(ahora.getFullYear(), 0, 1);
        hasta = new Date(ahora.getFullYear(), 11, 31);
        label = `Año ${ahora.getFullYear()}`;
        break;
      case "rango":
        // Don't close yet — user needs to pick dates
        if (periodo.tipo === "rango") {
          // If already on rango mode, apply the dates
          if (rangoDesde && rangoHasta) {
            desde = new Date(`${rangoDesde}T00:00:00`);
            hasta = new Date(`${rangoHasta}T23:59:59`);
            label = formatearRangoLabel(desde, hasta);
            setOpen(false);
          }
        }
        break;
    }

    setPeriodo({ tipo, desde, hasta, label });
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium bg-surface-container-low border-[0.5px] border-outline-variant/20 text-on-surface hover:bg-surface-container"
      >
        <Calendar className="h-3.5 w-3.5 opacity-50" />
        {periodo.tipo === "este-mes" ? mesActualLabel : periodo.label}
        {periodo.tipo !== "este-mes" && periodo.tipo !== "mes-anterior" && (
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant/70 ml-0.5">
            {periodo.tipo === "rango" && periodo.desde ? formatearRangoLabel(periodo.desde, periodo.hasta || new Date()) : ""}
          </span>
        )}
        <ChevronDown className="h-3 w-3 opacity-40" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 w-64 bg-surface-container-lowest border border-outline-variant/15 rounded-[12px] shadow-xl overflow-hidden">
          <div className="py-1 max-h-64 overflow-y-auto">
            {opciones.map((op) => {
              const activo = periodo.tipo === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => seleccionar(op.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-surface-container transition-colors ${activo ? "bg-surface-container-high" : ""}`}
                >
                  <div>
                    <p className="text-[12px] text-on-surface font-medium">{op.label}</p>
                    {op.sub && <p className="text-[9px] text-on-surface-variant/40">{op.sub}</p>}
                  </div>
                  {activo && (
                    <span className="w-2 h-2 rounded-full bg-[#5B9BD5]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Rango personalizado date inputs */}
          {periodo.tipo === "rango" && (
            <div className="border-t border-outline-variant/10 px-3 py-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={rangoDesde}
                  onChange={(e) => setRangoDesde(e.target.value)}
                  className="flex-1 min-w-0 h-7 rounded-[6px] bg-surface-container-low px-1.5 text-[11px] outline-none text-on-surface border border-outline-variant/15"
                />
                <span className="text-[10px] text-on-surface-variant/40 shrink-0">→</span>
                <input
                  type="date"
                  value={rangoHasta}
                  onChange={(e) => setRangoHasta(e.target.value)}
                  className="flex-1 min-w-0 h-7 rounded-[6px] bg-surface-container-low px-1.5 text-[11px] outline-none text-on-surface border border-outline-variant/15"
                />
              </div>
              {rangoDesde && rangoHasta && (
                <button
                  type="button"
                  onClick={() => seleccionar("rango")}
                  className="w-full text-[11px] py-1 rounded-[8px] bg-[#5B9BD5] text-white font-medium hover:bg-[#4a8ac4] transition-colors"
                >
                  Aplicar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Filter purchases by active period.
 * Uses compras.compras (all purchases) as source.
 */
export function filtrarPorPeriodo<T extends { fecha: string }>(compras: T[], periodo: { tipo: PeriodoTipo; desde?: Date; hasta?: Date; mesKey?: string; mesKeyAnterior?: string }) {
  if (periodo.tipo === "este-mes" || periodo.tipo === "mes-anterior") {
    // These are handled by the hook's comprasMes / comprasMesAnterior
    return compras;
  }

  if (!periodo.desde || !periodo.hasta) {
    return compras;
  }

  const desdeStr = `${periodo.desde.getFullYear()}-${String(periodo.desde.getMonth() + 1).padStart(2, "0")}-${String(periodo.desde.getDate()).padStart(2, "0")}`;
  const hastaStr = `${periodo.hasta.getFullYear()}-${String(periodo.hasta.getMonth() + 1).padStart(2, "0")}-${String(periodo.hasta.getDate()).padStart(2, "0")}`;

  return compras.filter((c) => c.fecha >= desdeStr && c.fecha <= hastaStr);
}
