"use client";

import { Wallet } from "lucide-react";
import type { CategoriaBalance } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";

interface Props {
  categoriasMes: CategoriaBalance[];
}

function colorBarra(porcentaje: number | null): string {
  if (porcentaje === null) return "bg-gray-300";
  if (porcentaje < 60) return "bg-green-500";
  if (porcentaje <= 80) return "bg-amber-500";
  return "bg-red-500";
}

export function EstadoPresupuestos({ categoriasMes }: Props) {
  const conLimite = categoriasMes.filter(
    (c) => c.categoria.limite_mensual && c.categoria.limite_mensual > 0,
  );

  if (!conLimite.length) {
    return null;
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-on-surface-variant" />
          <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
            Presupuestos mensuales
          </h2>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant">
          Gasto vs. límite configurado por categoria
        </p>
      </div>

      <div className="p-4 space-y-3">
        {conLimite.map((cat) => {
          const limite = Number(cat.categoria.limite_mensual);
          const gastado = cat.total;
          const porcentaje = cat.porcentaje ?? 0;
          const restante = limite - gastado;
          const excedido = porcentaje > 100;

          return (
            <div key={cat.categoria.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.categoria.color }} />
                  <span className="font-label text-xs font-medium text-on-surface truncate">
                    {cat.categoria.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`font-label text-[10px] font-bold tabular-nums ${excedido ? "text-red-500" : "text-on-surface"}`}>
                    {formatearPeso(gastado)} / {formatearPeso(limite)}
                  </span>
                  <span className={`font-label text-[10px] tabular-nums ${excedido ? "text-red-500" : "text-on-surface-variant"}`}>
                    {formatearPorcentaje(porcentaje)}
                  </span>
                </div>
              </div>

              <div className="h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${colorBarra(porcentaje)}`}
                  style={{ width: `${Math.min(porcentaje, 100)}%` }}
                />
              </div>

              {excedido && (
                <p className="font-label text-[9px] text-red-500">
                  Excedido por {formatearPeso(Math.abs(restante))}
                </p>
              )}
              {!excedido && restante > 0.01 && (
                <p className="font-label text-[9px] text-on-surface-variant">
                  Restan {formatearPeso(restante)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
