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
        <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Historial</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">Tu historial esta vacio</p>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Carga tu primera compra y vas a empezar a ver analisis, tendencia y balance automaticamente.
          </p>
          <Link
            href="/nueva-compra"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-[18px] bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Anadir tu primera compra
          </Link>
        </section>
      );
    }

    return (
      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)] shadow-[var(--shadow-soft)]">
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
