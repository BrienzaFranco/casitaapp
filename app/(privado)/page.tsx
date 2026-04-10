"use client";

import Link from "next/link";
import { Zap, FileText, LogOut, ChevronRight, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { crearClienteSupabase } from "@/lib/supabase";
import { usarBalance } from "@/hooks/usarBalance";
import { usarCompras } from "@/hooks/usarCompras";

export default function PaginaInicio() {
  const balance = usarBalance();
  const compras = usarCompras();

  const ultimaCompra = compras.compras[0];

  async function cerrarSesion() {
    const cliente = crearClienteSupabase();
    await cliente.auth.signOut();
    window.location.reload();
  }

  if (balance.compras.cargando || compras.cargando || balance.categorias.cargando || balance.cortes.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded" />
        <Skeleton className="h-16 w-full rounded" />
        <Skeleton className="h-16 w-full rounded" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3">
        <Link
          href="/anotador-rapido"
          className="flex items-center gap-4 border border-blue-300 bg-blue-50 p-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-900">Registro rápido</p>
            <p className="text-sm text-gray-600">En 3 segundos</p>
          </div>
          <ChevronRight className="h-5 w-5 text-blue-400" />
        </Link>

        <Link
          href="/nueva-compra"
          className="flex items-center gap-4 border border-gray-300 bg-white p-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
            <FileText className="h-6 w-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-900">Registro completo</p>
            <p className="text-sm text-gray-600">Categorías y detalles</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>

      {ultimaCompra ? (
        <div className="border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              Ultimo: {formatearFecha(ultimaCompra.fecha)} {ultimaCompra.nombre_lugar ? `en ${ultimaCompra.nombre_lugar}` : ""}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Total mes</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{formatearPeso(balance.resumenMes.total)}</p>
        </article>

        <article className="border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Saldo abierto</p>
          <p className="mt-1 text-sm text-gray-900">
            {balance.saldoAbierto.deudor
              ? `${balance.saldoAbierto.deudor} debe ${formatearPeso(Math.abs(balance.saldoAbierto.balance))}`
              : "Sin deuda"}
          </p>
        </article>

        <article className="border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Pagos</p>
          <p className="mt-1 text-sm text-gray-900">
            <span className="text-blue-600">{balance.nombres.franco}</span>: {formatearPeso(balance.resumenMes.franco_pago)}
          </p>
          <p className="text-sm text-gray-900">
            <span className="text-pink-600">{balance.nombres.fabiola}</span>: {formatearPeso(balance.resumenMes.fabiola_pago)}
          </p>
        </article>
      </div>

      <div className="space-y-2">
        <Link
          href="/historial"
          className="flex items-center justify-between border border-gray-200 bg-white p-3"
        >
          <span className="text-sm font-medium text-gray-900">Historial</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
        <Link
          href="/balance"
          className="flex items-center justify-between border border-gray-200 bg-white p-3"
        >
          <span className="text-sm font-medium text-gray-900">Balance</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>

      <div className="space-y-2 pt-4">
        <p className="px-1 text-xs font-semibold uppercase text-gray-500">Configuración</p>
        <Link
          href="/configuracion"
          className="flex items-center justify-between border border-gray-200 bg-white p-3"
        >
          <span className="text-sm font-medium text-gray-900">Categorías y etiquetas</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex w-full items-center justify-between border border-red-200 bg-white p-3 text-left"
        >
          <span className="text-sm font-medium text-red-600">Cerrar sesión</span>
          <LogOut className="h-4 w-4 text-red-400" />
        </button>
      </div>
    </section>
  );
}
