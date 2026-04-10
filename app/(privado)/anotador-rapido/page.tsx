"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CompraEditable, PagadorCompra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { vibrarExito } from "@/lib/haptics";
import { cargarMapaLugares, cargarMapaDetalles, predecirCategoria } from "@/lib/categorizacion";
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
  try {
    const evaluada = Function(`"use strict"; return (${limpia})`)();
    return typeof evaluada === "number" ? evaluada : 0;
  } catch {
    const parsed = parseFloat(limpia.replace(/[$.]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
}

export default function PaginaAnotadorRapido() {
  const router = useRouter();
  const compras = usarCompras();
  const usuario = usarUsuario();
  const { guardarConFallback } = usarOffline(compras.guardarCompra);

  const [lugar, setLugar] = useState("");
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [pagador, setPagador] = useState<PagadorCompra>("compartido");
  const [categoriaPredicha, setCategoriaPredicha] = useState({ categoria_id: "", subcategoria_id: "" });
  const [guardando, setGuardando] = useState(false);
  const [guardandoDetallar, setGuardandoDetallar] = useState(false);

  const montoCalculado = evaluarMonto(monto);
  const mapaLugares = useMemo(() => cargarMapaLugares(compras.compras), [compras.compras]);
  const mapaDetalles = useMemo(() => cargarMapaDetalles(compras.compras), [compras.compras]);

  function manejarCambioLugar(valor: string) {
    setLugar(valor);
    if (valor.length >= 3) {
      const prediccion = predecirCategoria(valor, mapaLugares, mapaDetalles);
      if (prediccion) setCategoriaPredicha(prediccion);
    }
  }

  function manejarCambioDetalle(valor: string) {
    setDetalle(valor);
    if (valor.length >= 4 && !categoriaPredicha.categoria_id) {
      const prediccion = predecirCategoria(valor, mapaLugares, mapaDetalles);
      if (prediccion) setCategoriaPredicha(prediccion);
    }
  }

  function crearCompraConPrediccion(): CompraEditable {
    return {
      id: generarIdTemporal(),
      fecha: hoy(),
      nombre_lugar: lugar.trim(),
      notas: "",
      registrado_por: usuario.perfil?.nombre ?? "",
      pagador_general: pagador,
      estado: "borrador",
      etiquetas_compra_ids: [],
      items: [{
        id: generarIdTemporal(),
        descripcion: detalle.trim(),
        categoria_id: categoriaPredicha.categoria_id,
        subcategoria_id: categoriaPredicha.subcategoria_id,
        expresion_monto: monto.trim(),
        monto_resuelto: montoCalculado,
        tipo_reparto: pagador === "franco" ? "solo_franco" : pagador === "fabiola" ? "solo_fabiola" : "50/50",
        pago_franco: pagador === "franco" ? montoCalculado : pagador === "fabiola" ? 0 : montoCalculado / 2,
        pago_fabiola: pagador === "fabiola" ? montoCalculado : pagador === "franco" ? 0 : montoCalculado / 2,
        etiquetas_ids: [],
      }],
    };
  }

  async function guardarPendiente() {
    if (!monto.trim()) { toast.error("Ingresa un monto"); return; }
    try {
      setGuardando(true);
      const compra = crearCompraConPrediccion();
      const resultado = await guardarConFallback(compra);
      if (resultado.pendiente) toast.success("Borrador guardado offline");
      else toast.success("Borrador guardado");
      vibrarExito();
      setLugar(""); setMonto(""); setDetalle("");
      setCategoriaPredicha({ categoria_id: "", subcategoria_id: "" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(msg);
    } finally { setGuardando(false); }
  }

  async function guardarYDetallar() {
    if (!monto.trim()) { toast.error("Ingresa un monto"); return; }
    try {
      setGuardandoDetallar(true);
      const compra = crearCompraConPrediccion();
      const resultado = await guardarConFallback(compra);
      if (resultado.pendiente || !resultado.id) router.push("/historial");
      else router.push(`/nueva-compra?editar=${resultado.id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(msg);
    } finally { setGuardandoDetallar(false); }
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="mx-auto max-w-[480px] px-4 pt-4">
        {/* Header editorial */}
        <div className="mb-4 space-y-0.5">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Registro Rapido</p>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Anotador rapido</h1>
        </div>

        <div className="space-y-3">
          {/* Place input - ledger style */}
          <div>
            <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Lugar</label>
            <input
              type="text"
              inputMode="text"
              value={lugar}
              onChange={(e) => manejarCambioLugar(e.target.value)}
              placeholder="ej: Coto, Rapipago"
              className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-3 font-headline text-lg font-semibold text-on-surface outline-none transition-all focus:bg-surface-container-highest focus:border-b-primary placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Amount input */}
          <div>
            <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Monto</label>
            <input
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="ej: 4500 o 2000+500-200"
              className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-3 font-label text-xl font-bold tabular-nums text-on-surface outline-none transition-all focus:bg-surface-container-highest focus:border-b-primary placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Detail input */}
          <div>
            <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Detalle</label>
            <input
              type="text"
              inputMode="text"
              value={detalle}
              onChange={(e) => manejarCambioDetalle(e.target.value)}
              placeholder="ej: Yerba oferta"
              className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-3 font-headline text-base text-on-surface outline-none transition-all focus:bg-surface-container-highest focus:border-b-primary placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Payer toggle - text links */}
          <div className="flex items-center gap-3 py-1">
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pago</span>
            <div className="flex items-center gap-2">
              {[
                { val: "compartido" as const, label: "50/50" },
                { val: "franco" as const, label: usuario.perfiles.find(p => p.nombre === "Franco")?.nombre ?? "Franco" },
                { val: "fabiola" as const, label: usuario.perfiles.find(p => p.nombre === "Fabiola")?.nombre ?? "Fabiola" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPagador(val)}
                  className={`font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors ${
                    pagador === val
                      ? "text-secondary border-secondary"
                      : "text-on-surface-variant border-transparent hover:text-on-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Total preview */}
        {montoCalculado > 0 && (
          <div className="mt-4 flex items-baseline justify-between border-t border-outline-variant/15 pt-3">
            <span className="font-label text-[10px] uppercase tracking-widest text-outline">Total</span>
            <span className="font-label text-2xl font-bold tracking-tight tabular-nums text-primary">
              {formatearPeso(montoCalculado)}
            </span>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-outline-variant/20 px-4 py-2.5 pb-safe">
        <div className="mx-auto flex max-w-[480px] gap-2">
          <button
            type="button"
            onClick={guardarPendiente}
            disabled={guardando || !monto.trim()}
            className="h-11 flex-1 rounded border border-outline-variant/30 bg-surface-container-high font-headline text-sm font-semibold text-on-surface disabled:opacity-50 hover:bg-surface-container-highest active:scale-[0.98] transition-all"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={guardarYDetallar}
            disabled={guardandoDetallar || !monto.trim()}
            className="h-11 flex-1 rounded bg-primary font-headline text-sm font-semibold text-on-primary disabled:opacity-50 hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            {guardandoDetallar ? "Guardando..." : "Detallar"}
          </button>
        </div>
      </footer>
    </div>
  );
}
