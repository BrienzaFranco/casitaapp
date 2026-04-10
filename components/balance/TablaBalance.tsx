import type { BalanceMensualFila } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  filas: BalanceMensualFila[];
  deudaActual: string;
}

export function TablaBalance({ filas, deudaActual }: Props) {
  const totales = filas.reduce(
    (acc, fila) => ({
      total: acc.total + fila.total,
      franco: acc.franco + fila.franco,
      fabiola: acc.fabiola + fila.fabiola,
    }),
    { total: 0, franco: 0, fabiola: 0 },
  );

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Balance acumulado historico
        </h2>
        <p className="font-label text-xs text-on-surface-variant">{deudaActual}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-surface-container-low text-[9px] uppercase tracking-widest font-black text-on-surface-variant border-b border-outline-variant/30">
              <th className="px-3 py-2">Mes</th>
              <th className="px-3 py-2 text-right border-r border-outline-variant/20">Total</th>
              <th className="px-3 py-2 text-right border-r border-outline-variant/20">Franco</th>
              <th className="px-3 py-2 text-right border-r border-outline-variant/20">Fabiola</th>
              <th className="px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {filas.map((fila) => (
              <tr key={fila.mes} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-3 py-2 font-label text-xs text-on-surface-variant">{fila.mes}</td>
                <td className="px-3 py-2 text-right font-label text-sm tabular-nums border-r border-outline-variant/10">
                  {formatearPeso(fila.total)}
                </td>
                <td className="px-3 py-2 text-right font-label text-sm tabular-nums border-r border-outline-variant/10">
                  {formatearPeso(fila.franco)}
                </td>
                <td className="px-3 py-2 text-right font-label text-sm tabular-nums border-r border-outline-variant/10">
                  {formatearPeso(fila.fabiola)}
                </td>
                <td className="px-3 py-2 text-right font-label text-sm tabular-nums font-semibold">
                  {formatearPeso(Math.abs(fila.balance))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container-highest text-sm font-bold border-t border-outline-variant/30">
              <td className="px-3 py-2.5 font-label text-on-surface">Totales</td>
              <td className="px-3 py-2.5 text-right font-label tabular-nums border-r border-outline-variant/20">
                {formatearPeso(totales.total)}
              </td>
              <td className="px-3 py-2.5 text-right font-label tabular-nums border-r border-outline-variant/20">
                {formatearPeso(totales.franco)}
              </td>
              <td className="px-3 py-2.5 text-right font-label tabular-nums border-r border-outline-variant/20">
                {formatearPeso(totales.fabiola)}
              </td>
              <td className="px-3 py-2.5 text-right font-label tabular-nums">
                {formatearPeso(Math.abs(filas.reduce((acc, f) => acc + f.balance, 0)))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
