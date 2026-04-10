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
        <Skeleton className="h-32 w-full rounded" />
        <Skeleton className="h-32 w-full rounded" />
      </div>
    );
  }

  if (!compras.length) {
    if (modoVacio === "onboarding") {
      return (
        <section className="border border-gray-300 bg-white p-4">
          <p className="text-base font-semibold text-gray-900">Tu historial esta vacio</p>
          <p className="mt-1 text-sm text-gray-600">
            Carga tu primera compra y vas a empezar a ver analisis, tendencia y balance automaticamente.
          </p>
          <Link
            href="/nueva-compra"
            className="mt-4 inline-flex h-10 items-center justify-center rounded bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Anadir tu primera compra
          </Link>
        </section>
      );
    }

    return (
      <section className="border border-gray-300 bg-white p-4 text-sm text-gray-600">
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
