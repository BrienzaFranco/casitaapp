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
    <div className="border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">{item.descripcion || "Sin descripcion"}</p>
          <p className="text-sm text-gray-500">{textoReparto(item, nombres)}</p>
        </div>
        <p className="font-mono text-sm font-semibold text-gray-900">{formatearPeso(item.monto_resuelto)}</p>
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
