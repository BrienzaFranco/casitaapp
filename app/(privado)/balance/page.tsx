"use client";

import { useState } from "react";
import { Download, ChevronDown, ChevronRight, X, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Compra } from "@/types";
import { GraficoCategoriasDonut } from "@/components/balance/GraficoCategoriasDonut";
import { GraficoEtiquetas } from "@/components/balance/GraficoEtiquetas";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import { usarBalance } from "@/hooks/usarBalance";

function hoyIso() { return fechaLocalISO(); }

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

  // Construir lista de items con calculo de deuda
  const itemsDeuda: ItemDeuda[] = [];
  for (const compra of comprasPeriodoActual) {
    for (const item of compra.items) {
      let francoDebe = 0;
      let fabiolaDebe = 0;

      if (compra.pagador_general === "franco") {
        // Franco puso la plata
        if (item.tipo_reparto === "solo_fabiola") {
          fabiolaDebe = item.monto_resuelto;
        } else if (item.tipo_reparto === "50/50") {
          fabiolaDebe = item.pago_fabiola;
        }
      } else if (compra.pagador_general === "fabiola") {
        // Fabiola puso la plata
        if (item.tipo_reparto === "solo_franco") {
          francoDebe = item.monto_resuelto;
        } else if (item.tipo_reparto === "50/50") {
          francoDebe = item.pago_franco;
        }
      } else {
        // Ambos pusieron (compartido)
        if (item.tipo_reparto === "solo_franco") {
          francoDebe = item.monto_resuelto * 0.5; // Franco puso mitad pero le corresponde todo → debe mitad a Fabiola
        } else if (item.tipo_reparto === "solo_fabiola") {
          fabiolaDebe = item.monto_resuelto * 0.5;
        }
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

  const totalFrancoDebe = itemsDeuda.reduce((a, i) => a + i.francoDebe, 0);
  const totalFabiolaDebe = itemsDeuda.reduce((a, i) => a + i.fabiolaDebe, 0);
  const neto = totalFabiolaDebe - totalFrancoDebe;
  const debeFabiola = neto > 0.01;
  const debeFranco = neto < -0.01;
  const montoDeuda = Math.abs(neto);

  // Calcular totales para display
  let totalFrancoPago = 0;
  let totalFabiolaPago = 0;
  for (const compra of comprasPeriodoActual) {
    for (const item of compra.items) {
      if (compra.pagador_general === "franco") totalFrancoPago += item.monto_resuelto;
      else if (compra.pagador_general === "fabiola") totalFabiolaPago += item.monto_resuelto;
      else { totalFrancoPago += item.pago_franco; totalFabiolaPago += item.pago_fabiola; }
    }
  }

  // Analisis con checkboxes
  const itemsCheckedList = itemsDeuda.filter((_, i) => itemsChecked.has(String(i)));
  const checkedFrancoDebe = itemsCheckedList.reduce((a, i) => a + i.francoDebe, 0);
  const checkedFabiolaDebe = itemsCheckedList.reduce((a, i) => a + i.fabiolaDebe, 0);
  const checkedNeto = checkedFabiolaDebe - checkedFrancoDebe;
  const checkedDebeFabiola = checkedNeto > 0.01;
  const checkedDebeFranco = checkedNeto < -0.01;
  const checkedMontoDeuda = Math.abs(checkedNeto);

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
      <div className={`rounded-lg border p-4 ${itemsDeuda.length === 0 ? "bg-surface-container-low border-outline-variant/10" : "bg-secondary/10 border-secondary/20"}`}>
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

        <div className="flex gap-2 mt-3">
          {itemsDeuda.length > 0 && (
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
                className="h-8 px-4 rounded bg-tertiary font-label text-[10px] font-bold uppercase tracking-wider text-on-tertiary hover:bg-tertiary/90 disabled:opacity-50 transition-colors">
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
                              <p className="font-label text-[9px] tabular-nums text-secondary">{balance.nombres.franco} debe {formatearPeso(item.francoDebe)}</p>
                            )}
                            {item.fabiolaDebe > 0.01 && (
                              <p className="font-label text-[9px] tabular-nums text-tertiary">{balance.nombres.fabiola} debe {formatearPeso(item.fabiolaDebe)}</p>
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
                {checkedDebeFabiola && (
                  <span className="font-label text-sm font-bold text-secondary">{balance.nombres.fabiola} debe {formatearPeso(checkedMontoDeuda)} a {balance.nombres.franco}</span>
                )}
                {checkedDebeFranco && (
                  <span className="font-label text-sm font-bold text-secondary">{balance.nombres.franco} debe {formatearPeso(checkedMontoDeuda)} a {balance.nombres.fabiola}</span>
                )}
                {!checkedDebeFabiola && !checkedDebeFranco && (
                  <span className="font-label text-sm font-semibold text-tertiary">A mano</span>
                )}
              </div>
              <button type="button" onClick={() => {
                setMostrarAnalisis(false);
                quedarAManoHoy();
              }}
                className="w-full h-10 rounded bg-tertiary font-label text-[10px] font-bold uppercase tracking-wider text-on-tertiary hover:bg-tertiary/90 transition-colors">
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

      {/* Graficos */}
      <GraficoCategoriasDonut registros={balance.categoriasMes} />
      <GraficoEtiquetas registros={balance.etiquetasMes} />
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
