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
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[28px]" />
      </div>
    );
  }

  if (!compras.length) {
    if (modoVacio === "onboarding") {
      return (
        <section className="rounded-[28px] border border-dashed border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-base font-semibold text-indigo-900">Tu historial esta vacio</p>
          <p className="mt-1 text-sm text-indigo-800/80">
            Carga tu primera compra y vas a empezar a ver analisis, tendencia y balance automaticamente.
          </p>
          <Link
            href="/nueva-compra"
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Anadir tu primera compra
          </Link>
        </section>
      );
    }

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
