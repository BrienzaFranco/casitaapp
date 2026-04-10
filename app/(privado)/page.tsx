"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { usarBalance } from "@/hooks/usarBalance";
import { usarCompras } from "@/hooks/usarCompras";

export default function PaginaInicio() {
  const balance = usarBalance();
  const compras = usarCompras();

  const ultimaCompra = compras.compras[0];

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
    <section className="space-y-6">
      {/* Resumen del mes - limpio y directo */}
      <div className="space-y-1">
        <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </p>
        <p className="font-label text-3xl font-bold tracking-tight tabular-nums text-primary">
          {formatearPeso(balance.resumenMes.total)}
        </p>
        {balance.saldoAbierto.deudor && (
          <p className="font-label text-sm text-secondary">
            {balance.saldoAbierto.deudor} debe {formatearPeso(Math.abs(balance.saldoAbierto.balance))}
          </p>
        )}
        {!balance.saldoAbierto.deudor && (
          <p className="font-label text-sm text-tertiary">Sin deuda abierta</p>
        )}
      </div>

      {/* Acciones principales - texto simple, no cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/anotador-rapido"
          className="flex items-center gap-3 py-3 border-b border-outline-variant/20 hover:border-primary transition-colors group"
        >
          <div className="flex-1 text-left">
            <p className="font-headline text-base font-semibold text-on-surface">Registro rapido</p>
            <p className="font-body text-sm text-on-surface-variant">Captura una compra en segundos</p>
          </div>
          <span className="text-on-surface-variant group-hover:text-primary transition-colors">→</span>
        </Link>

        <Link
          href="/nueva-compra"
          className="flex items-center gap-3 py-3 border-b border-outline-variant/20 hover:border-primary transition-colors group"
        >
          <div className="flex-1 text-left">
            <p className="font-headline text-base font-semibold text-on-surface">Registro completo</p>
            <p className="font-body text-sm text-on-surface-variant">Categorias, notas y reparto fino</p>
          </div>
          <span className="text-on-surface-variant group-hover:text-primary transition-colors">→</span>
        </Link>
      </div>

      {/* Ultima compra */}
      {ultimaCompra ? (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Calendar className="h-4 w-4" />
          <span>
            Ultimo: {formatearFecha(ultimaCompra.fecha)} {ultimaCompra.nombre_lugar ? `en ${ultimaCompra.nombre_lugar}` : ""}
          </span>
        </div>
      ) : null}

      {/* Pagos desglose */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {balance.nombres.franco}
          </p>
          <p className="font-label text-lg font-bold tabular-nums text-on-surface">
            {formatearPeso(balance.resumenMes.franco_pago)}
          </p>
        </div>
        <div>
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {balance.nombres.fabiola}
          </p>
          <p className="font-label text-lg font-bold tabular-nums text-on-surface">
            {formatearPeso(balance.resumenMes.fabiola_pago)}
          </p>
        </div>
        <div>
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Total
          </p>
          <p className="font-label text-lg font-bold tabular-nums text-primary">
            {formatearPeso(balance.resumenMes.total)}
          </p>
        </div>
      </div>
    </section>
  );
}
