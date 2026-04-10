import type { Compra } from "@/types";
import Link from "next/link";
import { CardCompra } from "@/components/compras/CardCompra";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
  compras: Compra[];
  cargando: boolean;
  nombres: { franco: string; fabiola: string };
  onEliminar: (id: string) => void;
  modoVacio?: "filtros" | "onboarding";
}

export function ListaCompras({ compras, cargando, nombres, onEliminar, modoVacio = "filtros" }: Props) {
  if (cargando) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  if (!compras.length) {
    if (modoVacio === "onboarding") {
      return (
        <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Historial</p>
          <p className="mt-1 font-headline text-xl font-semibold tracking-tight text-on-surface">
            Tu historial esta vacio
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Carga tu primera compra para ver analisis, tendencia y balance.
          </p>
          <Link
            href="/nueva-compra"
            className="mt-3 inline-flex h-9 items-center justify-center rounded bg-primary px-4 text-xs font-semibold font-headline text-on-primary hover:bg-primary/90 transition-colors"
          >
            Anadir tu primera compra
          </Link>
        </section>
      );
    }

    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4">
        <p className="text-sm text-on-surface-variant">No hay compras para esos filtros.</p>
      </section>
    );
  }

  return <div className="space-y-2">{compras.map((compra) => (
    <CardCompra key={compra.id} compra={compra} nombres={nombres} onEliminar={onEliminar} />
  ))}</div>;
}
