"use client";

import { useMemo, useState, useRef, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Mic, ChevronRight, ChevronLeft, X } from "lucide-react";
import type { CompraEditable, PagadorCompra, TipoReparto } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { calcularReparto } from "@/lib/calculos";
import { vibrarExito } from "@/lib/haptics";
import { fechaLocalISO, mesClave } from "@/lib/utiles";
import { usarCompras } from "@/hooks/usarCompras";
import { usarOffline } from "@/hooks/usarOffline";
import { usarUsuario } from "@/hooks/usarUsuario";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";

// ─── Types ──────────────────────────────────────────────────────────────────

type PasoActivo = 1 | 2 | 3 | 4 | 5;
type ModoEntrada = "pasos" | "foto" | "voz";
type Direccion = "forward" | "back";

interface BorradorRapido {
  pagador: PagadorCompra | null;
  monto: number | null;
  montoRaw: string;
  item: string | null;
  lugar: string | null;
  imagenBase64?: string;
  textoReferencia?: string;
  fuenteEntrada: ModoEntrada;
}

function hoy() { return fechaLocalISO(); }

function generarIdTemporal() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `tmp-${crypto.randomUUID()}`;
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcularRecencia(fecha: string): number {
  if (!fecha) return 0;
  const diff = Date.now() - new Date(`${fecha}T00:00:00`).getTime();
  const dias = diff / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - dias / 90); // decae en 90 días
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PaginaAnotadorRapido() {
  const router = useRouter();
  const compras = usarCompras();
  const usuario = usarUsuario();
  const config = usarConfiguracion();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;
  const { guardarConFallback } = usarOffline(compras.guardarCompra);
  const nombrePagador = usuario.perfil?.nombre ?? "";

  const voice = useVoiceRecognition();
  const imgRef = useRef<HTMLInputElement>(null);

  // Main state
  const [modo, setModo] = useState<ModoEntrada | null>(null);
  const [paso, setPaso] = useState<PasoActivo>(1);
  const [direccion, setDireccion] = useState<Direccion>("forward");
  const [borrador, setBorrador] = useState<BorradorRapido>({
    pagador: null, monto: null, montoRaw: "", item: null, lugar: null, fuenteEntrada: "pasos",
  });
  const [guardando, setGuardando] = useState(false);

  // Touch handling for swipe
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  function avanzar() {
    if (paso < 5) {
      setDireccion("forward");
      setPaso((p) => Math.min(p + 1, 5) as PasoActivo);
    }
  }

  function retroceder() {
    if (paso > 1) {
      setDireccion("back");
      setPaso((p) => Math.max(p - 1, 1) as PasoActivo);
    }
  }

  function navegarA(nuevo: PasoActivo) {
    setDireccion(nuevo > paso ? "forward" : "back");
    setPaso(nuevo);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 80) {
      if (deltaX < -80 && paso < 5) avanzar();
      if (deltaX > 80 && paso > 1) retroceder();
    }
  }

  function reiniciar() {
    setBorrador({ pagador: borrador.pagador, monto: null, montoRaw: "", item: null, lugar: null, fuenteEntrada: "pasos" });
    setPaso(1);
    setDireccion("forward");
  }

  function irInicio() {
    setModo(null);
    setPaso(1);
    setBorrador({ pagador: null, monto: null, montoRaw: "", item: null, lugar: null, fuenteEntrada: "pasos" });
    voice.reset();
  }

  // ── Suggestions ──
  const sugerenciasItems = useMemo(() => {
    const frecuencia: Record<string, { count: number; ultimoMonto: number; ultimaFecha: string }> = {};
    for (const compra of compras.compras) {
      for (const item of compra.items) {
        const desc = (item.descripcion || "").toLowerCase().trim();
        if (!desc) continue;
        if (!frecuencia[desc]) frecuencia[desc] = { count: 0, ultimoMonto: 0, ultimaFecha: "" };
        frecuencia[desc].count++;
        frecuencia[desc].ultimoMonto = item.monto_resuelto;
        frecuencia[desc].ultimaFecha = compra.fecha;
      }
    }
    return Object.entries(frecuencia)
      .map(([desc, data]) => ({
        descripcion: desc,
        ultimoMonto: data.ultimoMonto,
        score: data.count * 0.6 + calcularRecencia(data.ultimaFecha) * 0.4,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [compras.compras]);

  const ultimosLugares = useMemo(() => {
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const c of compras.compras) {
      if (c.nombre_lugar && !vistos.has(c.nombre_lugar)) {
        vistos.add(c.nombre_lugar);
        resultado.push(c.nombre_lugar);
      }
    }
    return resultado.slice(0, 20);
  }, [compras.compras]);

  const sugerenciasLugar = useMemo(() => {
    if (!borrador.item) return ultimosLugares.slice(0, 5);
    const lugaresPorItem = compras.compras
      .filter((c) => c.items.some((i) => i.descripcion?.toLowerCase().includes(borrador.item!.toLowerCase())))
      .map((c) => c.nombre_lugar)
      .filter((l): l is string => Boolean(l));
    const unicos = [...new Set(lugaresPorItem)];
    return unicos.length > 0 ? unicos.slice(0, 4) : ultimosLugares.slice(0, 4);
  }, [borrador.item, ultimosLugares, compras.compras]);

  // ── Drafts ──
  const borradoresPendientes = useMemo(() => {
    return compras.compras
      .filter((c) => c.estado === "borrador")
      .sort((a, b) => b.creado_en?.localeCompare(a.creado_en ?? "") ?? 0)
      .slice(0, 3);
  }, [compras.compras]);

  // ── Photo handling ──
  async function handleFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagen muy grande (max 5MB)"); return; }
    const base64 = await fileToBase64(file);
    setBorrador((b) => ({ ...b, imagenBase64: base64, fuenteEntrada: "foto" }));
    setModo("pasos");
    setPaso(1);
    if (imgRef.current) imgRef.current.value = "";
  }

  // ── Voice handling ──
  function iniciarVoz() {
    voice.reset();
    voice.start();
  }

  const [textoVozEditable, setTextoVozEditable] = useState("");

  function usarTextoVoz() {
    const texto = textoVozEditable || voice.transcript;
    if (!texto) return;
    setBorrador((b) => ({ ...b, textoReferencia: texto, fuenteEntrada: "voz" }));
    setModo("pasos");
    setPaso(1);
  }

  // ── Save ──
  async function guardarBorrador(irABorradores = true) {
    if (!borrador.pagador || borrador.monto == null) return;
    try {
      setGuardando(true);
      const tipoReparto: TipoReparto = borrador.pagador === "compartido" ? "50/50" : `solo_${borrador.pagador}`;
      const reparto = calcularReparto(tipoReparto, borrador.monto);

      let notas = `Cargado desde registro rápido (${borrador.fuenteEntrada})`;
      if (borrador.imagenBase64) {
        // TODO: Upload to Supabase Storage bucket 'casita-tickets' when available
        // For now, store base64 reference in notes (truncated for readability)
        notas += `\n[imagen adjunta - ${borrador.imagenBase64.length > 50 ? "base64..." : "base64"}]`;
      }
      if (borrador.textoReferencia) {
        notas += `\nTexto original: ${borrador.textoReferencia}`;
      }

      const compra: CompraEditable = {
        id: generarIdTemporal(),
        fecha: hoy(),
        nombre_lugar: borrador.lugar || "Sin especificar",
        notas,
        registrado_por: nombrePagador,
        pagador_general: borrador.pagador,
        estado: "borrador",
        etiquetas_compra_ids: [],
        items: [{
          id: generarIdTemporal(),
          descripcion: borrador.item || "Sin descripción",
          categoria_id: "",
          subcategoria_id: "",
          expresion_monto: String(borrador.monto),
          monto_resuelto: borrador.monto,
          tipo_reparto: tipoReparto,
          pago_franco: reparto.pago_franco,
          pago_fabiola: reparto.pago_fabiola,
          etiquetas_ids: [],
        }],
      };

      const resultado = await guardarConFallback(compra);
      if (resultado.pendiente) toast.success("Borrador guardado (sin conexión)");
      else toast.success("Borrador guardado");
      vibrarExito();

      if (irABorradores) {
        router.push("/borradores");
      } else {
        // "Agregar otro" - keep payer, reset rest
        const pagGuardada = borrador.pagador;
        setBorrador({ pagador: pagGuardada, monto: null, montoRaw: "", item: null, lugar: null, fuenteEntrada: "pasos" });
        setPaso(1);
        setDireccion("forward");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  }

  // ── Focus monto input on step 2 ──
  const montoInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (paso === 2 && montoInputRef.current) {
      setTimeout(() => montoInputRef.current?.focus(), 100);
    }
  }, [paso]);

  // ── Render ──

  // ── Entry screen ──
  if (!modo) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="max-w-md mx-auto px-4 pt-12 pb-8 space-y-6">
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">Registro rápido</p>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface mt-1">
              Anotar gasto
            </h1>
          </div>

          {/* Mode buttons */}
          <button
            type="button"
            onClick={() => setModo("pasos")}
            className="w-full py-5 rounded-[16px] bg-secondary text-on-secondary font-headline text-lg font-bold shadow-lg shadow-secondary/20 active:scale-[0.98] transition-transform"
          >
            ⚡ Paso a paso
            <p className="text-xs font-label font-normal opacity-70 mt-0.5">Elegí quién pagó, cuánto, qué y dónde</p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/?chat=open")}
            className="w-full py-4 rounded-[14px] bg-primary text-on-primary font-headline text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
          >
            ✨ Chat IA
            <p className="text-xs font-label font-normal opacity-80 mt-0.5">Consultá datos o anotá gastos con IA</p>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              className="py-5 rounded-[14px] bg-surface-container-low border border-outline-variant/15 text-on-surface font-headline text-sm font-medium active:scale-[0.97] transition-transform text-center"
            >
              <Camera className="h-5 w-5 mx-auto mb-1.5 opacity-50" />
              Foto del ticket
              <p className="text-[9px] font-label text-on-surface-variant/50 mt-0.5 leading-tight">Sacá foto y completá los datos a mano</p>
            </button>
            <button
              type="button"
              onClick={() => { setModo("voz"); iniciarVoz(); }}
              className="py-5 rounded-[14px] bg-surface-container-low border border-outline-variant/15 text-on-surface font-headline text-sm font-medium active:scale-[0.97] transition-transform text-center"
            >
              <Mic className="h-5 w-5 mx-auto mb-1.5 opacity-50" />
              Nota de voz
              <p className="text-[9px] font-label text-on-surface-variant/50 mt-0.5 leading-tight">Grabá y completá los datos a mano</p>
            </button>
          </div>

          <input ref={imgRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />

          {/* Pending drafts */}
          {borradoresPendientes.length > 0 && (
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50 mb-2">
                Borradores pendientes ({borradoresPendientes.length})
              </p>
              <div className="space-y-1.5">
                {borradoresPendientes.map((b) => {
                  const total = b.items.reduce((a, i) => a + i.monto_resuelto, 0);
                  const hace = (() => {
                    if (!b.creado_en) return "";
                    const diff = Date.now() - new Date(b.creado_en).getTime();
                    const horas = Math.round(diff / (1000 * 60 * 60));
                    if (horas < 1) return "hace poco";
                    if (horas < 24) return `hace ${horas}h`;
                    return `hace ${Math.round(horas / 24)}d`;
                  })();
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => router.push("/borradores")}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] bg-surface-container-low active:bg-surface-container transition-colors"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-[13px] text-on-surface truncate">{b.nombre_lugar || "Sin lugar"}</p>
                        <p className="text-[10px] text-on-surface-variant/50">{hace}</p>
                      </div>
                      <span className="text-[14px] font-semibold tabular-nums text-on-surface">{formatearPeso(total)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (modo === "voz") {
    const estados: Record<string, { icon: string; title: string; sub: string }> = {
      idle: { icon: "🎤", title: "Grabar nota de voz", sub: "Tocá para empezar" },
      recording: { icon: "🔴", title: "Escuchando...", sub: "Decí tu gasto en voz alta" },
      done: { icon: "✅", title: "Texto capturado", sub: "Revisalo y seguí" },
      error: { icon: "❌", title: "Error al grabar", sub: "Intentá de nuevo" },
      unsupported: { icon: "⚠️", title: "Voz no disponible", sub: "Usá el modo paso a paso" },
    };
    const est = estados[voice.state];

    return (
      <div className="min-h-screen bg-surface">
        <div className="max-w-md mx-auto px-4 pt-6 pb-8 space-y-6">
          <button type="button" onClick={irInicio} className="text-[12px] text-on-surface-variant/50 hover:text-on-surface">
            ← Volver
          </button>

          <div className="text-center space-y-4">
            <div className="text-6xl">{est.icon}</div>
            <h2 className="font-headline text-xl font-bold text-on-surface">{est.title}</h2>
            <p className="text-sm text-on-surface-variant">{est.sub}</p>
          </div>

          {/* Recording button / transcript */}
          {(voice.state === "idle" || voice.state === "recording") && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={voice.state === "idle" ? voice.start : voice.stop}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all ${
                  voice.state === "recording"
                    ? "bg-[#E24B4A] text-white animate-pulse"
                    : "bg-secondary text-on-secondary active:scale-95"
                }`}
              >
                {voice.state === "recording" ? "⏹" : "🎤"}
              </button>
            </div>
          )}

          {voice.state === "done" && (
            <div className="space-y-3">
              <textarea
                value={textoVozEditable || voice.transcript}
                onChange={(e) => setTextoVozEditable(e.target.value)}
                className="w-full h-24 rounded-[12px] bg-surface-container-low p-3 text-sm text-on-surface outline-none border border-outline-variant/15"
                placeholder="Texto capturado..."
              />
              <button
                type="button"
                onClick={usarTextoVoz}
                className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline text-base font-bold active:scale-[0.98] transition-transform"
              >
                Continuar al registro →
              </button>
              <button
                type="button"
                onClick={() => { voice.reset(); voice.start(); setTextoVozEditable(""); }}
                className="w-full py-3 rounded-[14px] bg-surface-container-low text-on-surface-variant font-label text-sm"
              >
                Grabar de nuevo
              </button>
            </div>
          )}

          {voice.state === "error" && (
            <button
              type="button"
              onClick={() => { voice.reset(); voice.start(); }}
              className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline text-base font-bold"
            >
              Intentar de nuevo
            </button>
          )}

          {voice.state === "unsupported" && (
            <div className="space-y-3">
              <p className="text-sm text-on-surface-variant text-center">
                Tu navegador no soporta reconocimiento de voz. Usá el modo paso a paso:
              </p>
              <button
                type="button"
                onClick={() => setModo("pasos")}
                className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline text-base font-bold"
              >
                Ir al paso a paso
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step-by-step mode ──
  const pasos: Record<number, { titulo: string; icon: string }> = {
    1: { titulo: "¿Quién pagó?", icon: "👤" },
    2: { titulo: "¿Cuánto?", icon: "💰" },
    3: { titulo: "¿Qué cosa?", icon: "📦" },
    4: { titulo: "¿Dónde?", icon: "📍" },
    5: { titulo: "Confirmar", icon: "✓" },
  };

  return (
    <div
      className="min-h-screen bg-surface flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Photo thumbnail (top dead zone) */}
      {borrador.imagenBase64 && (
        <div className="absolute top-2 right-2 z-30">
          <div className="relative">
            <img src={borrador.imagenBase64} alt="Ticket" className="w-12 h-12 rounded-[8px] object-cover border border-outline-variant/20" />
            <button
              type="button"
              onClick={() => setBorrador((b) => ({ ...b, imagenBase64: undefined }))}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E24B4A] text-white text-[8px] flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Reference text (voice mode) */}
      {borrador.textoReferencia && (
        <div className="bg-[#E6F1FB] px-4 py-2 text-[11px] text-[#042C53]">
          <span className="opacity-60">Voz:</span> {borrador.textoReferencia}
          <button type="button" onClick={() => setBorrador((b) => ({ ...b, textoReferencia: undefined }))} className="ml-2 underline">Quitar</button>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 py-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-2 rounded-full transition-all duration-200 ${
              n === paso ? "w-6 bg-secondary" : n < paso ? "w-2 bg-secondary/40" : "w-2 bg-outline-variant/30"
            }`}
          />
        ))}
      </div>

      {/* Steps container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          key={paso}
          className="absolute inset-0 flex flex-col items-center justify-center px-4"
          style={{
            animation: direccion === "forward" ? "slideInRight 250ms ease-out" : "slideInLeft 250ms ease-out",
          }}
        >
          {/* ── PASO 1: Quién pagó ── */}
          {paso === 1 && (
            <div className="w-full max-w-md space-y-3 pt-8">
              <h2 className="font-headline text-xl font-bold text-on-surface text-center mb-6">{pasos[1].titulo}</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setBorrador((b) => ({ ...b, pagador: "franco" })); avanzar(); }}
                  className="py-6 rounded-[16px] font-headline text-base font-bold active:scale-[0.97] transition-transform"
                  style={{ backgroundColor: `${colorFran}20`, color: colorFran }}
                >
                  Franco
                </button>
                <button
                  type="button"
                  onClick={() => { setBorrador((b) => ({ ...b, pagador: "fabiola" })); avanzar(); }}
                  className="py-6 rounded-[16px] font-headline text-base font-bold active:scale-[0.97] transition-transform"
                  style={{ backgroundColor: `${colorFabi}20`, color: colorFabi }}
                >
                  Fabiola
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setBorrador((b) => ({ ...b, pagador: "compartido" })); avanzar(); }}
                className="w-full py-4 rounded-[14px] bg-surface-container-low border border-outline-variant/15 text-on-surface font-label text-sm active:scale-[0.98] transition-transform"
              >
                Compartido (50/50)
              </button>
            </div>
          )}

          {/* ── PASO 2: Cuánto ── */}
          {paso === 2 && (
            <div className="w-full max-w-md space-y-4 pt-8">
              <h2 className="font-headline text-xl font-bold text-on-surface text-center mb-6">{pasos[2].titulo}</h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl text-on-surface-variant/40">$</span>
                <input
                  ref={montoInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={borrador.montoRaw}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const num = parseInt(raw, 10);
                    setBorrador((b) => ({ ...b, montoRaw: raw, monto: isNaN(num) ? null : num }));
                  }}
                  placeholder="0"
                  className="flex-1 bg-transparent text-center text-5xl font-bold tabular-nums text-on-surface outline-none placeholder:text-on-surface-variant/20"
                />
              </div>
              {borrador.monto != null && borrador.monto > 0 && (
                <p className="text-center text-sm text-on-surface-variant/60">
                  {formatearPeso(borrador.monto)}
                </p>
              )}
              <button
                type="button"
                disabled={borrador.monto == null || borrador.monto <= 0}
                onClick={avanzar}
                className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline text-base font-bold disabled:opacity-30 active:scale-[0.98] transition-transform"
              >
                Listo
              </button>
            </div>
          )}

          {/* ── PASO 3: Qué cosa ── */}
          {paso === 3 && (
            <div className="w-full max-w-md space-y-3 pt-8">
              <h2 className="font-headline text-xl font-bold text-on-surface text-center mb-6">{pasos[3].titulo}</h2>
              <input
                type="text"
                inputMode="text"
                value={borrador.item || ""}
                onChange={(e) => setBorrador((b) => ({ ...b, item: e.target.value }))}
                placeholder="Ej: Yerba, Pan, Nafta..."
                className="w-full bg-surface-container-lowest rounded-[12px] border border-outline-variant/15 px-4 py-3 text-base text-on-surface outline-none placeholder:text-on-surface-variant/40"
                autoFocus
              />
              {sugerenciasItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sugerenciasItems.map((s) => (
                    <button
                      key={s.descripcion}
                      type="button"
                      onClick={() => {
                        const itemTitle = s.descripcion.charAt(0).toUpperCase() + s.descripcion.slice(1);
                        setBorrador((b) => {
                          const nuevo = { ...b, item: itemTitle };
                          // If amount differs from suggestion, toast
                          if (b.monto != null && b.monto > 0 && s.ultimoMonto > 0 && Math.abs(b.monto - s.ultimoMonto) / s.ultimoMonto > 0.2) {
                            toast(`¿Actualizar monto a ${formatearPeso(s.ultimoMonto)}?`, {
                              action: {
                                label: "Sí",
                                onClick: () => setBorrador((bb) => ({ ...bb, monto: s.ultimoMonto, montoRaw: String(s.ultimoMonto) })),
                              },
                              duration: 5000,
                            });
                          }
                          return nuevo;
                        });
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                      {s.descripcion}
                      {s.ultimoMonto > 0 && (
                        <span className="ml-1 opacity-50">{formatearPeso(s.ultimoMonto)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                disabled={!borrador.item}
                onClick={avanzar}
                className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline text-base font-bold disabled:opacity-30 active:scale-[0.98] transition-transform mt-3"
              >
                Siguiente →
              </button>
            </div>
          )}

          {/* ── PASO 4: Dónde ── */}
          {paso === 4 && (
            <div className="w-full max-w-md space-y-3 pt-8">
              <h2 className="font-headline text-xl font-bold text-on-surface text-center mb-2">{pasos[4].titulo} <span className="text-sm font-normal text-on-surface-variant/50">(opcional)</span></h2>
              <input
                type="text"
                inputMode="text"
                value={borrador.lugar || ""}
                onChange={(e) => setBorrador((b) => ({ ...b, lugar: e.target.value }))}
                placeholder="Ej: Carrefour, Farmacia..."
                className="w-full bg-surface-container-lowest rounded-[12px] border border-outline-variant/15 px-4 py-3 text-base text-on-surface outline-none placeholder:text-on-surface-variant/40"
              />
              {sugerenciasLugar.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sugerenciasLugar.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setBorrador((b) => ({ ...b, lugar: l }))}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={avanzar}
                className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline text-base font-bold active:scale-[0.98] transition-transform mt-3"
              >
                Saltear →
              </button>
            </div>
          )}

          {/* ── PASO 5: Confirmar ── */}
          {paso === 5 && (
            <div className="w-full max-w-md space-y-4 pt-8">
              <h2 className="font-headline text-xl font-bold text-on-surface text-center mb-6">{pasos[5].titulo}</h2>
              <div className="bg-surface-container-lowest rounded-[16px] border border-outline-variant/10 p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant/60">Pagador</span>
                  <span className="text-on-surface font-medium">
                    {borrador.pagador === "franco" ? "Franco" : borrador.pagador === "fabiola" ? "Fabiola" : "Compartido"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant/60">Monto</span>
                  <span className="text-on-surface font-bold tabular-nums">
                    {borrador.monto != null ? formatearPeso(borrador.monto) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant/60">Item</span>
                  <span className="text-on-surface">{borrador.item || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant/60">Lugar</span>
                  <span className="text-on-surface">{borrador.lugar || "—"}</span>
                </div>
                {borrador.fuenteEntrada !== "pasos" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60">Fuente</span>
                    <span className="text-on-surface">{borrador.fuenteEntrada === "foto" ? "📷 Foto" : "🎤 Voz"}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => guardarBorrador(true)}
                disabled={guardando}
                className="w-full py-4 rounded-[14px] bg-secondary text-on-secondary font-headline text-base font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {guardando ? "Guardando..." : "Guardar como borrador"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => guardarBorrador(false)}
                  disabled={guardando}
                  className="py-3 rounded-[12px] bg-surface-container-low text-on-surface font-label text-sm disabled:opacity-50"
                >
                  + Agregar otro
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/borradores")}
                  className="py-3 rounded-[12px] bg-surface-container-low text-on-surface font-label text-sm"
                >
                  Ir a borradores →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav buttons */}
      {paso > 1 && paso < 5 && (
        <div className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={retroceder}
            className="flex items-center gap-1 text-on-surface-variant/50 hover:text-on-surface"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Atrás</span>
          </button>
          <button
            type="button"
            onClick={irInicio}
            className="text-on-surface-variant/40 hover:text-on-surface-variant"
          >
            ✕
          </button>
          {paso < 5 && (
            <button
              type="button"
              onClick={avanzar}
              className="flex items-center gap-1 text-secondary hover:text-secondary/80"
            >
              <span className="text-sm">Siguiente</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Step 1 home button */}
      {paso === 1 && (
        <div className="flex justify-center py-4">
          <button type="button" onClick={irInicio} className="text-on-surface-variant/40 hover:text-on-surface-variant text-sm">
            ✕ Cancelar
          </button>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.3; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0.3; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
