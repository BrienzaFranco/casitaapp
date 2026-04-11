import type { Item } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  item: Item;
  nombres: { franco: string; fabiola: string };
}

function textoReparto(item: Item, nombres: { franco: string; fabiola: string }) {
  if (item.tipo_reparto === "solo_franco") return `Corresp: ${nombres.franco}`;
  if (item.tipo_reparto === "solo_fabiola") return `Corresp: ${nombres.fabiola}`;
  if (item.tipo_reparto === "personalizado") return `Corresp: ${nombres.franco} / ${nombres.fabiola}`;
  return "Corresp: Ambos";
}

export function ItemCompra({ item, nombres }: Props) {
  return (
    <div className="py-2.5 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-headline text-sm font-semibold text-on-surface min-w-0 truncate">
          {item.descripcion || "Sin descripcion"}
        </p>
        <p className="font-label text-sm font-bold tabular-nums text-on-surface shrink-0">
          {formatearPeso(item.monto_resuelto)}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-label text-[10px] text-on-surface-variant">
          {textoReparto(item, nombres)}
        </span>
        {(item.categoria || item.etiquetas.length > 0) && (
          <div className="flex flex-wrap gap-1 justify-end">
            {item.categoria && (
              <span
                className="inline-flex items-center gap-1 font-label text-[9px] text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.categoria.color }} />
                {item.categoria.nombre}
              </span>
            )}
            {item.etiquetas.map((etiqueta) => (
              <span
                key={etiqueta.id}
                className="font-label text-[9px] text-on-surface-variant"
              >
                #{etiqueta.nombre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
