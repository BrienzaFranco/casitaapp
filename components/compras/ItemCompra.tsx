import type { Item } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  item: Item;
  nombres: { franco: string; fabiola: string };
}

function textoReparto(item: Item, nombres: { franco: string; fabiola: string }) {
  if (item.tipo_reparto === "solo_franco") {
    return `Solo ${nombres.franco}`;
  }

  if (item.tipo_reparto === "solo_fabiola") {
    return `Solo ${nombres.fabiola}`;
  }

  if (item.tipo_reparto === "personalizado") {
    return `${nombres.franco}: ${formatearPeso(item.pago_franco)} \u00b7 ${nombres.fabiola}: ${formatearPeso(item.pago_fabiola)}`;
  }

  return "Compartido";
}

export function ItemCompra({ item, nombres }: Props) {
  return (
    <div className="group flex flex-col gap-2 py-3">
      {/* Description + Amount row */}
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 flex-1 font-['var(--font-headline)'] text-sm font-semibold leading-snug text-[var(--on-surface)]">
          {item.descripcion || "Sin descripcion"}
        </p>
        <p className="shrink-0 font-['var(--font-label)'] text-base font-medium leading-none tracking-tight text-[var(--on-surface)] tabular-nums">
          {formatearPeso(item.monto_resuelto)}
        </p>
      </div>

      {/* Reparto info */}
      <p className="font-['var(--font-label)'] text-[11px] leading-tight text-[var(--on-surface-variant)]">
        {textoReparto(item, nombres)}
      </p>

      {/* Chips row */}
      {(item.categoria || item.subcategoria || item.etiquetas.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {item.categoria && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-container-high)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--on-surface-variant)]"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.categoria.color }} />
              {item.categoria.nombre}
            </span>
          )}
          {item.subcategoria && (
            <span className="inline-flex items-center rounded-full bg-[var(--surface-container-high)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--on-surface-variant)]">
              {item.subcategoria.nombre}
            </span>
          )}
          {item.etiquetas.map((etiqueta) => (
            <span
              key={etiqueta.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-container-high)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--on-surface-variant)]"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: etiqueta.color }} />
              {etiqueta.nombre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
