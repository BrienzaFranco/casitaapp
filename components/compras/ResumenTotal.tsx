import type { ItemEditable } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  items: ItemEditable[];
  nombres: { franco: string; fabiola: string };
}

function calcularTotales(items: ItemEditable[]) {
  const total = items.reduce((acc, item) => acc + item.monto_resuelto, 0);
  const pagoFranco = items.reduce((acc, item) => acc + item.pago_franco, 0);
  const pagoFabiola = items.reduce((acc, item) => acc + item.pago_fabiola, 0);
  const divisor = pagoFranco + pagoFabiola || 1;
  const pctFranco = (pagoFranco / divisor) * 100;
  const pctFabiola = 100 - pctFranco;
  return { total, pagoFranco, pagoFabiola, pctFranco, pctFabiola };
}

export function ResumenTotal({ items, nombres }: Props) {
  const { total, pagoFranco, pagoFabiola, pctFranco, pctFabiola } = calcularTotales(items);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-outline-variant/20 px-4 py-2.5 pb-safe">
      <div className="mx-auto max-w-[480px]">
        {/* Distribution bar */}
        <div className="mb-2 flex h-1.5 overflow-hidden rounded-full bg-surface-container-lowest">
          <div className="bg-secondary transition-all duration-200" style={{ width: `${pctFranco}%` }} />
          <div className="bg-tertiary transition-all duration-200" style={{ width: `${pctFabiola}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">{nombres.franco}</p>
            <p className="font-label text-sm font-bold tabular-nums text-secondary">{formatearPeso(pagoFranco)}</p>
          </div>
          <div className="text-center">
            <p className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">Total</p>
            <p className="font-label text-xl font-bold tracking-tight tabular-nums text-primary">{formatearPeso(total)}</p>
          </div>
          <div className="text-right">
            <p className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">{nombres.fabiola}</p>
            <p className="font-label text-sm font-bold tabular-nums text-tertiary">{formatearPeso(pagoFabiola)}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
