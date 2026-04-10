import type { BalanceMensualFila } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  filas: BalanceMensualFila[];
  deudaActual: string;
}

export function TablaBalance({ filas, deudaActual }: Props) {
  const totales = filas.reduce(
    (acumulado, fila) => ({
      total: acumulado.total + fila.total,
      franco: acumulado.franco + fila.franco,
      fabiola: acumulado.fabiola + fila.fabiola,
    }),
    { total: 0, franco: 0, fabiola: 0 },
  );

  return (
    <section className="rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 space-y-1">
        <h2 className="font-headline text-lg font-semibold tracking-tight text-on-surface">
          Balance acumulado historico
        </h2>
        <p className="font-label text-sm text-on-surface-variant">{deudaActual}</p>
      </div>

      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-[72px_1fr_1fr_1fr_1fr] gap-2 rounded-lg bg-surface-container px-3 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          <span>Mes</span>
          <span className="text-right">Total</span>
          <span className="text-right">Franco</span>
          <span className="text-right">Fabiola</span>
          <span className="text-right">Balance</span>
        </div>

        {/* Rows */}
        {filas.map((fila) => (
          <div
            key={fila.mes}
            className="grid grid-cols-[72px_1fr_1fr_1fr_1fr] gap-2 rounded-lg px-3 py-2.5 font-label text-sm tabular-nums text-on-surface hover:bg-surface-container-low transition-colors duration-150"
          >
            <span className="font-medium text-on-surface-variant">{fila.mes}</span>
            <span className="text-right font-semibold">{formatearPeso(fila.total)}</span>
            <span className="text-right font-semibold">{formatearPeso(fila.franco)}</span>
            <span className="text-right font-semibold">{formatearPeso(fila.fabiola)}</span>
            <span className="text-right font-semibold">{formatearPeso(Math.abs(fila.balance))}</span>
          </div>
        ))}

        {/* Totals Row */}
        <div className="grid grid-cols-[72px_1fr_1fr_1fr_1fr] gap-2 rounded-lg bg-surface-container-high px-3 py-3 font-label text-sm font-bold tabular-nums text-on-surface">
          <span>Totales</span>
          <span className="text-right">{formatearPeso(totales.total)}</span>
          <span className="text-right">{formatearPeso(totales.franco)}</span>
          <span className="text-right">{formatearPeso(totales.fabiola)}</span>
          <span className="text-right">{formatearPeso(Math.abs(filas.reduce((acc, fila) => acc + fila.balance, 0)))}</span>
        </div>
      </div>
    </section>
  );
}
