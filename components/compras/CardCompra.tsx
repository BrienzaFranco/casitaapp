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
  const tagsCompra = compra.etiquetas_compra;
  const total = totalCompra(compra);
  const totalFranco = compra.items.reduce((acumulado, item) => acumulado + item.pago_franco, 0);
  const totalFabiola = compra.items.reduce((acumulado, item) => acumulado + item.pago_fabiola, 0);
  const divisor = totalFranco + totalFabiola || 1;
  const porcentajeFranco = (totalFranco / divisor) * 100;
  const porcentajeFabiola = 100 - porcentajeFranco;

  return (
    <article className="overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-card)]">
      {/* Header: Lugar + Fecha + Total */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-variant px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              {compra.nombre_lugar || "Compra sin lugar"}
            </span>
            <span className="font-label text-[10px] text-on-surface-variant">
              {formatearFecha(compra.fecha)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categorias.map((categoria) => (
              <span
                key={categoria}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant"
              >
                {categoria}
              </span>
            ))}
            {tagsCompra.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                #{tag.nombre}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-label text-[10px] text-on-surface-variant">{compra.registrado_por}</p>
          <p className="font-label text-2xl font-bold tracking-tight tabular-nums text-primary">
            {formatearPeso(total)}
          </p>
        </div>
      </div>

      {/* Distribution Bar */}
      <div className="mt-4 rounded-lg bg-surface-container p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {nombres.franco}
          </span>
          <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Distribucion
          </span>
          <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {nombres.fabiola}
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-surface-container-lowest">
          <div
            className="bg-secondary transition-all duration-200"
            style={{ width: `${porcentajeFranco}%` }}
          />
          <div
            className="bg-tertiary transition-all duration-200"
            style={{ width: `${porcentajeFabiola}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-label text-sm font-semibold tabular-nums text-secondary">
            {formatearPeso(totalFranco)}
          </span>
          <span className="font-label text-sm font-semibold tabular-nums text-tertiary">
            {formatearPeso(totalFabiola)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Boton
          variante="secundario"
          onClick={() => setExpandida((valor) => !valor)}
          icono={
            <ChevronDown
              className={combinarClases(
                "h-4 w-4 transition-transform duration-200",
                expandida && "rotate-180"
              )}
            />
          }
        >
          {expandida ? "Ocultar items" : "Ver items"}
        </Boton>
        <Link
          href={`/nueva-compra?editar=${compra.id}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-surface-container-high px-3 text-sm font-semibold font-headline text-on-surface transition-all duration-200 hover:bg-surface-container-highest active:scale-[0.98]"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
        <Boton
          variante="peligro"
          onClick={() => onEliminar(compra.id)}
          icono={<Trash2 className="h-4 w-4" />}
        >
          Eliminar
        </Boton>
      </div>

      {/* Expandable Items */}
      <div
        className={combinarClases(
          "grid overflow-hidden transition-all duration-200",
          expandida ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 divide-y divide-outline-variant/10">
            {compra.items.map((item) => (
              <ItemCompra key={item.id} item={item} nombres={nombres} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
