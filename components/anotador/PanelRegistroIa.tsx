"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Keyboard, Mic, MicOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRegistroIa } from "@/hooks/useRegistroIa";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarOffline } from "@/hooks/usarOffline";
import { usarUsuario } from "@/hooks/usarUsuario";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { formatearPeso } from "@/lib/formatear";
import { vibrarExito } from "@/lib/haptics";
import { normalizarTexto } from "@/lib/utiles";

interface Props {
  onBack: () => void;
}

function labelRol(role: "user" | "assistant") {
  return role === "user" ? "Vos" : "IA";
}

export function PanelRegistroIa({ onBack }: Props) {
  const router = useRouter();
  const compras = usarCompras({ cargarInicial: true, incluirBorradores: true });
  const categorias = usarCategorias();
  const usuario = usarUsuario();
  const { guardarConFallback } = usarOffline(compras.guardarCompra);
  const ia = useRegistroIa({
    compras: compras.compras,
    categorias: categorias.categorias,
    subcategorias: categorias.subcategorias,
  });
  const voice = useVoiceRecognition();

  const [input, setInput] = useState("");
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const borrador = ia.resultado?.draft ?? null;
  const faltantes = ia.resultado?.faltantes ?? [];
  const puedeGuardarActual = ia.modoActivo === "completo"
    ? Boolean(ia.resultado?.canSave)
    : Boolean(ia.resultado?.draft && (ia.resultado?.canSave || ia.faltanMontosEnRapido));

  const totalItems = useMemo(() => {
    if (!borrador) return 0;
    return borrador.items.reduce((acc, item) => acc + (item.monto ?? 0), 0);
  }, [borrador]);

  async function asegurarEtiquetaIa() {
    const existente = categorias.etiquetas.find((e) => normalizarTexto(e.nombre) === "ia");
    if (existente) return existente.id;
    try {
      const creada = await categorias.crearEtiqueta({ nombre: "IA", color: "#6366f1" });
      return creada.id;
    } catch {
      await categorias.recargar();
      return categorias.etiquetas.find((e) => normalizarTexto(e.nombre) === "ia")?.id ?? "";
    }
  }

  async function guardarBorradorIa() {
    const compra = ia.buildCompraEditable({
      registradoPor: usuario.perfil?.nombre ?? "IA",
      incluirAjuste: ia.modoActivo === "rapido",
    });
    if (!compra) {
      toast.error("Todavia no hay datos para guardar");
      return;
    }

    try {
      setGuardando(true);
      const etiquetaIaId = await asegurarEtiquetaIa();
      if (etiquetaIaId) {
        compra.etiquetas_compra_ids = [...new Set([...(compra.etiquetas_compra_ids ?? []), etiquetaIaId])];
      }
      const resultado = await guardarConFallback(compra);
      toast.success(resultado.pendiente ? "Borrador IA guardado (sin conexion)" : "Borrador IA guardado");
      vibrarExito();
      router.push("/borradores");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo guardar";
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  }

  async function enviarRapido() {
    if (!input.trim()) return;
    const texto = input.trim();
    setInput("");
    await ia.ejecutarRapido(texto);
  }

  async function enviarCompletoInicial() {
    if (!input.trim()) return;
    const texto = input.trim();
    setInput("");
    await ia.iniciarCompleto(texto);
  }

  async function responderCompleto() {
    if (!input.trim()) return;
    const texto = input.trim();
    setInput("");
    await ia.responderCompleto(texto);
  }

  async function responderRapido() {
    if (!input.trim()) return;
    const texto = input.trim();
    setInput("");
    await ia.responderRapido(texto);
  }

  async function enviarSegunModo() {
    if (ia.modoActivo === "completo") return responderCompleto();
    if (ia.modoActivo === "rapido") return responderRapido();
    return enviarRapido();
  }

  async function enviarTextoDirecto(texto: string) {
    if (!texto.trim()) return;
    if (ia.modoActivo === "completo") return ia.responderCompleto(texto);
    if (ia.modoActivo === "rapido") return ia.responderRapido(texto);
    return ia.ejecutarRapido(texto);
  }

  function abrirTeclado() {
    inputRef.current?.focus();
  }

  async function usarVozRapida() {
    if (voice.state === "recording") {
      voice.stop();
      return;
    }
    const t = (voice.transcript || voice.interimTranscript || "").trim();
    if (t) {
      voice.reset();
      await enviarTextoDirecto(t);
      return;
    }
    voice.start();
  }

  return (
    <section className="fixed inset-0 z-[70] bg-surface">
      <div className="mx-auto h-full w-full max-w-md px-4 pt-4 pb-3 relative">
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 z-20 h-10 w-10 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center shadow-sm"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="h-full flex flex-col pt-14 pb-40">
          <div className="px-1">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">Registro IA</p>
            <h2 className="font-headline text-lg font-bold text-on-surface mt-1">Habla o escribi. Yo completo el borrador.</h2>
          </div>

          {ia.error && (
            <div className="mt-2 rounded-[12px] bg-error-container text-on-error-container px-3 py-2 text-xs">
              {ia.error}
            </div>
          )}

          {borrador && (
            <div className="mt-2 rounded-[12px] border border-outline-variant/15 bg-surface-container-lowest p-2.5">
              <div className="flex items-center justify-between">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">Detectado</p>
                <span className="text-[10px] text-on-surface-variant/60 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {(borrador.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-on-surface mt-1 truncate">Lugar: {borrador.lugar || "—"} · Pagador: {borrador.pagador ?? "—"}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Total: {borrador.total != null ? formatearPeso(borrador.total) : "—"} · Items: {borrador.items.length} ({formatearPeso(totalItems)})
              </p>
              {faltantes.length > 0 && (
                <p className="text-[11px] text-on-surface-variant mt-1">Faltan: {faltantes.join(", ")}</p>
              )}
            </div>
          )}

          {ia.modoActivo === "completo" && faltantes.includes("pagador") && (
            <div className="mt-2 rounded-[12px] border border-outline-variant/15 bg-surface-container-lowest p-2.5">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-2">Quien pago</p>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => void enviarTextoDirecto("Pago Franco")} className="h-9 rounded-[10px] bg-surface-container-low text-on-surface text-xs font-label font-bold uppercase">Franco</button>
                <button type="button" onClick={() => void enviarTextoDirecto("Pago Fabiola")} className="h-9 rounded-[10px] bg-surface-container-low text-on-surface text-xs font-label font-bold uppercase">Fabiola</button>
                <button type="button" onClick={() => void enviarTextoDirecto("Fue compartido")} className="h-9 rounded-[10px] bg-surface-container-low text-on-surface text-xs font-label font-bold uppercase">Compartido</button>
              </div>
            </div>
          )}

          <div className="mt-2 flex-1 min-h-0 rounded-[14px] border border-outline-variant/15 bg-surface-container-lowest p-3 overflow-y-auto space-y-2">
            {ia.mensajes.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Ejemplo: "Compre en Coto por cuarenta y cuatro mil trescientos pesos una leche y 3 cafes".
              </p>
            ) : (
              ia.mensajes.map((m, idx) => (
                <div key={`${m.role}-${idx}`} className="space-y-0.5">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">{labelRol(m.role)}</p>
                  <p className="text-sm text-on-surface">{m.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="absolute left-4 right-4 bottom-3 z-20">
          <div className="rounded-[14px] border border-outline-variant/15 bg-surface-container-lowest p-2.5 space-y-2 shadow-lg">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ia.modoActivo ? "Responder..." : "Escribi o usa el boton de voz..."}
              className="w-full min-h-16 max-h-24 rounded-[10px] bg-surface-container-low border border-outline-variant/15 px-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
            />

            {ia.modoActivo ? (
              <button
                type="button"
                onClick={enviarSegunModo}
                disabled={ia.cargando || !input.trim()}
                className="w-full h-10 rounded-[12px] bg-secondary text-on-secondary font-headline text-sm font-bold disabled:opacity-40"
              >
                {ia.cargando ? "Procesando..." : "Enviar"}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={enviarRapido}
                  disabled={ia.cargando || !input.trim()}
                  className="h-10 rounded-[12px] bg-secondary text-on-secondary font-headline text-sm font-bold disabled:opacity-40"
                >
                  Registro rapido
                </button>
                <button
                  type="button"
                  onClick={enviarCompletoInicial}
                  disabled={ia.cargando || !input.trim()}
                  className="h-10 rounded-[12px] bg-primary text-on-primary font-headline text-sm font-bold disabled:opacity-40"
                >
                  Registro completo
                </button>
              </div>
            )}

            {ia.modoActivo === "rapido" && ia.faltanMontosEnRapido && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={ia.pasarRapidoACompleto} className="h-9 rounded-[10px] bg-surface-container-low text-on-surface text-xs font-label font-bold uppercase">Detallar ahora</button>
                <button type="button" onClick={guardarBorradorIa} disabled={guardando || !puedeGuardarActual} className="h-9 rounded-[10px] bg-secondary text-on-secondary text-xs font-label font-bold uppercase disabled:opacity-40">
                  {guardando ? "Guardando..." : "Guardar rapido"}
                </button>
              </div>
            )}

            {puedeGuardarActual && !(ia.modoActivo === "rapido" && ia.faltanMontosEnRapido) && (
              <button
                type="button"
                onClick={guardarBorradorIa}
                disabled={guardando}
                className="w-full h-10 rounded-[12px] bg-secondary text-on-secondary font-headline text-sm font-bold disabled:opacity-40"
              >
                {guardando ? "Guardando..." : "Guardar borrador IA"}
              </button>
            )}
          </div>
        </div>

        <div className="absolute right-4 bottom-44 z-30 flex flex-col gap-2">
          <button
            type="button"
            onClick={abrirTeclado}
            className="h-12 w-12 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center shadow-md"
            aria-label="Abrir teclado"
            title="Abrir teclado"
          >
            <Keyboard className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => void usarVozRapida()}
            className="h-14 w-14 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-lg shadow-secondary/30"
            aria-label={voice.state === "recording" ? "Detener voz" : "Hablar"}
            title={voice.state === "recording" ? "Detener voz" : "Hablar"}
          >
            {voice.state === "recording" ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
        </div>

        {(ia.resultado || ia.mensajes.length > 0) && (
          <button
            type="button"
            onClick={() => {
              ia.reset();
              setInput("");
              voice.reset();
            }}
            className="absolute left-4 bottom-44 z-20 h-10 px-3 rounded-[10px] bg-surface-container-low text-on-surface-variant font-label text-xs"
          >
            Reiniciar
          </button>
        )}
      </div>
    </section>
  );
}

