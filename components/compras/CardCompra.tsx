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
    <article className="border border-gray-300 bg-white p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-base font-semibold text-gray-950">{compra.nombre_lugar || "Compra sin lugar"}</p>
          <p className="text-sm text-gray-500">Registrado por {compra.registrado_por}</p>
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
          <p className="text-sm text-gray-500">{formatearFecha(compra.fecha)}</p>
          <p className="font-mono text-xl font-semibold text-gray-950">{formatearPeso(total)}</p>
        </div>
      </div>

      <div className="mt-2 flex h-1.5 overflow-hidden rounded">
        <div className="bg-indigo-400" style={{ width: `${porcentajeFranco}%` }} />
        <div className="bg-emerald-400" style={{ width: `${porcentajeFabiola}%` }} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Boton
          variante="secundario"
          onClick={() => setExpandida((valor) => !valor)}
          icono={<ChevronDown className={combinarClases("h-4 w-4 transition", expandida && "rotate-180")} />}
        >
          {expandida ? "Ocultar items" : "Ver items"}
        </Boton>
        <Link
          href={`/nueva-compra?editar=${compra.id}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
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
