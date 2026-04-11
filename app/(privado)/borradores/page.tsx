"use client";

import Link from "next/link";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { deducirNombresParticipantes } from "@/lib/calculos";
import { usarCompras } from "@/hooks/usarCompras";
import { usarUsuario } from "@/hooks/usarUsuario";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PaginaBorradores() {
  const compras = usarCompras();
  const usuario = usarUsuario();
  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const borradores = compras.compras.filter(c => c.estado === "borrador");

  async function eliminar(id: string) {
    await compras.eliminarCompra(id);
    toast.success("Borrador eliminado");
  }

  if (compras.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (!borradores.length) {
    return (
      <div className="space-y-3">
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-6 text-center">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">Borradores</p>
          <p className="font-headline text-lg font-semibold text-on-surface">Sin borradores</p>
          <p className="font-body text-sm text-on-surface-variant mt-1">
            Usa el anotador rapido para crear borradores.
          </p>
          <Link
            href="/anotador-rapido"
            className="mt-3 inline-flex h-9 px-4 rounded bg-secondary font-label text-xs font-bold uppercase tracking-wider text-on-secondary hover:bg-secondary/90 active:scale-[0.98] transition-all"
          >
            Anotar rapido
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline">Borradores</p>
        <p className="font-headline text-lg font-semibold text-on-surface mt-0.5">{borradores.length} pendientes</p>
        <p className="font-body text-xs text-on-surface-variant mt-0.5">Completalos con categorias y reparto.</p>
      </div>

      {borradores.map(b => (
        <article key={b.id} className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded truncate max-w-[160px]">
                  {b.nombre_lugar || "Sin lugar"}
                </span>
                <span className="font-label text-[9px] text-on-surface-variant">{formatearFecha(b.fecha)}</span>
              </div>
              {b.items[0]?.descripcion && (
                <p className="font-headline text-sm text-on-surface mt-1 truncate">{b.items[0].descripcion}</p>
              )}
              <p className="font-label text-[9px] text-on-surface-variant mt-0.5">
                Pago: {b.pagador_general === "franco" ? nombres.franco : b.pagador_general === "fabiola" ? nombres.fabiola : "Ambos"}
              </p>
            </div>
            <p className="font-label text-lg font-bold tabular-nums text-primary shrink-0">
              {formatearPeso(b.items.reduce((a, i) => a + i.monto_resuelto, 0))}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-outline-variant/10">
            <Link
              href={`/nueva-compra?editar=${b.id}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-primary font-label text-[10px] font-bold uppercase tracking-wider text-on-primary hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              <Pencil className="h-3 w-3" /> Completar
            </Link>
            <button
              type="button"
              onClick={() => eliminar(b.id)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-error font-label text-[10px] font-bold uppercase tracking-wider hover:bg-error-container transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Eliminar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
