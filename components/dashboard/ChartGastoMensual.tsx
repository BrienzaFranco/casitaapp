"use client";

import { Bar } from "react-chartjs-2";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import type { Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";
import { registerCharts } from "@/lib/chart";
import ModalExpensesDashboard from "./ModalExpensesDashboard";

interface Props {
  compras: Compra[];
}

function formatearMesLabel(mes: string): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

export function ChartGastoMensual({ compras }: Props) {
  const [ready, setReady] = useState(false);
  const [modalMes, setModalMes] = useState<string | null>(null);

  useEffect(() => { registerCharts(); setReady(true); }, []);

  const porMes = useMemo(() => {
    const mapa = new Map<string, { total: number; compras: Compra[] }>();
    for (const compra of compras) {
      if (compra.estado === "borrador") continue;
      const clave = mesClave(compra.fecha);
      const actual = mapa.get(clave) ?? { total: 0, compras: [] };
      actual.total += compra.items.reduce((a, i) => a + i.monto_resuelto, 0);
      actual.compras.push(compra);
      mapa.set(clave, actual);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mes, data]) => ({ mes, ...data }));
  }, [compras]);

  if (!porMes.length) return null;

  const comprasDelMes = modalMes ? (porMes.find(p => p.mes === modalMes)?.compras ?? []) : null;

  const colors = porMes.map((_, i) =>
    i === porMes.length - 1 ? "var(--secondary)" : "var(--primary)"
  );

  return (
    <>
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Gasto mensual
            </h2>
          </div>
          <p className="font-label text-[10px] text-on-surface-variant">Ultimos 12 meses · clic para ver compras</p>
        </div>

        <div className="p-4">
          <div className="w-full" style={{ minHeight: "224px" }}>
            <Bar
              data={{
                labels: porMes.map(d => formatearMesLabel(d.mes)),
                datasets: [{
                  data: porMes.map(d => d.total),
                  backgroundColor: colors,
                  borderRadius: [6, 6, 0, 0],
                  borderSkipped: false,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
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
                    ticks: { font: { size: 9 }, color: "var(--on-surface-variant)", maxRotation: 45 },
                  },
                  y: {
                    grid: { color: "rgba(107,114,128,0.08)" },
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
                    setModalMes(porMes[elements[0].index]?.mes ?? null);
                  }
                },
              }}
            />
          </div>
        </div>
      </section>

      {comprasDelMes && modalMes && (
        <ModalExpensesDashboard
          titulo={`Mes: ${formatearMesLabel(modalMes)}`}
          compras={comprasDelMes}
          onClose={() => setModalMes(null)}
        />
      )}
    </>
  );
}
