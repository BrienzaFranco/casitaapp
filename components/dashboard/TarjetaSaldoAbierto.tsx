"use client";

import { CheckCircle, AlertTriangle } from "lucide-react";
import type { Compra, ResumenBalance, SettlementCut } from "@/types";
import { formatearFecha, formatearPeso } from "@/lib/formatear";

interface Props {
  saldoAbierto: ResumenBalance;
  comprasAbiertas: Compra[];
  corteActivo: SettlementCut | null;
  nombres: { franco: string; fabiola: string };
  colorFabi: string;
  onQuedarAMano: () => Promise<void>;
  guardando: boolean;
}

export function TarjetaSaldoAbierto({
  saldoAbierto,
  comprasAbiertas,
  corteActivo,
  nombres,
  colorFabi,
  onQuedarAMano,
  guardando,
}: Props) {
  const desdeTexto = corteActivo
    ? `desde ${formatearFecha(corteActivo.fecha_corte)}`
    : "desde el inicio del historial";

  const hayDeuda = saldoAbierto.deudor && saldoAbierto.acreedor;

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hayDeuda ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Periodo abierto
            </h2>
          </div>
          <span className="font-label text-[9px] text-on-surface-variant">
            {comprasAbiertas.length} {comprasAbiertas.length === 1 ? "compra" : "compras"}
          </span>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
          {desdeTexto}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {hayDeuda ? (
          <div className="space-y-1">
            <p className="font-label text-lg font-bold" style={{ color: colorFabi }}>
              {saldoAbierto.deudor} le debe {formatearPeso(Math.abs(saldoAbierto.balance))} a {saldoAbierto.acreedor}
            </p>
            <p className="font-label text-xs text-on-surface-variant">
              {nombres.franco} pagó {formatearPeso(saldoAbierto.franco_pago)} · {nombres.fabiola} pagó {formatearPeso(saldoAbierto.fabiola_pago)}
            </p>
          </div>
        ) : (
          <p className="font-label text-sm font-bold text-green-500">
            Sin deuda pendiente — están al día ✓
          </p>
        )}

        {hayDeuda && (
          <button
            type="button"
            onClick={onQuedarAMano}
            disabled={guardando}
            className="w-full h-9 rounded font-label text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: colorFabi, color: colorFabi === "#10b981" ? "#003909" : "#ffffff" }}
          >
            {guardando ? "Procesando..." : "Quedar a mano"}
          </button>
        )}
      </div>
    </section>
  );
}
