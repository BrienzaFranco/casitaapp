import type { Item } from "@/types";
import { Badge } from "@/components/ui/Badge";
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
    return `${nombres.franco}: ${formatearPeso(item.pago_franco)} · ${nombres.fabiola}: ${formatearPeso(item.pago_fabiola)}`;
  }

  return "Compartido";
}

export function ItemCompra({ item, nombres }: Props) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{item.descripcion || "Sin descripcion"}</p>
          <p className="text-sm text-[var(--muted)]">{textoReparto(item, nombres)}</p>
        </div>
        <p className="rounded-full bg-[var(--accent-soft)] px-3 py-1 font-mono text-sm font-semibold text-blue-800">
          {formatearPeso(item.monto_resuelto)}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {item.categoria ? <Badge color={item.categoria.color}>{item.categoria.nombre}</Badge> : null}
        {item.subcategoria ? <Badge>{item.subcategoria.nombre}</Badge> : null}
        {item.etiquetas.map((etiqueta) => (
          <Badge key={etiqueta.id} color={etiqueta.color}>
            {etiqueta.nombre}
          </Badge>
        ))}
      </div>
    </div>
  );
}
