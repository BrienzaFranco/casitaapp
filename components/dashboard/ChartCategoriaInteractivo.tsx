"use client";

import { Doughnut } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { PieChart } from "lucide-react";
import type { Categoria, CategoriaBalance, Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { registerCharts } from "@/lib/chart";
import ModalExpensesDashboard from "./ModalExpensesDashboard";

interface Props {
  registros: CategoriaBalance[];
  comprasMes: Compra[];
}

export function ChartCategoriaInteractivo({ registros, comprasMes }: Props) {
  const [ready, setReady] = useState(false);
  const [modalCat, setModalCat] = useState<Categoria | null>(null);

  useEffect(() => { registerCharts(); setReady(true); }, []);

  const datos = registros.filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  const totalGeneral = datos.reduce((acc, r) => acc + r.total, 0);

  if (!ready || !datos.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 shadow-sm">
        <p className="font-label text-xs text-on-surface-variant">No hay categorias con gasto para graficar.</p>
      </section>
    );
  }

  const comprasDeCategoria = modalCat
    ? comprasMes.filter(c => c.items.some(i => i.categoria_id === modalCat.id))
    : null;

  return (
    <>
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Distribucion por categoria
            </h2>
          </div>
          <p className="font-label text-[10px] text-on-surface-variant">Clic en un segmento para ver compras</p>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative flex items-center justify-center">
            <Doughnut
              data={{
                labels: datos.map(d => d.categoria.nombre),
                datasets: [{
                  data: datos.map(d => d.total),
                  backgroundColor: datos.map(d => d.categoria.color || "#6b7280"),
                  borderWidth: 0,
                  hoverBorderWidth: 2,
                  hoverBorderColor: "var(--outline-variant)",
                }],
              }}
              options={{
                responsive: true,
                cutout: "65%",
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const pct = totalGeneral > 0 ? ((ctx.parsed as number / totalGeneral) * 100).toFixed(0) : "0";
                        return ` ${formatearPeso(ctx.parsed as number)} (${pct}%)`;
                      },
                    },
                  },
                },
                onClick: (_evt, elements) => {
                  if (elements.length > 0) {
                    const cat = datos[elements[0].index]?.categoria;
                    if (cat) setModalCat(cat);
                  }
                },
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Total</p>
              <p className="font-label text-lg font-bold tabular-nums text-primary mt-0.5">
                {formatearPeso(totalGeneral)}
              </p>
            </div>
          </div>

          <div className="space-y-0 divide-y divide-outline-variant/10">
            {datos.map((d) => {
              const pct = totalGeneral > 0 ? ((d.total / totalGeneral) * 100).toFixed(0) : "0";
              return (
                <button
                  key={d.categoria.id}
                  type="button"
                  onClick={() => setModalCat(d.categoria)}
                  className="w-full flex items-center justify-between py-2 hover:bg-surface-container-high rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.categoria.color }} />
                    <span className="font-label text-xs font-medium text-on-surface">{d.categoria.nombre}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-label text-xs font-bold tabular-nums text-on-surface">
                      {formatearPeso(d.total)}
                    </p>
                    <p className="font-label text-[10px] text-on-surface-variant">{pct}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {comprasDeCategoria && modalCat && (
        <ModalExpensesDashboard
          titulo={`Categoria: ${modalCat.nombre}`}
          compras={comprasDeCategoria}
          onClose={() => setModalCat(null)}
        />
      )}
    </>
  );
}
