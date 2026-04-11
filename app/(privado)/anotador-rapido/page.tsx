"use client";

import { useMemo, useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
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
  const imgRef = useRef<HTMLInputElement>(null);

  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [lugar, setLugar] = useState("");
  const [lugarNuevo, setLugarNuevo] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [imagen, setImagen] = useState<string>("");
  const [pagador, setPagador] = useState<PagadorCompra>(() => {
    // Auto-detect based on user profile name
    const nombre = usuario.perfil?.nombre?.toLowerCase() ?? "";
    if (nombre.includes("franco") || nombre.includes("fran")) return "franco";
    if (nombre.includes("fabiola") || nombre.includes("fabi")) return "fabiola";
    return "compartido";
  });
  const [guardando, setGuardando] = useState(false);

  const montoCalculado = evaluarMonto(monto);
  const nombrePagador = usuario.perfil?.nombre ?? "";

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

  function crearBorrador(): CompraEditable {
    const lugarFinal = mostrarNuevo ? lugarNuevo.trim() : lugar.trim();
    const notas = imagen ? `[img:${imagen}]` : "";
    return {
      id: generarIdTemporal(), fecha: hoy(), nombre_lugar: lugarFinal,
      notas, registrado_por: nombrePagador, pagador_general: pagador,
      estado: "borrador", etiquetas_compra_ids: [],
      items: [{
        id: generarIdTemporal(), descripcion: detalle.trim(),
        categoria_id: "", subcategoria_id: "", expresion_monto: monto.trim(),
        monto_resuelto: montoCalculado, tipo_reparto: "50/50",
        pago_franco: montoCalculado / 2, pago_fabiola: montoCalculado / 2, etiquetas_ids: [],
      }],
    };
  }

  function cargarImagen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagen muy grande (max 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) { setImagen(ev.target.result as string); toast.success("Foto adjunta"); } };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    if (imgRef.current) imgRef.current.value = "";
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
      setDetalle(""); setLugar(""); setLugarNuevo(""); setMonto(""); setImagen("");
      setMostrarNuevo(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(msg);
    } finally { setGuardando(false); }
  }

  return (
    <div className="min-h-screen bg-surface pb-28">
      <div className="mx-auto max-w-xl px-4 pt-4 space-y-3">
        {/* Header compacto con quien pago */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-outline">Registro Rapido</p>
            <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">Anotador rapido</h1>
          </div>
          <div className="flex items-center gap-0.5 bg-surface-container rounded-full p-0.5">
            {[
              { val: "franco" as const, label: "Fran" },
              { val: "fabiola" as const, label: "Fabi" },
              { val: "compartido" as const, label: "50/50" },
            ].map(({ val, label }) => (
              <button key={val} type="button" onClick={() => setPagador(val)}
                className={`h-7 px-2.5 rounded-full font-label text-[10px] font-bold transition-all ${pagador === val ? "bg-secondary text-on-secondary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Detalle + Monto en la misma linea si es posible */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3 space-y-2">
          <input type="text" inputMode="text" value={detalle} onChange={e => setDetalle(e.target.value)}
            placeholder="Que compraste? (ej: Yerba, Pan)"
            className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2 font-headline text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-b-primary"
            autoFocus />
          <div className="flex items-baseline gap-2">
            <span className="font-label text-[10px] text-on-surface-variant/60 shrink-0">$</span>
            <input type="text" inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="4500 o 2000+500"
              className="flex-1 bg-transparent border-b border-outline/20 px-0 py-2 font-label text-xl font-bold tabular-nums text-on-surface outline-none placeholder:text-on-surface-variant/30 focus:border-b-primary" />
            {montoCalculado > 0 && monto !== String(montoCalculado) && (
              <span className="font-label text-xs text-tertiary tabular-nums shrink-0">{formatearPeso(montoCalculado)}</span>
            )}
          </div>
        </div>

        {/* Lugar */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3">
          {!mostrarNuevo ? (
            <select value={lugar}
              onChange={e => { if (e.target.value === "__nuevo__") { setMostrarNuevo(true); setLugarNuevo(""); } else { setLugar(e.target.value); } }}
              className="w-full h-9 rounded bg-surface-container-low px-3 font-headline text-sm text-on-surface outline-none">
              <option value="">Seleccionar lugar...</option>
              {lugaresPasados.map(l => <option key={l} value={l}>{l}</option>)}
              <option value="__nuevo__">+ Otro (nuevo)</option>
            </select>
          ) : (
            <div className="space-y-1">
              <input type="text" value={lugarNuevo} onChange={e => setLugarNuevo(e.target.value)}
                placeholder="Nombre del lugar"
                className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2 font-headline text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-b-primary"
              />
              <button type="button" onClick={() => { setMostrarNuevo(false); setLugarNuevo(""); }}
                className="font-label text-[10px] text-on-surface-variant hover:text-on-surface underline">
                ← Volver a la lista
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="fixed bottom-[72px] left-0 right-0 z-20 bg-surface border-t border-outline-variant/15 px-4 py-3">
        <div className="mx-auto max-w-xl">
          {montoCalculado > 0 && (
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-label text-[10px] uppercase tracking-wider text-outline">Total</span>
              <span className="font-label text-2xl font-bold tracking-tight tabular-nums text-primary">{formatearPeso(montoCalculado)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={guardarBorrador} disabled={guardando || !monto.trim()}
              className="flex-1 h-12 rounded bg-secondary font-headline text-base font-bold text-on-secondary disabled:opacity-50 hover:bg-secondary/90 active:scale-[0.98] transition-all shadow-lg shadow-secondary/20">
              {guardando ? "Guardando..." : "Guardar borrador"}
            </button>
            {/* Camera button */}
            <input ref={imgRef} type="file" accept="image/*" onChange={cargarImagen} className="hidden" />
            <button type="button" onClick={() => imgRef.current?.click()}
              className="relative h-12 w-12 rounded bg-surface-container-high text-secondary hover:bg-surface-container-highest transition-colors flex items-center justify-center">
              <Camera className="h-5 w-5" />
              {imagen && <span className="absolute -top-1 -right-1 w-3 h-3 bg-tertiary rounded-full border border-surface" />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
