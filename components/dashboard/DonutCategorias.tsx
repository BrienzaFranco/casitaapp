"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { CategoriaBalance } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  categorias: CategoriaBalance[];
  onCategoriaClick: (cat: CategoriaBalance) => void;
}

const COLORES_PREDEFINIDOS = [
  "#5B9BD5", "#ED7D31", "#A5A5A5", "#FFC000", "#4472C4", "#70AD47",
  "#264478", "#9B59B6", "#E74C3C", "#1ABC9C",
];

export function DonutCategorias({ categorias, onCategoriaClick }: Props) {
  const datos = useMemo(() => {
    return categorias.slice(0, 10).map((c, i) => ({
      nombre: c.categoria.nombre,
      total: c.total,
      color: c.categoria.color || COLORES_PREDEFINIDOS[i % COLORES_PREDEFINIDOS.length],
      cat: c,
    }));
  }, [categorias]);

  const total = useMemo(() => datos.reduce((s, d) => s + d.total, 0), [datos]);

  if (!datos.length || total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-on-surface-variant">
        Sin gastos en el per&iacute;odo
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-[130px] h-[130px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="total"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={1}
              cursor="pointer"
              onClick={(_, i) => { if (i != null) onCategoriaClick(datos[i].cat); }}
            >
              {datos.map((d, i) => (
                <Cell key={i} fill={d.color} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {datos.slice(0, 6).map((d) => (
          <button
            key={d.nombre}
            type="button"
            onClick={() => onCategoriaClick(d.cat)}
            className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-on-surface truncate">{d.nombre}</span>
            <span className="text-xs text-on-surface-variant ml-auto tabular-nums">{formatearPeso(d.total)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
