"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { TarjetaResumen } from "@/components/balance/TarjetaResumen";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { usarBalance } from "@/hooks/usarBalance";
import { usarCompras } from "@/hooks/usarCompras";

export default function PaginaInicio() {
  const balance = usarBalance();
  const compras = usarCompras();
  const ultimaCompra = compras.compras[0];
  const totalMes = balance.resumenMes.total || 1;

  if (balance.compras.cargando || compras.cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-32 w-full rounded-[28px]" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Hola de nuevo</p>
          <h1 className="text-2xl font-bold text-gray-950">Resumen del mes</h1>
        </div>
        <Link
          href="/nueva-compra"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>

      {ultimaCompra ? (
        <div className="rounded-2xl bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Ultimo registro: {formatearFecha(ultimaCompra.fecha)}</span>
            {ultimaCompra.nombre_lugar ? <span>en {ultimaCompra.nombre_lugar}</span> : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TarjetaResumen
          titulo="Total mes"
          valor={formatearPeso(balance.resumenMes.total)}
          icono={<TrendingUp className="h-5 w-5 text-indigo-600" />}
        />
        <TarjetaResumen
          titulo="Balance"
          valor={formatearPeso(Math.abs(balance.resumenMes.balance))}
          detalle={balance.resumenMes.deudor ? `Debe ${balance.resumenMes.deudor}` : "Sin deuda"}
          icono={<TrendingDown className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-900">Quien pago este mes</p>
        <div className="mb-2 flex h-3 overflow-hidden rounded-full">
          <div className="bg-indigo-500" style={{ width: `${(balance.resumenMes.franco_pago / totalMes) * 100}%` }} />
          <div className="bg-emerald-500" style={{ width: `${(balance.resumenMes.fabiola_pago / totalMes) * 100}%` }} />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-medium text-indigo-600">
            {balance.nombres.franco}: {formatearPeso(balance.resumenMes.franco_pago)}
          </span>
          <span className="font-medium text-emerald-600">
            {balance.nombres.fabiola}: {formatearPeso(balance.resumenMes.fabiola_pago)}
          </span>
        </div>
      </section>

      <div className="space-y-2">
        <Link
          href="/historial"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <span className="text-sm font-semibold text-gray-900">Ver historial completo</span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
        <Link
          href="/balance"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <span className="text-sm font-semibold text-gray-900">Analisis detallado</span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>
    </section>
  );
}
