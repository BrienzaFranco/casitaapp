"use client";

import { useState } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Compra } from "@/types";
import { GraficoCategoriasDonut } from "@/components/balance/GraficoCategoriasDonut";
import { GraficoEtiquetas } from "@/components/balance/GraficoEtiquetas";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import { usarBalance } from "@/hooks/usarBalance";

function hoyIso() { return fechaLocalISO(); }

interface PeriodoCompras {
  desde: string | null; // fecha del corte anterior (null = inicio)
  hasta: string; // fecha del corte actual (o hoy)
  nota: string | null;
  compras: Compra[];
  totalFrancoPago: number;
  totalFabiolaPago: number;
  francoCorresponde: number;
  fabiolaCorresponde: number;
  deudaNeta: number; // positivo = Fabiola debe a Franco, negativo = Franco debe a Fabiola
}

export default function PaginaBalance() {
  const balance = usarBalance();
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

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

  // Calcular totales del periodo actual (desde ultimo corte hasta ahora)
  const ultimoCorte = balance.cortes.cortes[0];
  const fechaDesde = ultimoCorte?.fecha_corte ?? null;

  const comprasPeriodoActual = balance.compras.compras.filter(c => {
    if (c.estado === "borrador") return false;
    if (!fechaDesde) return true;
    return c.fecha >= fechaDesde;
  });

  let totalFrancoPago = 0;
  let totalFabiolaPago = 0;
  let francoCorresponde = 0;

  for (const compra of comprasPeriodoActual) {
    for (const item of compra.items) {
      francoCorresponde += item.pago_franco;

      if (compra.pagador_general === "franco") {
        totalFrancoPago += item.monto_resuelto;
      } else if (compra.pagador_general === "fabiola") {
        totalFabiolaPago += item.monto_resuelto;
      } else {
        totalFrancoPago += item.pago_franco;
        totalFabiolaPago += item.pago_fabiola;
      }
    }
  }

  const deudaNeta = totalFrancoPago - francoCorresponde;
  // deudaNeta > 0: Franco pago de mas → Fabiola le debe
  // deudaNeta < 0: Franco pago de menos → Franco le debe a Fabiola

  const debeFabiola = deudaNeta > 0.01;
  const debeFranco = deudaNeta < -0.01;
  const montoDeuda = Math.abs(deudaNeta);

  async function quedarAManoHoy() {
    try {
      const hoy = hoyIso();
      const resumen = debeFabiola
        ? `${balance.nombres.fabiola} debia ${formatearPeso(montoDeuda)} a ${balance.nombres.franco}`
        : debeFranco
          ? `${balance.nombres.franco} debia ${formatearPeso(montoDeuda)} a ${balance.nombres.fabiola}`
          : "sin deuda";

      await balance.cortes.crearCorte({
        fecha_corte: hoy,
        nota: `Quedaron a mano (${hoy}): ${resumen}. Franco pago ${formatearPeso(totalFrancoPago)}, Fabiola pago ${formatearPeso(totalFabiolaPago)}.`,
        hogar_id: balance.compras.compras[0]?.hogar_id ?? null,
        actualizado_por: balance.usuario.perfil?.nombre ?? "Sistema",
      });

      setMostrarConfirmar(false);
      toast.success("Listo: quedaron a mano.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo marcar el corte.";
      toast.error(msg);
    }
  }

  return (
    <section className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Balance</p>
          <h2 className="font-headline text-xl font-bold tracking-tight text-on-surface">Balance y deuda</h2>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Deuda actual */}
      <div className={`rounded-lg border p-4 ${deudaNeta === 0 ? "bg-surface-container-low border-outline-variant/10" : "bg-secondary/10 border-secondary/20"}`}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-label text-[10px] uppercase tracking-wider text-outline">Este periodo</span>
          <span className="font-label text-[10px] text-on-surface-variant">
            {fechaDesde ? `Desde ${formatearFecha(fechaDesde)}` : "Desde el inicio"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-label tabular-nums text-on-surface-variant">
            {balance.nombres.franco} pagó {formatearPeso(totalFrancoPago)}
          </span>
          <span className="font-label tabular-nums text-on-surface-variant">
            {balance.nombres.fabiola} pagó {formatearPeso(totalFabiolaPago)}
          </span>
        </div>

        {debeFabiola && (
          <p className="font-label text-base font-bold text-secondary">
            {balance.nombres.fabiola} le debe {formatearPeso(montoDeuda)} a {balance.nombres.franco}
          </p>
        )}
        {debeFranco && (
          <p className="font-label text-base font-bold text-secondary">
            {balance.nombres.franco} le debe {formatearPeso(montoDeuda)} a {balance.nombres.fabiola}
          </p>
        )}
        {!debeFabiola && !debeFranco && (
          <p className="font-label text-base font-semibold text-tertiary">Están a mano</p>
        )}

        {(debeFabiola || debeFranco) && (
          <button
            type="button"
            onClick={() => setMostrarConfirmar(true)}
            className="mt-3 h-8 px-4 rounded bg-tertiary font-label text-[10px] font-bold uppercase tracking-wider text-on-tertiary hover:bg-tertiary/90 transition-colors"
          >
            Quedar a mano
          </button>
        )}
      </div>

      {/* Historial de cortes con compras */}
      <HistorialCortes
        cortes={balance.cortes.cortes}
        compras={balance.compras.compras.filter(c => c.estado !== "borrador")}
        nombres={balance.nombres}
      />

      {/* Graficos */}
      <GraficoCategoriasDonut registros={balance.categoriasMes} />
      <GraficoEtiquetas registros={balance.etiquetasMes} />

      {/* Modal de confirmacion */}
      <Modal
        abierto={mostrarConfirmar}
        titulo="Quedar a mano"
        descripcion={`Se registrará un corte hoy saldando la deuda actual.`}
        confirmacion="Confirmar"
        cancelacion="Cancelar"
        onCancelar={() => setMostrarConfirmar(false)}
        onConfirmar={quedarAManoHoy}
      >
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">{balance.nombres.franco} pagó</span>
            <span className="font-label tabular-nums font-semibold">{formatearPeso(totalFrancoPago)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">{balance.nombres.fabiola} pagó</span>
            <span className="font-label tabular-nums font-semibold">{formatearPeso(totalFabiolaPago)}</span>
          </div>
          <div className="border-t border-outline-variant/10 pt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-on-surface">Deuda actual</span>
              <span className="font-label tabular-nums text-secondary">
                {debeFabiola
                  ? `${balance.nombres.fabiola} → ${balance.nombres.franco}: ${formatearPeso(montoDeuda)}`
                  : `${balance.nombres.franco} → ${balance.nombres.fabiola}: ${formatearPeso(montoDeuda)}`}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}

/* ── Historial de Cortes ── */
function HistorialCortes({
  cortes,
  compras,
  nombres,
}: {
  cortes: Array<{ id: string; fecha_corte: string; nota: string }>;
  compras: Compra[];
  nombres: { franco: string; fabiola: string };
}) {
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  // Construir periodos entre cortes
  const periodos: PeriodoCompras[] = [];
  const cortesOrdenados = [...cortes].sort((a, b) => b.fecha_corte.localeCompare(a.fecha_corte));

  for (let i = 0; i < cortesOrdenados.length; i++) {
    const corteActual = cortesOrdenados[i];
    const corteAnterior = cortesOrdenados[i + 1]; // null si es el ultimo (primer periodo)

    const desde = corteAnterior?.fecha_corte ?? null;
    const comprasPeriodo = compras.filter(c => {
      if (desde && c.fecha < desde) return false;
      if (c.fecha > corteActual.fecha_corte) return false;
      return true;
    });

    let tFP = 0, tFbP = 0, fC = 0, fC2 = 0;
    for (const compra of comprasPeriodo) {
      for (const item of compra.items) {
        fC += item.pago_franco;
        fC2 += item.pago_fabiola;
        if (compra.pagador_general === "franco") tFP += item.monto_resuelto;
        else if (compra.pagador_general === "fabiola") tFbP += item.monto_resuelto;
        else { tFP += item.pago_franco; tFbP += item.pago_fabiola; }
      }
    }

    periodos.push({
      desde,
      hasta: corteActual.fecha_corte,
      nota: corteActual.nota,
      compras: comprasPeriodo,
      totalFrancoPago: tFP,
      totalFabiolaPago: tFbP,
      francoCorresponde: fC,
      fabiolaCorresponde: fC2,
      deudaNeta: tFP - fC,
    });
  }

  if (!periodos.length && !compras.length) {
    return (
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">Historial</p>
        <p className="font-label text-sm text-on-surface-variant">Sin registros todavia.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15">
      <div className="px-4 py-3 border-b border-outline-variant/10">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline">Historial de cortes</p>
      </div>

      <div className="divide-y divide-outline-variant/10">
        {periodos.map((p, idx) => {
          const key = `corte-${idx}`;
          const abierto = expandido[key];
          const deuda = p.deudaNeta;
          const debeFabiola = deuda > 0.01;
          const debeFranco = deuda < -0.01;

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => setExpandido(a => ({ ...a, [key]: !a[key] }))}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-low/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {abierto ? <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-label text-xs tabular-nums text-on-surface">{formatearFecha(p.hasta)}</p>
                    {p.nota && (
                      <p className="font-label text-[10px] text-on-surface-variant truncate">{p.nota}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {nombres.franco}: {formatearPeso(p.totalFrancoPago)} · {nombres.fabiola}: {formatearPeso(p.totalFabiolaPago)}
                  </p>
                  {debeFabiola && (
                    <p className="font-label text-[10px] tabular-nums text-secondary font-bold">
                      {nombres.fabiola} debió {formatearPeso(Math.abs(deuda))} a {nombres.franco}
                    </p>
                  )}
                  {debeFranco && (
                    <p className="font-label text-[10px] tabular-nums text-secondary font-bold">
                      {nombres.franco} debió {formatearPeso(Math.abs(deuda))} a {nombres.fabiola}
                    </p>
                  )}
                  {!debeFabiola && !debeFranco && (
                    <p className="font-label text-[10px] text-tertiary font-semibold">A mano</p>
                  )}
                </div>
              </button>

              {abierto && p.compras.length > 0 && (
                <div className="px-4 pb-3 space-y-0.5">
                  {p.compras.map(c => (
                    <Link
                      key={c.id}
                      href={`/nueva-compra?editar=${c.id}`}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-surface-container-low transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-label text-[10px] text-on-surface truncate">
                          {c.nombre_lugar || "Sin lugar"}
                        </p>
                        <p className="font-label text-[9px] text-on-surface-variant">
                          Pago: {c.pagador_general === "franco" ? nombres.franco : c.pagador_general === "fabiola" ? nombres.fabiola : "Ambos"}
                        </p>
                      </div>
                      <span className="font-label text-[10px] tabular-nums font-semibold text-on-surface shrink-0 ml-2">
                        {formatearPeso(c.items.reduce((a, i) => a + i.monto_resuelto, 0))}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
