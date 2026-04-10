"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { Compra } from "@/types";
import { ItemCompra } from "@/components/compras/ItemCompra";
import { Badge } from "@/components/ui/Badge";
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
    <article className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--olive-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900">
              {compra.nombre_lugar || "Compra sin lugar"}
            </span>
            <span className="text-xs font-medium text-[var(--muted)]">Registrado por {compra.registrado_por}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categorias.map((categoria) => (
              <Badge key={categoria}>{categoria}</Badge>
            ))}
            {tagsCompra.map((tag) => (
              <Badge key={tag.id} color={tag.color}>
                #{tag.nombre}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--muted)]">{formatearFecha(compra.fecha)}</p>
          <p className="font-mono text-2xl font-semibold text-slate-950">{formatearPeso(total)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[#f5efe5] p-3">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          <span>{nombres.franco}</span>
          <span>Distribucion</span>
          <span>{nombres.fabiola}</span>
        </div>
        <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-white">
          <div className="bg-blue-600" style={{ width: `${porcentajeFranco}%` }} />
          <div className="bg-emerald-500" style={{ width: `${porcentajeFabiola}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-mono text-slate-900">{formatearPeso(totalFranco)}</span>
          <span className="font-mono text-slate-900">{formatearPeso(totalFabiola)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Boton
          variante="secundario"
          onClick={() => setExpandida((valor) => !valor)}
          icono={<ChevronDown className={combinarClases("h-4 w-4 transition", expandida && "rotate-180")} />}
        >
          {expandida ? "Ocultar items" : "Ver items"}
        </Boton>
        <Link
          href={`/nueva-compra?editar=${compra.id}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-slate-900 transition hover:bg-[#fffaf1]"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
        <Boton variante="fantasma" onClick={() => onEliminar(compra.id)} icono={<Trash2 className="h-4 w-4" />}>
          Eliminar
        </Boton>
      </div>

      <div className={combinarClases("grid overflow-hidden transition-all", expandida ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3">
            {compra.items.map((item) => (
              <ItemCompra key={item.id} item={item} nombres={nombres} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
