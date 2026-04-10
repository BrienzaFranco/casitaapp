import type { Compra } from "@/types";
import { CardCompra } from "@/components/compras/CardCompra";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
  compras: Compra[];
  cargando: boolean;
  nombres: { franco: string; fabiola: string };
  onEliminar: (id: string) => void;
}

export function ListaCompras({ compras, cargando, nombres, onEliminar }: Props) {
  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[28px]" />
      </div>
    );
  }

  if (!compras.length) {
    return (
      <section className="rounded-[28px] border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        No hay compras para esos filtros.
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {compras.map((compra) => (
        <CardCompra key={compra.id} compra={compra} nombres={nombres} onEliminar={onEliminar} />
      ))}
    </div>
  );
}
