"use client";

import { useMemo, useState } from "react";
import { Treemap, ResponsiveContainer } from "recharts";
import { LayoutGrid } from "lucide-react";
import type { CategoriaBalance } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  categoriasMes: CategoriaBalance[];
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TreemapSubcategorias({ categoriasMes }: Props) {
  const [hoverIdx, setHoverIdx] = useState<string | null>(null);

  const datos = useMemo(() => {
    // Flatten all subcategories with their parent category info
    const allSubcats: Array<Record<string, unknown>> = [];

    for (const cat of categoriasMes) {
      if (cat.subcategorias.length > 0) {
        for (const sub of cat.subcategorias) {
          allSubcats.push({
            nombre: sub.subcategoria.nombre,
            categoria: cat.categoria.nombre,
            color: cat.categoria.color,
            total: sub.total,
            size: sub.total,
          });
        }
      } else if (cat.total > 0) {
        allSubcats.push({
          nombre: cat.categoria.nombre,
          categoria: cat.categoria.nombre,
          color: cat.categoria.color,
          total: cat.total,
          size: cat.total,
        });
      }
    }

    // Sort descending and take top 10
    return allSubcats.sort((a, b) => (b.size as number) - (a.size as number)).slice(0, 10);
  }, [categoriasMes]);

  if (!datos.length) {
    return null;
  }

  const totalGeneral = datos.reduce((a, d) => a + (d.size as number), 0);

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-on-surface-variant" />
          <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
            Mapa de subcategorías
          </h2>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant">
          Top 10 subcategorías por gasto — tamaño proporcional al monto
        </p>
      </div>

      <div className="p-4">
        <div className="w-full" style={{ minHeight: "280px" }}>
          <ResponsiveContainer width="99%" minHeight={280}>
            <Treemap
              data={datos}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="var(--surface-container-lowest)"
              content={({ root, depth, x, y, width, height, index, name, ...rest }) => {
                if (index === undefined || index === null) return <rect x={x} y={y} width={width} height={height} fill="transparent" />;
                const item = datos[index];
                if (!item) return <rect x={x} y={y} width={width} height={height} fill="transparent" />;
                const itemColor = (item.color as string) || "#6b7280";
                const itemTotal = (item.total as number) ?? 0;
                const itemName = (item.nombre as string) ?? "";
                const itemCat = (item.categoria as string) ?? "";
                const isHovered = hoverIdx === String(index);
                const opacity = hoverIdx === null || isHovered ? 0.92 : 0.45;
                const pct = totalGeneral > 0 ? ((itemTotal / totalGeneral) * 100).toFixed(0) : "0";

                // Text color: white on dark backgrounds, dark on light
                const hex = itemColor.replace("#", "");
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const textColor = luminance > 0.55 ? "#1a1a1a" : "#ffffff";
                const textSub = luminance > 0.55 ? "rgba(26,26,26,0.7)" : "rgba(255,255,255,0.7)";

                return (
                  <g
                    onMouseEnter={() => setHoverIdx(String(index))}
                    onMouseLeave={() => setHoverIdx(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      style={{
                        fill: hexToRgba(itemColor, opacity),
                        stroke: isHovered ? "var(--outline)" : "var(--surface-container-lowest)",
                        strokeWidth: isHovered ? 2.5 : 1.5,
                        transition: "fill-opacity 0.15s, stroke-width 0.15s",
                      }}
                      rx={4}
                      ry={4}
                    />
                    {width > 55 && height > 35 && (
                      <>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 - 8}
                          textAnchor="middle"
                          fill={textColor}
                          fontSize={11}
                          fontWeight={700}
                          style={{ pointerEvents: "none", textShadow: isHovered ? `0 0 6px rgba(0,0,0,0.3)` : "none" }}
                        >
                          {itemName.length > 16 ? `${itemName.slice(0, 15)}…` : itemName}
                        </text>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 6}
                          textAnchor="middle"
                          fill={textSub}
                          fontSize={9}
                          style={{ pointerEvents: "none" }}
                        >
                          {formatearPeso(itemTotal)} · {pct}%
                        </text>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 18}
                          textAnchor="middle"
                          fill={textSub}
                          fontSize={8}
                          style={{ pointerEvents: "none" }}
                        >
                          {itemCat}
                        </text>
                      </>
                    )}
                  </g>
                );
              }}
            />
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2 px-1">
          {datos.map((d, i) => (
            <div
              key={String(i)}
              className="flex items-center gap-1 cursor-pointer"
              onMouseEnter={() => setHoverIdx(String(i))}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color as string }} />
              <span className="font-label text-[9px] text-on-surface-variant truncate max-w-[120px]">
                {d.nombre as string}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
