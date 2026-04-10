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
    <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Balance acumulado historico</h2>
        <p className="text-sm text-gray-500">{deudaActual}</p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[72px_1fr_1fr_1fr_1fr] gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>Mes</span>
          <span>Total</span>
          <span>Franco</span>
          <span>Fabiola</span>
          <span>Balance</span>
        </div>

        {filas.map((fila) => (
          <div key={fila.mes} className="grid grid-cols-[72px_1fr_1fr_1fr_1fr] gap-2 rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-900">
            <span>{fila.mes}</span>
            <span className="font-mono">{formatearPeso(fila.total)}</span>
            <span className="font-mono">{formatearPeso(fila.franco)}</span>
            <span className="font-mono">{formatearPeso(fila.fabiola)}</span>
            <span className="font-mono">{formatearPeso(Math.abs(fila.balance))}</span>
          </div>
        ))}

        <div className="grid grid-cols-[72px_1fr_1fr_1fr_1fr] gap-2 rounded-2xl border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-950">
          <span>Totales</span>
          <span className="font-mono">{formatearPeso(totales.total)}</span>
          <span className="font-mono">{formatearPeso(totales.franco)}</span>
          <span className="font-mono">{formatearPeso(totales.fabiola)}</span>
          <span className="font-mono">{formatearPeso(Math.abs(filas.reduce((acc, fila) => acc + fila.balance, 0)))}</span>
        </div>
      </div>
    </section>
  );
}
