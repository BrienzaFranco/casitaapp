"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatearPeso, formatearFecha } from "@/lib/formatear";
import { obtenerItemsFiltrados } from "./FiltroGlobal";
import type { Compra } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";

interface Props {
  comprasMes: Compra[];
  filtro: FiltroActivo;
}

export function TopGastosMes({ comprasMes, filtro }: Props) {
  const [colapsado, setColapsado] = useState(true);

  const itemsOrdenados = useMemo(() => {
    const items = obtenerItemsFiltrados(comprasMes, filtro);
    return items
      .map((item) => ({
        ...item,
        montoVisible: filtro.persona === "franco" ? item.pago_franco : filtro.persona === "fabiola" ? item.pago_fabiola : item.monto_resuelto,
      }))
      .sort((a, b) => b.montoVisible - a.montoVisible)
      .slice(0, 10);
  }, [comprasMes, filtro]);

  const totalTop = itemsOrdenados.reduce((acc, i) => acc + i.montoVisible, 0);

  return (
    <div className="bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[14px]">
      <button
        type="button"
        onClick={() => setColapsado(!colapsado)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container-low transition-colors rounded-[14px]"
      >
        <div>
          <p className="text-[10px] text-on-surface-variant/50">Top gastos individuales</p>
          <p className="text-[13px] font-medium text-on-surface mt-0.5">
            {itemsOrdenados.length} items · {formatearPeso(totalTop)}
          </p>
        </div>
        {colapsado ? (
          <ChevronDown className="h-4 w-4 text-on-surface-variant/40" />
        ) : (
          <ChevronUp className="h-4 w-4 text-on-surface-variant/40" />
        )}
      </button>

      {!colapsado && (
        <div className="px-4 pb-3 space-y-0.5">
          {itemsOrdenados.map((item, i) => (
            <div
              key={item.id}
              className="flex items-start justify-between py-1.5 px-1 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="text-[10px] text-on-surface-variant/30 tabular-nums mt-0.5 shrink-0 w-4 text-right">
                  {i + 1}.
                </span>
                <div className="min-w-0">
                  <p className="font-headline text-xs font-medium text-on-surface truncate">
                    {item.descripcion || "Sin detalle"}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant/60">
                    {formatearFecha(item.compraFecha)} · {item.compraLugar || "Sin lugar"}
                  </p>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {item.categoria && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${item.categoria.color}20`,
                          color: item.categoria.color,
                        }}
                      >
                        {item.categoria.nombre}
                      </span>
                    )}
                    {item.etiquetas?.map((et) => (
                      <span
                        key={et.id}
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/50"
                      >
                        {et.nombre}
                      </span>
                    ))}
                    {item.tipo_reparto === "50/50" ? null : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/40">
                        {item.tipo_reparto === "solo_franco" ? "Solo Franco" : item.tipo_reparto === "solo_fabiola" ? "Solo Fabiola" : "Custom"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="font-label text-xs font-semibold tabular-nums text-on-surface shrink-0 ml-2">
                {formatearPeso(item.montoVisible)}
              </span>
            </div>
          ))}
          {itemsOrdenados.length === 0 && (
            <p className="text-[11px] text-on-surface-variant/40 py-3 text-center">Sin gastos</p>
          )}
        </div>
      )}
    </div>
  );
}
