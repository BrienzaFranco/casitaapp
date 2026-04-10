"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { Compra } from "@/types";
import { ItemCompra } from "@/components/compras/ItemCompra";
import { Boton } from "@/components/ui/Boton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { obtenerCategoriasUsadas, totalCompra } from "@/lib/calculos";
import { combinarClases } from "@/lib/utiles";

interface Props {
  compra: Compra;
  nombres: { franco: string; fabiola: string };
  onEliminar: (id: string) => void;
}

export function CardCompra({ compra, nombres, onEliminar }: Props) {
  const [expandida, setExpandida] = useState(false);
  const categorias = obtenerCategoriasUsadas(compra);
  const total = totalCompra(compra);
  const totalFranco = compra.items.reduce((acc, item) => acc + item.pago_franco, 0);
  const totalFabiola = compra.items.reduce((acc, item) => acc + item.pago_fabiola, 0);
  const divisor = totalFranco + totalFabiola || 1;
  const pctFranco = (totalFranco / divisor) * 100;

  return (
    <article className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-dashed border-outline-variant/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded truncate max-w-[200px]">
                {compra.nombre_lugar || "Compra"}
              </span>
              <span className="font-label text-[10px] text-on-surface-variant whitespace-nowrap">
                {compra.registrado_por}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {categorias.map((cat) => (
                <span key={cat} className="font-label text-[9px] text-outline">
                  {cat}
                </span>
              ))}
              {compra.etiquetas_compra.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 font-label text-[9px] text-on-surface-variant"
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  #{tag.nombre}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-label text-[10px] text-outline whitespace-nowrap">
              {formatearFecha(compra.fecha)}
            </p>
            <p className="font-label text-lg sm:text-xl font-bold tracking-tight tabular-nums text-primary">
              {formatearPeso(total)}
            </p>
          </div>
        </div>
      </div>

      {/* Distribution bar */}
      <div className="px-4 py-2 bg-surface-container flex items-center gap-2 text-[10px]">
        <span className="font-label font-bold text-secondary tabular-nums text-right truncate max-w-[80px]">
          {formatearPeso(totalFranco)}
        </span>
        <div className="flex-1 flex h-1.5 overflow-hidden rounded-full bg-surface-container-lowest">
          <div className="bg-secondary transition-all duration-200" style={{ width: `${pctFranco}%` }} />
          <div className="bg-tertiary transition-all duration-200" style={{ width: `${100 - pctFranco}%` }} />
        </div>
        <span className="font-label font-bold text-tertiary tabular-nums text-right truncate max-w-[80px]">
          {formatearPeso(totalFabiola)}
        </span>
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-dashed border-outline-variant/30 flex items-center gap-2">
        <Boton
          variante="secundario"
          onClick={() => setExpandida((v) => !v)}
          icono={
            <ChevronDown
              className={combinarClases(
                "h-3.5 w-3.5 transition-transform duration-150",
                expandida && "rotate-180"
              )}
            />
          }
          className="h-7 px-2.5 text-[10px] font-label font-bold uppercase tracking-wider rounded"
        >
          {expandida ? "Ocultar" : "Ver items"}
        </Boton>
        <Link
          href={`/nueva-compra?editar=${compra.id}`}
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded bg-surface-container px-2.5 text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Editar
        </Link>
        <button
          type="button"
          onClick={() => onEliminar(compra.id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expandable items */}
      <div
        className={combinarClases(
          "grid overflow-hidden transition-all duration-200",
          expandida ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 py-2 space-y-0 divide-y divide-outline-variant/10">
            {compra.items.map((item) => (
              <ItemCompra key={item.id} item={item} nombres={nombres} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
