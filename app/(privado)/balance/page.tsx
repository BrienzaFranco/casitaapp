"use client";

import { useState } from "react";
import { Download, ChevronDown, ChevronRight, X, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Compra } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";

function hoyIso() { return fechaLocalISO(); }

/**
 * Returns readable text color for a given background hex.
 * Uses WCAG perceived luminance formula.
 */
function textoContraste(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.5 ? "#000000" : "#ffffff";
}

interface ItemDeuda {
  compraId: string;
  compraFecha: string;
  compraLugar: string;
  itemDescripcion: string;
  itemMonto: number;
  itemCategoria: string;
  itemSubcategoria: string;
  correspondeA: "franco" | "fabiola" | "ambos";
  pagoFranco: number;
  pagoFabiola: number;
  pagadorGeneral: "franco" | "fabiola" | "compartido";
  francoDebe: number;
  fabiolaDebe: number;
}

export default function PaginaBalance() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;
  const [mostrarAnalisis, setMostrarAnalisis] = useState(false);
  const [itemsChecked, setItemsChecked] = useState<Set<string>>(new Set());
  const [historialExpandido, setHistorialExpandido] = useState<Record<string, boolean>>({});

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

  // Calcular items del periodo actual
  const ultimoCorte = balance.cortes.corteActivo;
  const fechaDesde = ultimoCorte?.fecha_corte ?? null;

  const comprasPeriodoActual = balance.compras.compras.filter(c => {
    if (c.estado === "borrador") return false;
    if (!fechaDesde) return true;
    return c.fecha > fechaDesde; // estrictamente despues del corte
  });

  // Calcular totales: quien pago realmente vs quien deberia haber pagado
  let totalFrancoPago = 0;  // Lo que Franco efectivamente puso
  let totalFabiolaPago = 0; // Lo que Fabiola efectivamente puso
  let francoCorresponde = 0; // Lo que le corresponde a Franco pagar
  let fabiolaCorresponde = 0; // Lo que le corresponde a Fabiola pagar

  for (const compra of comprasPeriodoActual) {
    for (const item of compra.items) {
      francoCorresponde += item.pago_franco;
      fabiolaCorresponde += item.pago_fabiola;

      if (compra.pagador_general === "franco") totalFrancoPago += item.monto_resuelto;
      else if (compra.pagador_general === "fabiola") totalFabiolaPago += item.monto_resuelto;
      else { totalFrancoPago += item.pago_franco; totalFabiolaPago += item.pago_fabiola; }
    }
  }

  // Deuda neta: diferencia entre lo que pago y lo que le corresponde
  // Si Franco pago $100 y le correspondia $80 → Fabiola le debe $20
  // Si Franco pago $80 y le correspondia $100 → Franco le debe $20
  const diffFranco = totalFrancoPago - francoCorresponde; // positivo = Franco pago de mas
  const diffFabiola = totalFabiolaPago - fabiolaCorresponde; // positivo = Fabiola pago de mas

  let fabiolaDebeAFranco = 0;
  let francoDebeAFabiola = 0;

  if (diffFranco > 0.01 && diffFabiola < -0.01) {
    // Franco pago de mas, Fabiola pago de menos → Fabiola debe
    fabiolaDebeAFranco = Math.min(diffFranco, Math.abs(diffFabiola));
  } else if (diffFabiola > 0.01 && diffFranco < -0.01) {
    // Fabiola pago de mas, Franco pago de menos → Franco debe
    francoDebeAFabiola = Math.min(diffFabiola, Math.abs(diffFranco));
  }

  // Construir items de deuda para el analisis detallado
  const itemsDeuda: ItemDeuda[] = [];
  for (const compra of comprasPeriodoActual) {
    for (const item of compra.items) {
      let francoDebe = 0;
      let fabiolaDebe = 0;

      if (compra.pagador_general === "franco") {
        if (item.tipo_reparto === "solo_fabiola") fabiolaDebe = item.monto_resuelto;
        else if (item.tipo_reparto === "50/50") fabiolaDebe = item.pago_fabiola;
      } else if (compra.pagador_general === "fabiola") {
        if (item.tipo_reparto === "solo_franco") francoDebe = item.monto_resuelto;
        else if (item.tipo_reparto === "50/50") francoDebe = item.pago_franco;
      } else {
        if (item.tipo_reparto === "solo_franco") francoDebe = item.monto_resuelto * 0.5;
        else if (item.tipo_reparto === "solo_fabiola") fabiolaDebe = item.monto_resuelto * 0.5;
      }

      if (francoDebe > 0.01 || fabiolaDebe > 0.01) {
        itemsDeuda.push({
          compraId: compra.id,
          compraFecha: compra.fecha,
          compraLugar: compra.nombre_lugar || "Sin lugar",
          itemDescripcion: item.descripcion || "Sin detalle",
          itemMonto: item.monto_resuelto,
          itemCategoria: item.categoria?.nombre ?? "Sin categoria",
          itemSubcategoria: item.subcategoria?.nombre ?? "",
          correspondeA: item.tipo_reparto === "solo_franco" ? "franco" : item.tipo_reparto === "solo_fabiola" ? "fabiola" : "ambos",
          pagoFranco: item.pago_franco,
          pagoFabiola: item.pago_fabiola,
          pagadorGeneral: compra.pagador_general,
          francoDebe,
          fabiolaDebe,
        });
      }
    }
  }

  // Analisis con checkboxes - calculo por pago vs corresponde
  const checkedItems = itemsDeuda.filter((_, i) => itemsChecked.has(String(i)));
  const checkedFrancoPago = checkedItems.reduce((a, i) => {
    if (i.pagadorGeneral === "franco") return a + i.itemMonto;
    if (i.pagadorGeneral === "compartido") return a + i.pagoFranco;
    return a;
  }, 0);
  const checkedFabiolaPago = checkedItems.reduce((a, i) => {
    if (i.pagadorGeneral === "fabiola") return a + i.itemMonto;
    if (i.pagadorGeneral === "compartido") return a + i.pagoFabiola;
    return a;
  }, 0);
  const checkedFrancoCorresponde = checkedItems.reduce((a, i) => a + i.pagoFranco, 0);
  const checkedFabiolaCorresponde = checkedItems.reduce((a, i) => a + i.pagoFabiola, 0);
  const checkedDiffFranco = checkedFrancoPago - checkedFrancoCorresponde;
  const checkedDiffFabiola = checkedFabiolaPago - checkedFabiolaCorresponde;
  const checkedFabiolaDebeA = checkedDiffFranco > 0.01 ? checkedDiffFranco : 0;
  const checkedFrancoDebeA = checkedDiffFabiola > 0.01 ? checkedDiffFabiola : 0;

  async function quedarAManoHoy() {
    try {
      const hoy = hoyIso();
      const resumen = fabiolaDebeAFranco > 0.01
        ? `${balance.nombres.fabiola} debia ${formatearPeso(fabiolaDebeAFranco)} a ${balance.nombres.franco}`
        : francoDebeAFabiola > 0.01
          ? `${balance.nombres.franco} debia ${formatearPeso(francoDebeAFabiola)} a ${balance.nombres.fabiola}`
          : "sin deuda";

      await balance.cortes.crearCorte({
        fecha_corte: hoy,
        nota: `Quedaron a mano (${hoy}): ${resumen}. Franco pago ${formatearPeso(totalFrancoPago)}, Fabiola pago ${formatearPeso(totalFabiolaPago)}.`,
        hogar_id: balance.compras.compras[0]?.hogar_id ?? null,
        actualizado_por: balance.usuario.perfil?.nombre ?? "Sistema",
      });

      toast.success("Listo: quedaron a mano.");
      // Force refresh
      window.location.reload();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo marcar el corte.";
      toast.error(msg);
    }
  }

  return (
    <section className="space-y-4">
      {/* Header */}
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
          <button type="button" onClick={balance.exportar}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container-highest transition-colors">
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>
      </div>

      {/* Deuda actual */}
      <div className={`rounded-lg border p-4 ${itemsDeuda.length === 0 ? "bg-surface-container-low border-outline-variant/10" : "border-outline-variant/10"}`} style={itemsDeuda.length > 0 ? { backgroundColor: `${colorFabi}18` } : {}}>
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

        {fabiolaDebeAFranco > 0.01 && (
          <div className="space-y-0.5">
            <p className="font-label text-base font-bold" style={{ color: colorFabi }}>
              {balance.nombres.fabiola} le debe {formatearPeso(fabiolaDebeAFranco)} a {balance.nombres.franco}
            </p>
            <p className="font-label text-xs text-on-surface-variant">
              {balance.nombres.franco} pago {formatearPeso(totalFrancoPago)} pero le correspondia {formatearPeso(francoCorresponde)}
            </p>
          </div>
        )}
        {francoDebeAFabiola > 0.01 && (
          <div className="space-y-0.5">
            <p className="font-label text-base font-bold" style={{ color: colorFran }}>
              {balance.nombres.franco} le debe {formatearPeso(francoDebeAFabiola)} a {balance.nombres.fabiola}
            </p>
            <p className="font-label text-xs text-on-surface-variant">
              {balance.nombres.fabiola} pago {formatearPeso(totalFabiolaPago)} pero le correspondia {formatearPeso(fabiolaCorresponde)}
            </p>
          </div>
        )}
        {fabiolaDebeAFranco < 0.01 && francoDebeAFabiola < 0.01 && fechaDesde && (
          <p className="font-label text-sm" style={{ color: colorFabi }}>
            Deuda saldada. Ambos deben $0 desde {formatearFecha(fechaDesde)}
          </p>
        )}
        {fabiolaDebeAFranco < 0.01 && francoDebeAFabiola < 0.01 && !fechaDesde && (
          <p className="font-label text-sm" style={{ color: colorFabi }}>
            Sin registros de deuda. Ambos deben $0.
          </p>
        )}

        <div className="flex gap-2 mt-3">
          {(fabiolaDebeAFranco > 0.01 || francoDebeAFabiola > 0.01) && (
            <>
              <button type="button" onClick={() => {
                // Initialize all as checked
                setItemsChecked(new Set(itemsDeuda.map((_, i) => String(i))));
                setMostrarAnalisis(true);
              }}
                className="h-8 px-3 rounded bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Analizar items
              </button>
              <button type="button" onClick={quedarAManoHoy} disabled={balance.cortes.guardando}
                className="h-8 px-4 rounded font-label text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors hover:opacity-90"
                style={{ backgroundColor: colorFabi, color: textoContraste(colorFabi) }}>
                Quedar a mano
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal de analisis */}
      {mostrarAnalisis && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
          <div className="bg-surface-container-lowest w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-outline">Analizar deuda</p>
                <p className="font-label text-xs text-on-surface-variant">{itemsDeuda.length} items involucrados</p>
              </div>
              <button type="button" onClick={() => setMostrarAnalisis(false)}
                className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {/* Grouped by corresponde a */}
              {(["franco", "fabiola", "ambos"] as const).map(grupo => {
                const itemsGrupo = itemsDeuda
                  .map((item, idx) => ({ ...item, idx }))
                  .filter(item => item.correspondeA === grupo);
                if (!itemsGrupo.length) return null;

                return (
                  <div key={grupo} className="mb-3">
                    <p className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant px-2 py-1">
                      Corresponde a: {grupo === "franco" ? balance.nombres.franco : grupo === "fabiola" ? balance.nombres.fabiola : "Ambos"}
                    </p>
                    {itemsGrupo.map(item => {
                      const isChecked = itemsChecked.has(String(item.idx));
                      return (
                        <label key={item.idx} className={`flex items-start gap-2 px-2 py-2 rounded-lg transition-colors ${isChecked ? "bg-surface-container-low" : "opacity-50"}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setItemsChecked(prev => {
                                const next = new Set(prev);
                                if (next.has(String(item.idx))) next.delete(String(item.idx)); else next.add(String(item.idx));
                                return next;
                              });
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-headline text-xs font-semibold text-on-surface truncate">{item.itemDescripcion}</p>
                            <p className="font-label text-[10px] text-on-surface-variant">
                              {item.itemCategoria}{item.itemSubcategoria ? ` › ${item.itemSubcategoria}` : ""}
                              {" · "}{item.compraLugar} ({formatearFecha(item.compraFecha)})
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-label text-xs tabular-nums font-bold text-on-surface">{formatearPeso(item.itemMonto)}</p>
                            {item.francoDebe > 0.01 && (
                              <p className="font-label text-[9px] tabular-nums" style={{ color: colorFran }}>{balance.nombres.franco} debe {formatearPeso(item.francoDebe)}</p>
                            )}
                            {item.fabiolaDebe > 0.01 && (
                              <p className="font-label text-[9px] tabular-nums" style={{ color: colorFabi }}>{balance.nombres.fabiola} debe {formatearPeso(item.fabiolaDebe)}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer con resumen */}
            <div className="border-t border-outline-variant/15 px-4 py-3 space-y-2 bg-surface-container">
              <div className="flex items-center justify-between text-sm">
                <span className="font-label text-[10px] text-on-surface-variant">Items seleccionados: {itemsChecked.size}/{itemsDeuda.length}</span>
                {checkedFabiolaDebeA > 0.01 && (
                  <span className="font-label text-sm font-bold" style={{ color: colorFabi }}>{balance.nombres.fabiola} debe {formatearPeso(checkedFabiolaDebeA)} a {balance.nombres.franco}</span>
                )}
                {checkedFrancoDebeA > 0.01 && (
                  <span className="font-label text-sm font-bold" style={{ color: colorFran }}>{balance.nombres.franco} debe {formatearPeso(checkedFrancoDebeA)} a {balance.nombres.fabiola}</span>
                )}
                {checkedFabiolaDebeA < 0.01 && checkedFrancoDebeA < 0.01 && (
                  <span className="font-label text-sm font-semibold" style={{ color: colorFabi }}>A mano</span>
                )}
              </div>
              <button type="button" onClick={() => {
                setMostrarAnalisis(false);
                quedarAManoHoy();
              }}
                className="w-full h-10 rounded font-label text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-90"
                style={{ backgroundColor: colorFabi, color: textoContraste(colorFabi) }}>
                Confirmar y quedar a mano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de cortes */}
      <HistorialCortes
        cortes={balance.cortes.cortes}
        compras={balance.compras.compras.filter(c => c.estado !== "borrador")}
        nombres={balance.nombres}
        expandido={historialExpandido}
        setExpandido={setHistorialExpandido}
      />
    </section>
  );
}

/* ── Historial de Cortes ── */
function HistorialCortes({
  cortes,
  compras,
  nombres,
  expandido,
  setExpandido,
}: {
  cortes: Array<{ id: string; fecha_corte: string; nota: string }>;
  compras: Compra[];
  nombres: { franco: string; fabiola: string };
  expandido: Record<string, boolean>;
  setExpandido: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  const periodos: Array<{
    desde: string | null;
    hasta: string;
    nota: string;
    compras: Compra[];
    totalFrancoPago: number;
    totalFabiolaPago: number;
    deudaNeta: number;
  }> = [];

  const cortesOrdenados = [...cortes].sort((a, b) => b.fecha_corte.localeCompare(a.fecha_corte));

  for (let i = 0; i < cortesOrdenados.length; i++) {
    const corteActual = cortesOrdenados[i];
    const corteAnterior = cortesOrdenados[i + 1];
    const desde = corteAnterior?.fecha_corte ?? null;

    const comprasPeriodo = compras.filter(c => {
      if (desde && c.fecha <= desde) return false;
      if (c.fecha > corteActual.fecha_corte) return false;
      return true;
    });

    let tFP = 0, tFbP = 0;
    for (const compra of comprasPeriodo) {
      for (const item of compra.items) {
        if (compra.pagador_general === "franco") tFP += item.monto_resuelto;
        else if (compra.pagador_general === "fabiola") tFbP += item.monto_resuelto;
        else { tFP += item.pago_franco; tFbP += item.pago_fabiola; }
      }
    }

    periodos.push({
      desde, hasta: corteActual.fecha_corte, nota: corteActual.nota,
      compras: comprasPeriodo, totalFrancoPago: tFP, totalFabiolaPago: tFbP,
      deudaNeta: tFP - comprasPeriodo.reduce((a, c) => a + c.items.reduce((b, i) => b + i.pago_franco, 0), 0),
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
          return (
            <div key={key}>
              <button type="button" onClick={() => setExpandido(a => ({ ...a, [key]: !a[key] }))}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-low/50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  {abierto ? <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-label text-xs tabular-nums text-on-surface">{formatearFecha(p.hasta)}</p>
                    {p.nota && <p className="font-label text-[10px] text-on-surface-variant truncate">{p.nota}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {nombres.franco}: {formatearPeso(p.totalFrancoPago)} · {nombres.fabiola}: {formatearPeso(p.totalFabiolaPago)}
                  </p>
                </div>
              </button>
              {abierto && p.compras.length > 0 && (
                <div className="px-4 pb-3 space-y-0.5">
                  {p.compras.map(c => (
                    <Link key={c.id} href={`/nueva-compra?editar=${c.id}`}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-surface-container-low transition-colors">
                      <div className="min-w-0">
                        <p className="font-label text-[10px] text-on-surface truncate">{c.nombre_lugar || "Sin lugar"}</p>
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
