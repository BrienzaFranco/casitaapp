"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoriaBalance } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { Badge } from "@/components/ui/Badge";

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
    <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Distribucion por categoria</h2>
        <p className="text-sm text-gray-500">Selecciona una porcion para ver detalle.</p>
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
                      stroke={dato.id === datoActivo?.id ? "rgba(17,24,39,0.2)" : "transparent"}
                      strokeWidth={dato.id === datoActivo?.id ? 1.5 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(valor) => formatearPeso(Number(valor ?? 0))}
                  contentStyle={{ borderRadius: 16, borderColor: "#e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categoria</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{datoActivo?.nombre ?? "Sin datos"}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-gray-950">
                {datoActivo ? formatearPeso(datoActivo.total) : formatearPeso(0)}
              </p>
              <p className="text-xs text-gray-500">{datoActivo ? formatearPorcentaje(datoActivo.porcentaje) : "0%"}</p>
            </div>
          </div>

          <div className="space-y-2">
            {datos.map((dato) => (
              <button
                key={dato.id}
                type="button"
                onClick={() => setIdActivo(dato.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition ${
                  dato.id === datoActivo?.id
                    ? "border-gray-300 bg-gray-50"
                    : "border-transparent bg-white hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dato.color }} />
                  <Badge color={dato.color}>{dato.nombre}</Badge>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-gray-900">{formatearPeso(dato.total)}</p>
                  <p className="text-xs text-gray-500">{formatearPorcentaje(dato.porcentaje)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No hay categorias con gasto para graficar.</p>
      )}
    </section>
  );
}
