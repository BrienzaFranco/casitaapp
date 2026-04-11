"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Zap, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { usarBalance } from "@/hooks/usarBalance";
import { usarCompras } from "@/hooks/usarCompras";

export default function PaginaInicio() {
  const balance = usarBalance();
  const compras = usarCompras();
  const ultimaCompra = compras.compras[0];
  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const mesClave = new Date().toISOString().slice(0, 7);

  if (balance.compras.cargando || compras.cargando || balance.categorias.cargando || balance.cortes.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  // Compras de este mes
  const comprasMes = compras.compras.filter(c => c.fecha.startsWith(mesClave));
  const totalMes = comprasMes.reduce((a, c) => a + c.items.reduce((b, i) => b + i.monto_resuelto, 0), 0);
  const pagoFrancoMes = comprasMes.reduce((a, c) => a + c.items.reduce((b, i) => b + i.pago_franco, 0), 0);
  const pagoFabiolaMes = comprasMes.reduce((a, c) => a + c.items.reduce((b, i) => b + i.pago_fabiola, 0), 0);

  return (
    <section className="space-y-5">
      {/* Editorial Header - este mes */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-label text-xs uppercase tracking-widest text-outline">
            {mesActual}
          </span>
          <Link href="/historial" className="font-label text-[10px] text-on-surface-variant hover:text-on-surface underline underline-offset-2">
            Ver todos los meses
          </Link>
        </div>
        <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
          {formatearPeso(totalMes)}
        </h2>
        <p className="font-label text-xs text-on-surface-variant">
          {comprasMes.length} {comprasMes.length === 1 ? "compra" : "compras"} registradas
        </p>
        {balance.saldoAbierto.deudor ? (
          <p className="font-label text-sm text-secondary">
            {balance.saldoAbierto.deudor} debe {formatearPeso(Math.abs(balance.saldoAbierto.balance))}
          </p>
        ) : (
          <p className="font-label text-sm text-tertiary">Sin deuda abierta</p>
        )}
      </div>

      {/* Stats: gastos por persona este mes */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container-low rounded-lg p-3">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-outline mb-1">
            {balance.nombres.franco}
          </p>
          <p className="font-label text-base font-bold tabular-nums text-on-surface">
            {formatearPeso(pagoFrancoMes)}
          </p>
          <p className="font-label text-[8px] text-on-surface-variant mt-0.5">este mes</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-outline mb-1">
            {balance.nombres.fabiola}
          </p>
          <p className="font-label text-base font-bold tabular-nums text-on-surface">
            {formatearPeso(pagoFabiolaMes)}
          </p>
          <p className="font-label text-[8px] text-on-surface-variant mt-0.5">este mes</p>
        </div>
        <Link href="/balance" className="bg-surface-container-highest rounded-lg p-3 flex flex-col items-center justify-center text-center hover:bg-surface-container transition-colors">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-primary mb-0.5">
            Balance
          </p>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      </div>

      {/* Acciones principales - botones coloridos */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/anotador-rapido"
          className="flex items-center gap-3 p-4 rounded-xl bg-secondary/90 text-on-secondary hover:bg-secondary active:scale-[0.98] transition-all shadow-md shadow-secondary/20"
        >
          <div className="bg-white/20 rounded-lg p-2">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-headline text-sm font-bold">Registro rapido</p>
            <p className="text-[10px] opacity-80">En segundos</p>
          </div>
        </Link>
        <Link
          href="/nueva-compra"
          className="flex items-center gap-3 p-4 rounded-xl bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
        >
          <div className="bg-white/20 rounded-lg p-2">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-headline text-sm font-bold">Registro completo</p>
            <p className="text-[10px] opacity-80">Con detalle</p>
          </div>
        </Link>
      </div>

      {/* Historial link */}
      <Link
        href="/historial"
        className="flex items-center justify-between py-2.5 border-b border-outline-variant/15 group"
      >
        <div>
          <p className="font-headline text-sm font-semibold text-on-surface">Historial</p>
          <p className="font-body text-xs text-on-surface-variant">{compras.compras.length} compras en total</p>
        </div>
        <ArrowRight className="h-4 w-4 text-on-surface-variant group-hover:text-on-surface transition-colors" />
      </Link>

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
