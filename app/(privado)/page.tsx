"use client";

import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { usarBalance } from "@/hooks/usarBalance";
import { usarCompras } from "@/hooks/usarCompras";

export default function PaginaInicio() {
  const balance = usarBalance();
  const compras = usarCompras();
  const ultimaCompra = compras.compras[0];
  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  if (balance.compras.cargando || compras.cargando || balance.categorias.cargando || balance.cortes.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Editorial Header */}
      <div className="space-y-1">
        <span className="font-label text-xs uppercase tracking-widest text-outline">
          {mesActual}
        </span>
        <h2 className="font-headline text-3xl font-bold tracking-tighter text-on-surface">
          {formatearPeso(balance.resumenMes.total)}
        </h2>
        {balance.saldoAbierto.deudor ? (
          <p className="font-label text-sm text-secondary">
            {balance.saldoAbierto.deudor} debe {formatearPeso(Math.abs(balance.saldoAbierto.balance))}
          </p>
        ) : (
          <p className="font-label text-sm text-tertiary">Sin deuda abierta</p>
        )}
      </div>

      {/* Stats Grid - Bento compact */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-3">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-outline mb-1">
            {balance.nombres.franco}
          </p>
          <p className="font-label text-lg font-bold tabular-nums text-on-surface">
            {formatearPeso(balance.resumenMes.franco_pago)}
          </p>
        </div>
        <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-3">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-outline mb-1">
            {balance.nombres.fabiola}
          </p>
          <p className="font-label text-lg font-bold tabular-nums text-on-surface">
            {formatearPeso(balance.resumenMes.fabiola_pago)}
          </p>
        </div>
        <div className="bg-surface-container-highest rounded-lg border border-primary/10 p-3 flex flex-col items-center justify-center text-center">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-primary mb-0.5">
            Ver detalle
          </p>
          <Link href="/balance" className="text-primary">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Acciones */}
      <div className="space-y-0">
        <Link
          href="/anotador-rapido"
          className="flex items-center justify-between py-3 border-b border-outline-variant/15 group"
        >
          <div>
            <p className="font-headline text-sm font-semibold text-on-surface">Registro rapido</p>
            <p className="font-body text-xs text-on-surface-variant">Captura una compra en segundos</p>
          </div>
          <ArrowRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />
        </Link>
        <Link
          href="/nueva-compra"
          className="flex items-center justify-between py-3 border-b border-outline-variant/15 group"
        >
          <div>
            <p className="font-headline text-sm font-semibold text-on-surface">Registro completo</p>
            <p className="font-body text-xs text-on-surface-variant">Categorias, notas y reparto fino</p>
          </div>
          <ArrowRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />
        </Link>
        <Link
          href="/historial"
          className="flex items-center justify-between py-3 border-b border-outline-variant/15 group"
        >
          <div>
            <p className="font-headline text-sm font-semibold text-on-surface">Historial</p>
            <p className="font-body text-xs text-on-surface-variant">Todas las compras registradas</p>
          </div>
          <ArrowRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />
        </Link>
      </div>

      {/* Ultima compra */}
      {ultimaCompra ? (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            Ultimo: {formatearFecha(ultimaCompra.fecha)} {ultimaCompra.nombre_lugar ? `en ${ultimaCompra.nombre_lugar}` : ""}
          </span>
        </div>
      ) : null}
    </section>
  );
}
