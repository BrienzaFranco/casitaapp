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
    <section className="space-y-5">
      <section className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-[linear-gradient(135deg,#fffdf9_0%,#f5ecde_65%,#eef4ff_100%)] p-5 shadow-[var(--shadow-soft)] md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 backdrop-blur">
              tablero diario
            </div>
            <div className="space-y-2">
              <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
                Una vista clara para cargar gastos sin friccion y entender el mes de un vistazo.
              </h2>
              <p className="max-w-xl text-sm text-[var(--muted)] md:text-base">
                Registra rapido cuando estas apurado, pasa a detalle cuando hace falta, y deja que el historial haga el resto.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/anotador-rapido"
                className="group flex items-center gap-4 rounded-[28px] border border-blue-200 bg-slate-950 p-4 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">Registro rapido</p>
                  <p className="text-sm text-slate-300">Captura una compra en segundos</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/nueva-compra"
                className="group flex items-center gap-4 rounded-[28px] border border-[var(--border)] bg-white/85 p-4 text-slate-900 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <FileText className="h-6 w-6 text-amber-700" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">Registro completo</p>
                  <p className="text-sm text-[var(--muted)]">Categorias, notas y reparto fino</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <article className="rounded-[28px] border border-white/80 bg-white/80 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Total del mes</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-slate-950">{formatearPeso(balance.resumenMes.total)}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Lo que llevan gastado entre ambos este mes.</p>
            </article>

            <article className="rounded-[28px] border border-white/80 bg-white/70 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Saldo abierto</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">
                {balance.saldoAbierto.deudor
                  ? `${balance.saldoAbierto.deudor} debe ${formatearPeso(Math.abs(balance.saldoAbierto.balance))}`
                  : "Sin deuda abierta"}
              </p>
            </article>
          </div>
        </div>
      </section>

      {ultimaCompra ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              Ultimo: {formatearFecha(ultimaCompra.fecha)} {ultimaCompra.nombre_lugar ? `en ${ultimaCompra.nombre_lugar}` : ""}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Total mes</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{formatearPeso(balance.resumenMes.total)}</p>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Saldo abierto</p>
          <p className="mt-3 text-sm text-slate-900">
            {balance.saldoAbierto.deudor
              ? `${balance.saldoAbierto.deudor} debe ${formatearPeso(Math.abs(balance.saldoAbierto.balance))}`
              : "Sin deuda"}
          </p>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Pagos</p>
          <p className="mt-3 text-sm text-slate-900">
            <span className="text-blue-600">{balance.nombres.franco}</span>: {formatearPeso(balance.resumenMes.franco_pago)}
          </p>
          <p className="text-sm text-slate-900">
            <span className="text-pink-600">{balance.nombres.fabiola}</span>: {formatearPeso(balance.resumenMes.fabiola_pago)}
          </p>
        </article>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Link
          href="/historial"
          className="group flex items-center justify-between rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
        >
          <span className="text-sm font-medium text-slate-900">Historial</span>
          <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/balance"
          className="group flex items-center justify-between rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
        >
          <span className="text-sm font-medium text-slate-900">Balance</span>
          <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="space-y-2 pt-4">
        <p className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Configuracion</p>
        <Link
          href="/configuracion"
          className="group flex items-center justify-between rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
        >
          <span className="text-sm font-medium text-slate-900">Categorias y etiquetas</span>
          <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
        </Link>
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex w-full items-center justify-between rounded-[28px] border border-red-200 bg-[var(--surface-strong)] p-4 text-left shadow-[var(--shadow-soft)]"
        >
          <span className="text-sm font-medium text-red-600">Cerrar sesion</span>
          <LogOut className="h-4 w-4 text-red-400" />
        </button>
      </div>
    </section>
  );
}
