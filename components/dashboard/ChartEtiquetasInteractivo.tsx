"use client";

import { Bar } from "react-chartjs-2";
import { useState } from "react";
import { Tag } from "lucide-react";
import type { EtiquetaBalance, Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import ModalExpensesDashboard from "./ModalExpensesDashboard";

interface Props {
  registros: EtiquetaBalance[];
  comprasMes: Compra[];
}

export function ChartEtiquetasInteractivo({ registros, comprasMes }: Props) {
  const [modalEtiqueta, setModalEtiqueta] = useState<string | null>(null);

  const datos = registros.filter(r => r.total > 0).sort((a, b) => b.total - a.total);

  if (!datos.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 shadow-sm">
        <p className="font-label text-xs text-on-surface-variant">No hubo etiquetas usadas este mes.</p>
      </section>
    );
  }

  const comprasDeEtiqueta = modalEtiqueta
    ? comprasMes.filter(c => c.items.some(i => i.etiquetas.some(e => e.id === modalEtiqueta)))
    : null;

  const etiquetaNombre = datos.find(d => d.etiqueta.id === modalEtiqueta)?.etiqueta.nombre ?? "";

  return (
    <>
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Gastos por etiqueta
            </h2>
          </div>
          <p className="font-label text-[10px] text-on-surface-variant">Clic en una barra para ver compras</p>
        </div>

        <div className="p-4">
          <div className="w-full" style={{ minHeight: "200px" }}>
            <Bar
              data={{
                labels: datos.map(d => d.etiqueta.nombre),
                datasets: [{
                  data: datos.map(d => d.total),
                  backgroundColor: datos.map(d => d.etiqueta.color || "#6b7280"),
                  borderRadius: 6,
                  borderSkipped: false,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "x",
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ` ${formatearPeso(ctx.parsed.y as number)}`,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 10 }, color: "var(--on-surface-variant)" },
                  },
                  y: {
                    grid: { color: "rgba(107,114,128,0.1)" },
                    border: { display: false },
                    ticks: {
                      font: { size: 9 },
                      color: "var(--on-surface-variant)",
                      callback: (v) => formatearPeso(Number(v)),
                    },
                  },
                },
                onClick: (_evt, elements) => {
                  if (elements.length > 0) {
                    setModalEtiqueta(datos[elements[0].index]?.etiqueta.id ?? null);
                  }
                },
              }}
            />
          </div>

          <div className="mt-3 space-y-0 divide-y divide-outline-variant/10">
            {datos.map((d) => (
              <button
                key={d.etiqueta.id}
                type="button"
                onClick={() => setModalEtiqueta(d.etiqueta.id)}
                className="w-full flex items-center justify-between py-2 hover:bg-surface-container-high rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.etiqueta.color }} />
                  <span className="font-label text-xs font-medium text-on-surface">{d.etiqueta.nombre}</span>
                  <span className="font-label text-[10px] text-on-surface-variant">{d.cantidad_items} items</span>
                </div>
                <span className="font-label text-sm font-bold tabular-nums text-on-surface">
                  {formatearPeso(d.total)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {comprasDeEtiqueta && (
        <ModalExpensesDashboard
          titulo={`Etiqueta: ${etiquetaNombre}`}
          compras={comprasDeEtiqueta}
          onClose={() => setModalEtiqueta(null)}
        />
      )}
    </>
  );
}
