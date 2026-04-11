"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { GraficoCategoriasDonut } from "@/components/balance/GraficoCategoriasDonut";
import { GraficoEtiquetas } from "@/components/balance/GraficoEtiquetas";
import { ResumenDeuda } from "@/components/balance/ResumenDeuda";
import { TablaBalance } from "@/components/balance/TablaBalance";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import { usarBalance } from "@/hooks/usarBalance";

function hoyIso() { return fechaLocalISO(); }

export default function PaginaBalance() {
  const balance = usarBalance();
  const [fechaCorte, setFechaCorte] = useState("");
  const [notaCorte, setNotaCorte] = useState("");
  const fechaCorteEditable = fechaCorte || balance.cortes.corteActivo?.fecha_corte || hoyIso();

  const deudaHistorica = balance.acumulado.deudor
    ? `${balance.acumulado.deudor} le debe ${formatearPeso(Math.abs(balance.acumulado.balance))} a ${balance.acumulado.acreedor}`
    : "No hay deuda acumulada.";

  const cortesLog = useMemo(() => balance.cortes.cortes.slice(0, 5), [balance.cortes.cortes]);
  const detalleVariacion = balance.variacionMensual.porcentaje === null
    ? "Sin referencia vs mes anterior"
    : balance.variacionMensual.porcentaje > 0
      ? `+ ${formatearPorcentaje(Math.abs(balance.variacionMensual.porcentaje))} vs mes anterior`
      : balance.variacionMensual.porcentaje < 0
        ? `- ${formatearPorcentaje(Math.abs(balance.variacionMensual.porcentaje))} vs mes anterior`
        : "= 0% vs mes anterior";

  async function marcarCorte() {
    try {
      await balance.cortes.crearCorte({
        fecha_corte: fechaCorteEditable,
        nota: notaCorte,
        hogar_id: balance.compras.compras[0]?.hogar_id ?? null,
        actualizado_por: balance.usuario.perfil?.nombre ?? "Sistema",
      });
      toast.success("Corte actualizado.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar el corte.";
      toast.error(msg);
    }
  }

  async function quedarAManoHoy() {
    try {
      const hoy = hoyIso();
      const resumen = balance.saldoAbierto.deudor
        ? `${balance.saldoAbierto.deudor} debia ${formatearPeso(Math.abs(balance.saldoAbierto.balance))} a ${balance.saldoAbierto.acreedor}`
        : "sin deuda abierta";
      await balance.cortes.crearCorte({
        fecha_corte: hoy,
        nota: `Quedar a mano hoy (${hoy}): ${resumen}.`,
        hogar_id: balance.compras.compras[0]?.hogar_id ?? null,
        actualizado_por: balance.usuario.perfil?.nombre ?? "Sistema",
      });
      setFechaCorte(hoy);
      setNotaCorte("");
      toast.success("Listo: se marco corte y quedaron a mano desde hoy.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo marcar el corte.";
      toast.error(msg);
    }
  }

  const sinCompras = !balance.compras.cargando && balance.compras.compras.length === 0;

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando || balance.cortes.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    );
  }

  if (sinCompras) {
    return (
      <section className="space-y-3">
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Balance</p>
          <h2 className="mt-1 font-headline text-2xl font-semibold tracking-tight text-on-surface">Balance y deuda</h2>
          <p className="text-sm text-on-surface-variant">Sin compras registradas.</p>
        </div>
        <article className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-8 text-center">
          <p className="text-on-surface-variant">Registra compras para ver el balance.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Deuda actual - prominente */}
      {balance.saldoAbierto.deudor ? (
        <div className="bg-secondary/10 rounded-lg border border-secondary/20 p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-secondary mb-1">Deuda actual</p>
          <p className="font-label text-2xl font-bold text-secondary">
            {balance.saldoAbierto.deudor} le debe {formatearPeso(Math.abs(balance.saldoAbierto.balance))}
          </p>
          <p className="font-label text-xs text-on-surface-variant mt-0.5">
            a {balance.saldoAbierto.acreedor}
          </p>
          <button
            type="button"
            onClick={() => void quedarAManoHoy()}
            disabled={balance.cortes.guardando}
            className="mt-3 h-8 px-4 rounded bg-tertiary font-label text-[10px] font-bold uppercase tracking-wider text-on-tertiary hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
          >
            Quedar a mano
          </button>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-lg p-5 text-center">
          <p className="font-label text-[10px] uppercase tracking-widest text-tertiary mb-1">Deuda actual</p>
          <p className="font-label text-2xl font-bold text-tertiary">A mano</p>
          <p className="font-label text-xs text-on-surface-variant mt-0.5">Nadie debe nada.</p>
        </div>
      )}

      {/* Total del mes + quien pago */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-container-lowest rounded-lg p-3">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Total mes</p>
          <p className="font-label text-xl font-bold tabular-nums text-on-surface">{formatearPeso(balance.resumenMes.total)}</p>
          <p className="font-label text-[10px] text-on-surface-variant mt-0.5">{detalleVariacion}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-lg p-3">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Deuda acumulada</p>
          {balance.acumulado.deudor ? (
            <p className="font-label text-sm tabular-nums text-secondary">
              {balance.acumulado.deudor} le debe {formatearPeso(Math.abs(balance.acumulado.balance))} a {balance.acumulado.acreedor}
            </p>
          ) : (
            <p className="font-label text-sm text-tertiary">Sin deuda</p>
          )}
        </div>
      </div>

      {/* Mes selector + exportar */}
      <div className="flex items-center justify-between">
        <input
          type="month"
          value={balance.mesSeleccionado}
          onChange={(e) => balance.setMesSeleccionado(e.target.value)}
          className="h-8 rounded bg-surface-container-low border-b border-outline/20 px-2 font-label text-xs tabular-nums outline-none"
        />
        <button
          type="button"
          onClick={balance.exportar}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container-highest transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Exportar
        </button>
      </div>

      {/* Corte de cuentas */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-2">Corte de cuentas</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-label text-[9px] text-on-surface-variant">Fecha</span>
            <input type="date" value={fechaCorteEditable} onChange={(e) => setFechaCorte(e.target.value)}
              className="h-8 rounded bg-surface-container-low border-b border-outline/20 px-2 font-label text-xs outline-none" />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[100px]">
            <span className="font-label text-[9px] text-on-surface-variant">Nota</span>
            <input type="text" value={notaCorte} onChange={(e) => setNotaCorte(e.target.value)}
              placeholder="Ej: transferencia..."
              className="h-8 rounded bg-surface-container-low border-b border-outline/20 px-2 font-label text-xs outline-none placeholder:text-on-surface-variant/50" />
          </label>
          <button type="button" onClick={() => void marcarCorte()} disabled={balance.cortes.guardando}
            className="h-8 rounded bg-primary px-3 font-label text-[10px] font-bold uppercase tracking-wider text-on-primary disabled:opacity-50 transition-colors">
            {balance.cortes.guardando ? "..." : "Guardar"}
          </button>
        </div>
        {cortesLog.length > 0 && (
          <div className="mt-2 pt-2 border-t border-outline-variant/10">
            {cortesLog.slice(0, 3).map((corte) => (
              <div key={corte.id} className="flex items-center justify-between py-1">
                <span className="font-label text-xs tabular-nums text-on-surface-variant">
                  {formatearFecha(corte.fecha_corte)}{corte.activo ? " (activo)" : ""}
                </span>
                <span className="font-label text-xs text-on-surface-variant truncate ml-2">{corte.nota || "Sin nota"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen de deuda - analisis detallado */}
      <ResumenDeuda
        compras={balance.compras.compras.filter(c => c.estado !== "borrador")}
        nombres={balance.nombres}
        onQuedarAMano={quedarAManoHoy}
      />

      {/* Charts - responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <TablaBalance filas={balance.resumenHistorico} deudaActual={deudaHistorica} />
        </div>
        <div className="space-y-4">
          <GraficoCategoriasDonut registros={balance.categoriasMes} />
          <GraficoEtiquetas registros={balance.etiquetasMes} />
        </div>
      </div>
    </section>
  );
}
