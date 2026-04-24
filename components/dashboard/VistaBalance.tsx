"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { formatearPeso } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import type { Compra, Item } from "@/types";

interface Props {
  compras: Compra[];
  nombres: { franco: string; fabiola: string };
  colorFran: string;
  colorFabi: string;
  corteActivo?: { fecha_corte: string } | null;
  hogarId?: string | null;
  nombrePerfil?: string;
  onCrearCorte: (data: { fecha_corte: string; nota: string; hogar_id: string | null; actualizado_por: string }) => Promise<void>;
  onItemClick: (item: Item, lugar: string, fecha: string, compraId: string) => void;
}

interface FilaBalance {
  compraId: string;
  itemDescripcion: string;
  itemMonto: number;
  lugar: string;
  fecha: string;
  pagador: string;
  tipoReparto: string;
  pagoFranco: number;
  pagoFabiola: number;
  francoDebe: number;
  fabiolaDebe: number;
}

export function VistaBalance({
  compras,
  nombres,
  colorFran,
  colorFabi,
  corteActivo,
  hogarId,
  nombrePerfil,
  onCrearCorte,
  onItemClick,
}: Props) {
  const fechaDesde = corteActivo?.fecha_corte ?? null;

  const { comprasPeriodo, totalFrancoPago, totalFabiolaPago, francoCorresponde, fabiolaCorresponde,
    deudor, acreedor, montoDeuda, itemsDeuda } = useMemo(() => {
    const periodo = compras.filter((c) => {
      if (c.estado === "borrador") return false;
      if (!fechaDesde) return true;
      return c.fecha > fechaDesde;
    });

    let tfp = 0, tfb = 0, fc = 0, fbC = 0;
    for (const c of periodo) {
      for (const item of c.items) {
        fc += item.pago_franco;
        fbC += item.pago_fabiola;
        if (c.pagador_general === "franco") tfp += item.monto_resuelto;
        else if (c.pagador_general === "fabiola") tfb += item.monto_resuelto;
        else { tfp += item.pago_franco; tfb += item.pago_fabiola; }
      }
    }

    const dFranco = tfp - fc;
    const dFabiola = tfb - fbC;

    let deudorText = "", acreedorText = "", deuda = 0;
    if (dFranco > 0.01 && dFabiola < -0.01) {
      deudorText = nombres.fabiola;
      acreedorText = nombres.franco;
      deuda = Math.min(dFranco, Math.abs(dFabiola));
    } else if (dFabiola > 0.01 && dFranco < -0.01) {
      deudorText = nombres.franco;
      acreedorText = nombres.fabiola;
      deuda = Math.min(dFabiola, Math.abs(dFranco));
    }

    const items: FilaBalance[] = [];
    for (const c of periodo) {
      for (const item of c.items) {
        let fDebe = 0, fbDebe = 0;
        if (c.pagador_general === "franco") {
          if (item.tipo_reparto === "solo_fabiola") fbDebe = item.monto_resuelto;
          else if (item.tipo_reparto === "50/50") fbDebe = item.pago_fabiola;
        } else if (c.pagador_general === "fabiola") {
          if (item.tipo_reparto === "solo_franco") fDebe = item.monto_resuelto;
          else if (item.tipo_reparto === "50/50") fDebe = item.pago_franco;
        } else {
          if (item.tipo_reparto === "solo_franco") fDebe = item.monto_resuelto * 0.5;
          else if (item.tipo_reparto === "solo_fabiola") fbDebe = item.monto_resuelto * 0.5;
        }
        if (fDebe > 0.01 || fbDebe > 0.01) {
          items.push({
            compraId: c.id,
            itemDescripcion: item.descripcion || "Sin detalle",
            itemMonto: item.monto_resuelto,
            lugar: c.nombre_lugar || "Sin lugar",
            fecha: c.fecha,
            pagador: c.pagador_general === "franco" ? nombres.franco : c.pagador_general === "fabiola" ? nombres.fabiola : "Ambos",
            tipoReparto: item.tipo_reparto,
            pagoFranco: item.pago_franco,
            pagoFabiola: item.pago_fabiola,
            francoDebe: fDebe,
            fabiolaDebe: fbDebe,
          });
        }
      }
    }
    items.sort((a, b) => (b.francoDebe + b.fabiolaDebe) - (a.francoDebe + a.fabiolaDebe));

    return {
      comprasPeriodo: periodo,
      totalFrancoPago: tfp,
      totalFabiolaPago: tfb,
      francoCorresponde: fc,
      fabiolaCorresponde: fbC,
      deudor: deudorText,
      acreedor: acreedorText,
      montoDeuda: deuda,
      itemsDeuda: items,
    };
  }, [compras, fechaDesde, nombres]);

  async function quedarAMano() {
    try {
      const hoy = fechaLocalISO();
      await onCrearCorte({
        fecha_corte: hoy,
        nota: deudor
          ? `Quedaron a mano (${hoy}): ${deudor} deb\u00eda ${formatearPeso(montoDeuda)} a ${acreedor}.`
          : `Quedaron a mano (${hoy}): sin deuda pendiente.`,
        hogar_id: hogarId ?? null,
        actualizado_por: nombrePerfil ?? "Sistema",
      });
      toast.success("Listo: quedaron a mano.");
    } catch (e) {
      toast.error("No se pudo marcar el corte.");
    }
  }

  const inputClase = "w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm text-on-surface outline-none border border-outline-variant/15 focus:border-secondary/40 transition-colors";

  return (
    <div className="space-y-3">
      {/* Resumen */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">{nombres.franco}</span>
          <span className="text-on-surface tabular-nums">
            Pag&oacute; {formatearPeso(totalFrancoPago)} &middot; Le toca {formatearPeso(francoCorresponde)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">{nombres.fabiola}</span>
          <span className="text-on-surface tabular-nums">
            Pag&oacute; {formatearPeso(totalFabiolaPago)} &middot; Le toca {formatearPeso(fabiolaCorresponde)}
          </span>
        </div>
        <div className="border-t border-outline-variant/10 pt-3">
          {deudor ? (
            <p className="text-sm font-semibold text-on-surface">
              <span className="text-error">{deudor} le debe {formatearPeso(montoDeuda)} a {acreedor}</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-tertiary">Est&aacute;n al d&iacute;a, sin deudas pendientes</p>
          )}
        </div>
        {deudor && (
          <button
            type="button"
            onClick={quedarAMano}
            className="w-full h-10 rounded-xl bg-secondary text-on-secondary font-label text-xs font-bold uppercase tracking-wider hover:bg-secondary/90 active:scale-[0.98] transition-all"
          >
            Quedar a mano
          </button>
        )}
      </div>

      {/* Desglose: quién debe a quién por cada item */}
      {itemsDeuda.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15">
          <div className="px-4 py-2.5 border-b border-outline-variant/10">
            <p className="text-[10px] uppercase tracking-widest text-outline">Desglose ({itemsDeuda.length} items)</p>
          </div>
          <div className="divide-y divide-outline-variant/10 max-h-96 overflow-y-auto">
            {itemsDeuda.map((it, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const compra = comprasPeriodo.find((c) => c.id === it.compraId);
                  if (compra) {
                    const item = compra.items.find((item) => item.descripcion === it.itemDescripcion);
                    if (item) onItemClick(item, it.lugar, it.fecha, it.compraId);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-on-surface truncate">{it.itemDescripcion}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Pag&oacute; {it.pagador} &middot; {it.tipoReparto === "50/50" ? "50/50" : it.tipoReparto === "solo_franco" ? `Solo ${nombres.franco}` : `Solo ${nombres.fabiola}`}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-on-surface">{formatearPeso(it.itemMonto)}</p>
                  {(it.francoDebe > 0.01 || it.fabiolaDebe > 0.01) && (
                    <p className="text-[10px] tabular-nums" style={{ color: it.francoDebe > 0.01 ? colorFran : colorFabi }}>
                      {it.francoDebe > 0.01 ? `${nombres.franco} debe ${formatearPeso(it.francoDebe)}` : `${nombres.fabiola} debe ${formatearPeso(it.fabiolaDebe)}`}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
