"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { GraficoCategoriasDonut } from "@/components/balance/GraficoCategoriasDonut";
import { GraficoEtiquetas } from "@/components/balance/GraficoEtiquetas";
import { TablaBalance } from "@/components/balance/TablaBalance";
import { Boton } from "@/components/ui/Boton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import { usarBalance } from "@/hooks/usarBalance";

function hoyIso() {
  return fechaLocalISO();
}

export default function PaginaBalance() {
  const balance = usarBalance();
  const [fechaCorte, setFechaCorte] = useState("");
  const [notaCorte, setNotaCorte] = useState("");
  const fechaCorteEditable = fechaCorte || balance.cortes.corteActivo?.fecha_corte || hoyIso();

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
    : "No hay deuda abierta.";

  const deudaHistorica = balance.acumulado.deudor
    ? `${balance.acumulado.deudor} le debe ${formatearPeso(Math.abs(balance.acumulado.balance))} a ${balance.acumulado.acreedor}`
    : "No hay deuda acumulada.";

  const cortesLog = useMemo(() => balance.cortes.cortes.slice(0, 5), [balance.cortes.cortes]);

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
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar el corte.";
      toast.error(mensaje);
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
      const mensaje = error instanceof Error ? error.message : "No se pudo marcar el corte automatico.";
      toast.error(mensaje);
    }
  }

  const sinCompras = !balance.compras.cargando && balance.compras.compras.length === 0;

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando || balance.cortes.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded" />
        <Skeleton className="h-40 w-full rounded" />
        <Skeleton className="h-56 w-full rounded" />
      </div>
    );
  }

  if (sinCompras) {
    return (
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3 border border-gray-300 bg-white p-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Balance y deuda</h2>
            <p className="text-sm text-gray-600">Sin compras registradas.</p>
          </div>
        </div>
        <article className="border border-gray-300 bg-white p-6 text-center">
          <p className="text-gray-600">Registrá compras para ver el balance.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border border-gray-300 bg-white p-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Balance y deuda</h2>
          <p className="text-sm text-gray-600">Control por tramo abierto y cierre manual.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={balance.mesSeleccionado}
            onChange={(event) => balance.setMesSeleccionado(event.target.value)}
            className="h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          <Boton variante="secundario" onClick={balance.exportar} icono={<Download className="h-4 w-4" />}>
            Exportar
          </Boton>
        </div>
      </div>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Tramo abierto</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{detalleSaldoAbierto}</p>
          <p className="mt-1 text-sm text-gray-600">
            {balance.cortes.corteActivo
              ? `Corte activo hasta ${formatearFecha(balance.cortes.corteActivo.fecha_corte)}`
              : "Sin corte activo: se toma todo el historial."}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded border border-gray-300 bg-gray-50 p-2">
              <p className="text-xs text-gray-600">Total abierto</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{formatearPeso(balance.saldoAbierto.total)}</p>
            </div>
            <div className="rounded border border-gray-300 bg-gray-50 p-2">
              <p className="text-xs text-gray-600">{balance.nombres.franco}</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{formatearPeso(balance.saldoAbierto.franco_pago)}</p>
            </div>
            <div className="rounded border border-gray-300 bg-gray-50 p-2">
              <p className="text-xs text-gray-600">{balance.nombres.fabiola}</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{formatearPeso(balance.saldoAbierto.fabiola_pago)}</p>
            </div>
          </div>
        </article>

        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Marcar corte de cuentas</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Fecha de corte (inclusive)
              <input
                type="date"
                value={fechaCorteEditable}
                onChange={(event) => setFechaCorte(event.target.value)}
                className="h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </label>
            <label className="flex-1 flex-col gap-1 text-xs text-gray-600 hidden sm:flex">
              Nota
              <input
                type="text"
                value={notaCorte}
                onChange={(event) => setNotaCorte(event.target.value)}
                placeholder="Ej: transferencia del periodo"
                className="h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </label>
            <button
              type="button"
              onClick={() => void marcarCorte()}
              disabled={balance.cortes.guardando}
              className="h-10 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {balance.cortes.guardando ? "Guardando..." : "Guardar corte"}
            </button>
            <button
              type="button"
              onClick={() => void quedarAManoHoy()}
              disabled={balance.cortes.guardando}
              className="h-10 rounded border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              Quedar a mano hoy
            </button>
          </div>

          {cortesLog.length ? (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <p className="text-xs font-semibold uppercase text-gray-600">Ultimos cortes</p>
              <div className="mt-2 space-y-1">
                {cortesLog.map((corte) => (
                  <div key={corte.id} className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">
                    <span>{formatearFecha(corte.fecha_corte)}{corte.activo ? " (activo)" : ""}</span>
                    <span>{corte.nota || "Sin nota"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Total mes</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatearPeso(balance.resumenMes.total)}</p>
          <p className="text-sm text-gray-600">{detalleVariacionMensual}</p>
        </article>
        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Pago real</p>
          <p className="mt-1 text-sm text-gray-900">
            {balance.nombres.franco}: <span className="font-mono">{formatearPeso(balance.resumenMes.franco_pago)}</span>
          </p>
          <p className="text-sm text-gray-900">
            {balance.nombres.fabiola}: <span className="font-mono">{formatearPeso(balance.resumenMes.fabiola_pago)}</span>
          </p>
        </article>
        <article className="border border-gray-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Acumulado total</p>
          <p className="mt-1 text-sm text-gray-900">{deudaHistorica}</p>
        </article>
      </section>

      <TablaBalance filas={balance.resumenHistorico} deudaActual={deudaHistorica} />

      <GraficoCategoriasDonut registros={balance.categoriasMes} />
      <GraficoEtiquetas registros={balance.etiquetasMes} />
    </section>
  );
}
