import type { ItemEditable } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  items: ItemEditable[];
  nombres: { franco: string; fabiola: string };
}

function calcularTotales(items: ItemEditable[]) {
  const total = items.reduce((acumulado, item) => acumulado + item.monto_resuelto, 0);
  const pagoFranco = items.reduce((acumulado, item) => acumulado + item.pago_franco, 0);
  const pagoFabiola = items.reduce((acumulado, item) => acumulado + item.pago_fabiola, 0);
  const divisor = pagoFranco + pagoFabiola || 1;
  const porcentajeFranco = (pagoFranco / divisor) * 100;
  const porcentajeFabiola = 100 - porcentajeFranco;

  return {
    total,
    pagoFranco,
    pagoFabiola,
    porcentajeFranco,
    porcentajeFabiola,
  };
}

export function ResumenTotal({ items, nombres }: Props) {
  const { total, pagoFranco, pagoFabiola, porcentajeFranco, porcentajeFabiola } = calcularTotales(items);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-4 py-3 pb-safe">
      <div className="mx-auto w-full max-w-[480px]">
        <div className="mb-3 flex h-2 overflow-hidden rounded-full">
          <div className="bg-indigo-500" style={{ width: `${porcentajeFranco}%` }} />
          <div className="bg-emerald-500" style={{ width: `${porcentajeFabiola}%` }} />
        </div>

        <div className="sm:hidden">
          <div className="text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{formatearPeso(total)}</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">{nombres.franco}</p>
              <p className="text-lg font-mono font-semibold text-indigo-600">{formatearPeso(pagoFranco)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{nombres.fabiola}</p>
              <p className="text-lg font-mono font-semibold text-emerald-600">{formatearPeso(pagoFabiola)}</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-between sm:flex">
          <div className="text-left">
            <p className="text-xs text-gray-500">{nombres.franco}</p>
            <p className="text-lg font-mono font-semibold text-indigo-600">{formatearPeso(pagoFranco)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{formatearPeso(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{nombres.fabiola}</p>
            <p className="text-lg font-mono font-semibold text-emerald-600">{formatearPeso(pagoFabiola)}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
