"use client";

import { ChartColumn, Download, PiggyBank, ReceiptText, TrendingUp } from "lucide-react";
import { GraficoCategoriasDonut } from "@/components/balance/GraficoCategoriasDonut";
import { GraficoEtiquetas } from "@/components/balance/GraficoEtiquetas";
import { TablaBalance } from "@/components/balance/TablaBalance";
import { TarjetaResumen } from "@/components/balance/TarjetaResumen";
import { Boton } from "@/components/ui/Boton";
import { BarraProgreso } from "@/components/ui/BarraProgreso";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { usarBalance } from "@/hooks/usarBalance";

export default function PaginaBalance() {
  const balance = usarBalance();

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-56 w-full rounded-[28px]" />
        <Skeleton className="h-56 w-full rounded-[28px]" />
      </div>
    );
  }

  const detalleBalance = balance.resumenMes.deudor
    ? `${balance.resumenMes.deudor} le debe ${formatearPeso(Math.abs(balance.resumenMes.balance))} a ${balance.resumenMes.acreedor}`
    : "No hay deuda entre los dos en este mes.";

  const deudaHistorica = balance.acumulado.deudor
    ? `${balance.acumulado.deudor} le debe ${formatearPeso(Math.abs(balance.acumulado.balance))} a ${balance.acumulado.acreedor}`
    : "No hay deuda acumulada.";
  const detalleVariacionMensual =
    balance.variacionMensual.porcentaje === null
      ? "Sin referencia vs mes anterior"
      : balance.variacionMensual.porcentaje > 0
        ? `+ ${formatearPorcentaje(Math.abs(balance.variacionMensual.porcentaje))} vs mes anterior`
        : balance.variacionMensual.porcentaje < 0
          ? `- ${formatearPorcentaje(Math.abs(balance.variacionMensual.porcentaje))} vs mes anterior`
          : "= 0% vs mes anterior";

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-950">Balance</h2>
          <p className="text-sm text-gray-500">Paneles modulares listos para seguir creciendo.</p>
        </div>
        <input
          type="month"
          value={balance.mesSeleccionado}
          onChange={(event) => balance.setMesSeleccionado(event.target.value)}
          className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <Boton variante="secundario" anchoCompleto onClick={balance.exportar} icono={<Download className="h-4 w-4" />}>
        Exportar Excel
      </Boton>

      <div className="grid grid-cols-1 gap-4">
        <TarjetaResumen
          titulo="Total gastado"
          valor={formatearPeso(balance.resumenMes.total)}
          detalle={detalleVariacionMensual}
          icono={<ReceiptText className="h-5 w-5 text-indigo-600" />}
        />
        <TarjetaResumen
          titulo={`${balance.nombres.franco} pago / ${balance.nombres.fabiola} pago`}
          valor={`${formatearPeso(balance.resumenMes.franco_pago)} / ${formatearPeso(balance.resumenMes.fabiola_pago)}`}
          detalle="Pagado real por cada uno"
          icono={<PiggyBank className="h-5 w-5 text-emerald-600" />}
        />
        <TarjetaResumen
          titulo="Balance del mes"
          valor={formatearPeso(Math.abs(balance.resumenMes.balance))}
          detalle={detalleBalance}
          icono={<TrendingUp className="h-5 w-5 text-amber-500" />}
        />
      </div>

      <TablaBalance filas={balance.resumenHistorico} deudaActual={deudaHistorica} />

      <GraficoCategoriasDonut registros={balance.categoriasMes} />

      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Gastos por categoria</h2>
          <p className="text-sm text-gray-500">Click para desplegar subcategorias y su progreso.</p>
        </div>

        <div className="space-y-3">
          {balance.categoriasMes.length ? (
            balance.categoriasMes.map((registro) => (
              <details key={registro.categoria.id} className="rounded-2xl bg-gray-50 p-3">
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Badge color={registro.categoria.color}>{registro.categoria.nombre}</Badge>
                    <p className="font-mono text-sm font-semibold text-gray-950">{formatearPeso(registro.total)}</p>
                  </div>
                  <div className="w-32 space-y-1">
                    {registro.porcentaje !== null ? (
                      <>
                        <BarraProgreso porcentaje={registro.porcentaje} />
                        <p className="text-right text-xs text-gray-500">{formatearPorcentaje(registro.porcentaje)}</p>
                        {registro.porcentaje > 100 && registro.categoria.limite_mensual ? (
                          <p className="text-right text-[11px] text-red-600">
                            +{formatearPeso(registro.total - Number(registro.categoria.limite_mensual))}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-right text-xs text-gray-500">Sin limite</p>
                    )}
                  </div>
                </summary>

                {registro.subcategorias.length ? (
                  <div className="mt-3 space-y-2">
                    {registro.subcategorias.map((subcategoria) => (
                      <div key={subcategoria.subcategoria.id} className="rounded-2xl border border-gray-100 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">{subcategoria.subcategoria.nombre}</p>
                          <p className="font-mono text-sm font-semibold text-gray-950">{formatearPeso(subcategoria.total)}</p>
                        </div>
                        {subcategoria.porcentaje !== null ? (
                          <div className="mt-2">
                            <BarraProgreso porcentaje={subcategoria.porcentaje} />
                            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                              <span>{formatearPorcentaje(subcategoria.porcentaje)}</span>
                              {subcategoria.porcentaje > 100 && subcategoria.subcategoria.limite_mensual ? (
                                <span className="text-red-600">
                                  +{formatearPeso(subcategoria.total - Number(subcategoria.subcategoria.limite_mensual))}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </details>
            ))
          ) : (
            <p className="text-sm text-gray-500">No hay categorias con gasto en el mes seleccionado.</p>
          )}
        </div>
      </section>

      <GraficoEtiquetas registros={balance.etiquetasMes} />

      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Dias con mas gasto</h2>
          <p className="text-sm text-gray-500">Top 5 del mes seleccionado.</p>
        </div>

        <div className="space-y-3">
          {balance.diasMasGasto.length ? (
            balance.diasMasGasto.map((dia, indice) => (
              <div key={dia.fecha} className="rounded-2xl bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                      {indice + 1}
                    </span>
                    <p className="text-sm font-semibold text-gray-900">{formatearFecha(dia.fecha)}</p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-gray-950">{formatearPeso(dia.total)}</p>
                </div>
                <BarraProgreso porcentaje={(dia.total / (balance.diasMasGasto[0]?.total || 1)) * 100} />
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No hay compras registradas en el periodo.</p>
          )}
        </div>
      </section>

      {/* Panel 6: agregar aca nuevos analisis sin tocar los paneles existentes. */}
      {/* Panel 7: usar el mismo patron modular para sumar nuevas metricas. */}

      <section className="rounded-[28px] border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
        <div className="flex items-center gap-2">
          <ChartColumn className="h-4 w-4 text-indigo-600" />
          Los paneles ya estan separados para crecer sin reescribir la pagina.
        </div>
      </section>
    </section>
  );
}
