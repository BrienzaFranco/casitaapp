"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { usarBalance } from "@/hooks/usarBalance";
import { usarCompras } from "@/hooks/usarCompras";

export default function PaginaInicio() {
  const balance = usarBalance();
  const compras = usarCompras();
  const [creandoCategoriasBasicas, setCreandoCategoriasBasicas] = useState(false);

  const ultimaCompra = compras.compras[0];
  const sinCompras = compras.compras.length === 0;
  const sinCategorias = !balance.categorias.cargando && balance.categorias.categorias.length === 0;

  const detalleVariacionMensual =
    balance.variacionMensual.porcentaje === null
      ? "Sin referencia vs mes anterior"
      : balance.variacionMensual.porcentaje > 0
        ? `+ ${formatearPorcentaje(Math.abs(balance.variacionMensual.porcentaje))} vs mes anterior`
        : balance.variacionMensual.porcentaje < 0
          ? `- ${formatearPorcentaje(Math.abs(balance.variacionMensual.porcentaje))} vs mes anterior`
          : "= 0% vs mes anterior";

  const detalleSaldoAbierto = balance.saldoAbierto.deudor
    ? `${balance.saldoAbierto.deudor} debe ${formatearPeso(Math.abs(balance.saldoAbierto.balance))} a ${balance.saldoAbierto.acreedor}`
    : "No hay deuda abierta";

  async function crearCategoriasBasicas() {
    try {
      setCreandoCategoriasBasicas(true);
      await balance.categorias.crearCategoriasBasicas();
      toast.success("Categorias basicas configuradas");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudieron crear las categorias basicas.";
      toast.error(mensaje);
    } finally {
      setCreandoCategoriasBasicas(false);
    }
  }

  if (balance.compras.cargando || compras.cargando || balance.categorias.cargando || balance.cortes.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-32 w-full rounded" />
        <Skeleton className="h-32 w-full rounded" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 border border-gray-300 bg-white p-3">
        <div>
          <p className="text-sm text-gray-600">Resumen rapido</p>
          <h1 className="text-xl font-semibold text-gray-900">Inicio</h1>
        </div>
        <Link
          href="/anotador-rapido"
          aria-label="Abrir anotador rapido"
          title="Abrir anotador rapido"
          className="inline-flex h-10 items-center justify-center gap-1 rounded bg-blue-600 px-3 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Anotar rapido
        </Link>
      </div>

      {ultimaCompra ? (
        <div className="border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              Ultimo registro: {formatearFecha(ultimaCompra.fecha)} {ultimaCompra.nombre_lugar ? `en ${ultimaCompra.nombre_lugar}` : ""}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Total mes</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatearPeso(balance.resumenMes.total)}</p>
          <p className="text-sm text-gray-600">{detalleVariacionMensual}</p>
        </article>

        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Saldo abierto</p>
          <p className="mt-1 text-sm text-gray-900">{detalleSaldoAbierto}</p>
          <p className="mt-1 text-xs text-gray-600">
            {balance.cortes.corteActivo
              ? `Corte activo hasta ${formatearFecha(balance.cortes.corteActivo.fecha_corte)}`
              : "Sin corte activo"}
          </p>
        </article>

        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Pagado por persona</p>
          <p className="text-sm text-gray-900">
            {balance.nombres.franco}: <span className="font-mono">{formatearPeso(balance.resumenMes.franco_pago)}</span>
          </p>
          <p className="text-sm text-gray-900">
            {balance.nombres.fabiola}: <span className="font-mono">{formatearPeso(balance.resumenMes.fabiola_pago)}</span>
          </p>
        </article>
      </div>

      {sinCompras ? (
        <section className="border border-gray-300 bg-white p-4">
          <p className="text-base font-semibold text-gray-900">No hay compras cargadas</p>
          <p className="mt-1 text-sm text-gray-600">Empiecen por una compra y despues completen el resto por lotes.</p>
          <Link
            href="/nueva-compra"
            className="mt-3 inline-flex h-10 items-center justify-center rounded bg-blue-600 px-3 text-sm font-medium text-white"
          >
            Cargar primera compra
          </Link>
        </section>
      ) : null}

      {sinCategorias ? (
        <section className="border border-gray-300 bg-white p-4">
          <p className="text-base font-semibold text-gray-900">Faltan categorias base</p>
          <p className="mt-1 text-sm text-gray-600">Puedes crearlas en un clic y ajustarlas despues.</p>
          <button
            type="button"
            onClick={() => void crearCategoriasBasicas()}
            disabled={creandoCategoriasBasicas}
            className="mt-3 h-10 rounded bg-blue-600 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {creandoCategoriasBasicas ? "Configurando..." : "Configurar categorias basicas"}
          </button>
        </section>
      ) : null}

      <div className="space-y-2">
        <Link href="/historial" className="flex items-center justify-between border border-gray-300 bg-white p-3">
          <span className="text-sm font-medium text-gray-900">Ver historial</span>
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </Link>
        <Link href="/balance" className="flex items-center justify-between border border-gray-300 bg-white p-3">
          <span className="text-sm font-medium text-gray-900">Ver balance completo</span>
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </Link>
      </div>
    </section>
  );
}
