"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CompraEditable, PagadorCompra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { vibrarExito } from "@/lib/haptics";
import { fechaLocalISO } from "@/lib/utiles";
import { usarCompras } from "@/hooks/usarCompras";
import { usarOffline } from "@/hooks/usarOffline";
import { usarUsuario } from "@/hooks/usarUsuario";

function hoy() { return fechaLocalISO(); }
function generarIdTemporal() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `tmp-${crypto.randomUUID()}`;
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function evaluarMonto(expresion: string): number {
  const limpia = expresion.trim().replace(/\s/g, "");
  if (!limpia) return 0;
  try { return Function(`"use strict"; return (${limpia})`)(); } catch { /* ignore */ }
  const parsed = parseFloat(limpia.replace(/[$.]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

export default function PaginaAnotadorRapido() {
  const router = useRouter();
  const compras = usarCompras();
  const usuario = usarUsuario();
  const { guardarConFallback } = usarOffline(compras.guardarCompra);

  const [lugar, setLugar] = useState("");
  const [lugarNuevo, setLugarNuevo] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [pagador, setPagador] = useState<PagadorCompra>("compartido");
  const [guardando, setGuardando] = useState(false);

  const montoCalculado = evaluarMonto(monto);

  // Lugares pasados unicos
  const lugaresPasados = useMemo(() => {
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const c of compras.compras) {
      if (c.nombre_lugar && !vistos.has(c.nombre_lugar)) {
        vistos.add(c.nombre_lugar);
        resultado.push(c.nombre_lugar);
      }
    }
    return resultado.slice(0, 30);
  }, [compras.compras]);

  const nombrePagador = usuario.perfil?.nombre ?? "";

  function crearBorrador(): CompraEditable {
    const lugarFinal = mostrarNuevo ? lugarNuevo.trim() : lugar.trim();
    return {
      id: generarIdTemporal(),
      fecha: hoy(),
      nombre_lugar: lugarFinal,
      notas: "",
      registrado_por: nombrePagador,
      pagador_general: pagador,
      estado: "borrador",
      etiquetas_compra_ids: [],
      items: [{
        id: generarIdTemporal(),
        descripcion: detalle.trim(),
        categoria_id: "",
        subcategoria_id: "",
        expresion_monto: monto.trim(),
        monto_resuelto: montoCalculado,
        tipo_reparto: "50/50",
        pago_franco: montoCalculado / 2,
        pago_fabiola: montoCalculado / 2,
        etiquetas_ids: [],
      }],
    };
  }

  async function guardarBorrador() {
    if (!monto.trim()) { toast.error("Ingresa un monto"); return; }
    const lugarFinal = mostrarNuevo ? lugarNuevo.trim() : lugar.trim();
    if (!lugarFinal) { toast.error("Indica un lugar"); return; }
    try {
      setGuardando(true);
      const borrador = crearBorrador();
      const resultado = await guardarConFallback(borrador);
      if (resultado.pendiente) toast.success("Borrador guardado (sin conexion)");
      else toast.success("Borrador guardado");
      vibrarExito();
      setLugar(""); setLugarNuevo(""); setMonto(""); setDetalle("");
      setMostrarNuevo(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(msg);
    } finally { setGuardando(false); }
  }

  return (
    <div className="min-h-screen bg-surface pb-28">
      <div className="mx-auto max-w-xl px-4 pt-4 space-y-4">
        {/* Header */}
        <div className="space-y-0.5">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Registro Rapido</p>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Anotador rapido</h1>
          <p className="font-body text-xs text-on-surface-variant">Anota lo basico y completalo despues.</p>
        </div>

        {/* Lugar - dropdown o nuevo */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 space-y-2">
          <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Lugar</label>
          {!mostrarNuevo ? (
            <div className="space-y-1.5">
              <select
                value={lugar}
                onChange={e => { if (e.target.value === "__nuevo__") { setMostrarNuevo(true); setLugarNuevo(""); } else { setLugar(e.target.value); } }}
                className="w-full h-10 rounded bg-surface-container-low px-3 font-headline text-sm text-on-surface outline-none"
              >
                <option value="">Seleccionar lugar...</option>
                {lugaresPasados.map(l => <option key={l} value={l}>{l}</option>)}
                <option value="__nuevo__">+ Otro (nuevo)</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="text" value={lugarNuevo} onChange={e => setLugarNuevo(e.target.value)}
                placeholder="Nombre del lugar"
                className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2.5 font-headline text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-b-primary"
                autoFocus
              />
              <button type="button" onClick={() => { setMostrarNuevo(false); setLugarNuevo(""); }}
                className="font-label text-[10px] text-on-surface-variant hover:text-on-surface underline">
                ← Volver a la lista
              </button>
            </div>
          )}
        </div>

        {/* QUIEN PAGO - botones grandes y claros */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 space-y-2">
          <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Quien pago</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: "franco" as const, label: nombrePagador || "Franco" },
              { val: "fabiola" as const, label: "Fabiola" },
              { val: "compartido" as const, label: "Compartido" },
            ].map(({ val, label }) => (
              <button key={val} type="button" onClick={() => setPagador(val)}
                className={`h-14 rounded-lg font-headline text-sm font-bold transition-all active:scale-[0.97] ${
                  pagador === val
                    ? "bg-secondary text-on-secondary shadow-md shadow-secondary/20"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Monto */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 space-y-2">
          <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Monto</label>
          <input
            type="text" inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="ej: 4500 o 2000+500"
            className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-3 font-label text-2xl font-bold tabular-nums text-on-surface outline-none placeholder:text-on-surface-variant/30 focus:border-b-primary focus:bg-surface-container-highest transition-all"
            autoFocus={!mostrarNuevo && !lugar}
          />
          {montoCalculado > 0 && monto !== String(montoCalculado) && (
            <p className="font-label text-xs text-tertiary tabular-nums">
              = {formatearPeso(montoCalculado)}
            </p>
          )}
        </div>

        {/* Detalle */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 space-y-2">
          <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Detalle</label>
          <input
            type="text" inputMode="text" value={detalle} onChange={e => setDetalle(e.target.value)}
            placeholder="ej: Yerba, Leche, Pan..."
            className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2.5 font-headline text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-b-primary"
          />
        </div>
      </div>

      {/* Footer: Boton guardar */}
      <footer className="fixed bottom-[72px] left-0 right-0 z-20 bg-surface border-t border-outline-variant/15 px-4 py-3">
        <div className="mx-auto max-w-xl">
          {montoCalculado > 0 && (
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-label text-[10px] uppercase tracking-wider text-outline">Total</span>
              <span className="font-label text-2xl font-bold tracking-tight tabular-nums text-primary">{formatearPeso(montoCalculado)}</span>
            </div>
          )}
          <button
            type="button"
            onClick={guardarBorrador}
            disabled={guardando || !monto.trim()}
            className="w-full h-12 rounded bg-secondary font-headline text-base font-bold text-on-secondary disabled:opacity-50 hover:bg-secondary/90 active:scale-[0.98] transition-all shadow-lg shadow-secondary/20"
          >
            {guardando ? "Guardando..." : "Guardar borrador"}
          </button>
        </div>
      </footer>
    </div>
  );
}
