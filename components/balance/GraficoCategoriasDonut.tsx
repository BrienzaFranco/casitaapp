"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoriaBalance } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";

interface Props {
  registros: CategoriaBalance[];
}

interface DatoDonut {
  id: string;
  nombre: string;
  color: string;
  total: number;
  porcentaje: number;
}

function colorConFallback(color: string | null | undefined) {
  return color || "#6b7280";
}

export function GraficoCategoriasDonut({ registros }: Props) {
  const totalGeneral = useMemo(() => registros.reduce((acumulado, registro) => acumulado + registro.total, 0), [registros]);
  const datos = useMemo<DatoDonut[]>(
    () =>
      registros.map((registro) => ({
        id: registro.categoria.id,
        nombre: registro.categoria.nombre,
        color: colorConFallback(registro.categoria.color),
        total: registro.total,
        porcentaje: totalGeneral > 0 ? (registro.total / totalGeneral) * 100 : 0,
      })),
    [registros, totalGeneral],
  );
  const [idActivo, setIdActivo] = useState<string | null>(datos[0]?.id ?? null);

  const indiceActivo = useMemo(
    () => Math.max(0, datos.findIndex((dato) => dato.id === idActivo)),
    [datos, idActivo],
  );
  const datoActivo = datos[indiceActivo] ?? null;

  return (
    <section className="rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 space-y-1">
        <h2 className="font-headline text-lg font-semibold tracking-tight text-on-surface">
          Distribucion por categoria
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          Selecciona una porcion para ver detalle.
        </p>
      </div>

      {datos.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr] sm:items-center">
          <div className="relative h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datos}
                  dataKey="total"
                  nameKey="nombre"
                  innerRadius={62}
                  outerRadius={92}
                  onMouseEnter={(_, indice) => setIdActivo(datos[indice]?.id ?? null)}
                  onClick={(_, indice) => setIdActivo(datos[indice]?.id ?? null)}
                >
                  {datos.map((dato) => (
                    <Cell
                      key={dato.id}
                      fill={dato.color}
                      fillOpacity={dato.id === datoActivo?.id ? 1 : 0.45}
                      stroke={dato.id === datoActivo?.id ? "var(--outline-variant)" : "transparent"}
                      strokeWidth={dato.id === datoActivo?.id ? 1.5 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(valor) => formatearPeso(Number(valor ?? 0))}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    borderColor: "var(--outline-variant)",
                    backgroundColor: "var(--surface-container-lowest)",
                    color: "var(--on-surface)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Categoria
              </p>
              <p className="mt-1 font-headline text-sm font-semibold text-on-surface">
                {datoActivo?.nombre ?? "Sin datos"}
              </p>
              <p className="mt-1 font-label text-lg font-bold tabular-nums text-primary">
                {datoActivo ? formatearPeso(datoActivo.total) : formatearPeso(0)}
              </p>
              <p className="font-label text-xs text-on-surface-variant">
                {datoActivo ? formatearPorcentaje(datoActivo.porcentaje) : "0%"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {datos.map((dato) => (
              <button
                key={dato.id}
                type="button"
                onClick={() => setIdActivo(dato.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                  dato.id === datoActivo?.id
                    ? "bg-surface-container-high"
                    : "bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: dato.color }}
                  />
                  <span className="font-label text-sm font-medium text-on-surface">
                    {dato.nombre}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-label text-sm font-bold tabular-nums text-on-surface">
                    {formatearPeso(dato.total)}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {formatearPorcentaje(dato.porcentaje)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="font-body text-sm text-on-surface-variant">
          No hay categorias con gasto para graficar.
        </p>
      )}
    </section>
  );
}
