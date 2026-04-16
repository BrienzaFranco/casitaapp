"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const borrador = ia.resultado?.draft ?? null;
  const faltantes = ia.resultado?.faltantes ?? [];
  const mostrarResolucion = Boolean(ia.pendingResolution);
  const mostrarOpcionesPagador = ia.modoActivo === "completo" && faltantes.includes("pagador");
  const mostrarReiniciar = Boolean(ia.resultado || ia.mensajes.length > 0);
  const puedeGuardarActual = ia.modoActivo === "completo"
    ? Boolean(ia.resultado?.canSave)
    : Boolean(ia.resultado?.draft && (ia.resultado?.canSave || ia.faltanMontosEnRapido));

  const totalItems = useMemo(() => {
    if (!borrador) return 0;
    return borrador.items.reduce((acc, item) => acc + (item.monto ?? 0), 0);
  }, [borrador]);

  useEffect(() => {
    if (mostrarOpcionesPagador || mostrarResolucion) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [ia.mensajes, ia.cargando, mostrarOpcionesPagador, mostrarResolucion]);

  useEffect(() => {
    if (voice.state !== "done") return;
    const t = voice.transcript.trim();
    if (!t) return;
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t));
    inputRef.current?.focus();
    voice.reset();
  }, [voice, voice.state, voice.transcript, voice.reset]);

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
    if (voice.state === "done") return;
    voice.start();
  }

  return (
    <section className="fixed inset-0 z-[70] bg-surface">
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-4 pt-4 pb-3 overflow-hidden">
        <div className="relative h-10 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 top-0 z-20 h-10 w-10 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center shadow-sm"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {mostrarReiniciar && (
            <button
              type="button"
              onClick={() => {
                ia.reset();
                setInput("");
                voice.reset();
              }}
              className="absolute right-0 top-0 z-20 h-10 px-3 rounded-[10px] bg-surface-container-low text-on-surface-variant font-label text-xs"
            >
              Reiniciar
            </button>
          )}
        </div>

        <div className="mt-2 px-1 shrink-0">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">Registro IA</p>
          <h2 className="font-headline text-lg font-bold text-on-surface mt-1">Habla o escribi. Yo completo el borrador.</h2>
        </div>

        {ia.error && (
          <div className="mt-2 shrink-0 rounded-[12px] bg-error-container text-on-error-container px-3 py-2 text-xs space-y-2">
            <p>{ia.error}</p>
            {ia.puedeReintentar && (
              <button
                type="button"
                onClick={() => void ia.reintentarUltimoMensaje()}
                className="h-8 rounded-[10px] bg-on-error-container/15 px-3 text-[11px] font-label font-bold uppercase tracking-wide"
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        {ia.cargando && !borrador && (
          <div className="mt-2 shrink-0 rounded-[12px] border border-outline-variant/15 bg-surface-container-lowest p-2.5 animate-pulse">
            <div className="flex items-center justify-between">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">Interpretando</p>
              <span className="text-[10px] text-on-surface-variant/60">IA</span>
            </div>
            <div className="mt-2 h-3 rounded bg-surface-container-low" />
            <div className="mt-1.5 h-3 w-3/4 rounded bg-surface-container-low" />
          </div>
        )}

        {borrador && (
          <div className="mt-2 shrink-0 rounded-[12px] border border-outline-variant/15 bg-surface-container-lowest p-2.5">
            <div className="flex items-center justify-between">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">Detectado</p>
              <div className="inline-flex items-center gap-2">
                {ia.modoActivo === "rapido" && puedeGuardarActual && (
                  <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wide text-secondary">
                    Guardado rapido
                  </span>
                )}
                <span className="text-[10px] text-on-surface-variant/60 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {(borrador.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-on-surface mt-1 truncate">Lugar: {borrador.lugar || "-"} | Pagador: {borrador.pagador ?? "-"}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Total: {borrador.total != null ? formatearPeso(borrador.total) : "-"} | Items: {borrador.items.length} ({formatearPeso(totalItems)})
            </p>
            {faltantes.length > 0 && (
              <p className="text-[11px] text-on-surface-variant mt-1">Faltan: {faltantes.join(", ")}</p>
            )}
          </div>
        )}

        <div className="mt-2 min-h-0 flex-1 rounded-[14px] border border-outline-variant/15 bg-surface-container-lowest overflow-hidden">
          {mostrarResolucion ? (
            <div className="h-full overflow-y-auto overscroll-contain p-3 flex flex-col justify-center">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">Aclaracion</p>
              <h3 className="mt-1 text-base font-headline font-bold text-on-surface">Necesito que elijas una opcion</h3>
              <p className="mt-1 text-xs text-on-surface-variant">{ia.pendingResolution?.reason || "Encontre mas de una coincidencia."}</p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {(ia.pendingResolution?.options ?? []).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => ia.resolverAmbiguedad(option.id)}
                    className="h-11 rounded-[12px] bg-surface-container-low text-on-surface text-sm font-label font-bold"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : mostrarOpcionesPagador ? (
            <div className="h-full overflow-y-auto overscroll-contain p-3 flex flex-col justify-center">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">Seleccion rapida</p>
              <h3 className="mt-1 text-base font-headline font-bold text-on-surface">Quien pago esta compra</h3>
              <p className="mt-1 text-xs text-on-surface-variant">Elegi una opcion o escribi una respuesta personalizada.</p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <button type="button" onClick={() => void enviarTextoDirecto("Pago Franco")} className="h-11 rounded-[12px] bg-surface-container-low text-on-surface text-sm font-label font-bold uppercase">Franco</button>
                <button type="button" onClick={() => void enviarTextoDirecto("Pago Fabiola")} className="h-11 rounded-[12px] bg-surface-container-low text-on-surface text-sm font-label font-bold uppercase">Fabiola</button>
                <button type="button" onClick={() => void enviarTextoDirecto("Fue compartido")} className="h-11 rounded-[12px] bg-surface-container-low text-on-surface text-sm font-label font-bold uppercase">Compartido</button>
              </div>
            </div>
          ) : (
            <div ref={chatScrollRef} className="h-full overflow-y-auto overscroll-contain p-3 space-y-2">
              {ia.mensajes.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Ejemplo: &quot;Compre en Coto por cuarenta y cuatro mil trescientos pesos una leche y 3 cafes&quot;.
                </p>
              ) : (
                ia.mensajes.map((m, idx) => (
                  <div key={`${m.role}-${idx}`} className="space-y-0.5">
                    <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">{labelRol(m.role)}</p>
                    <p className="text-sm text-on-surface">{m.text}</p>
                  </div>
                ))
              )}
              {ia.cargando && (
                <div className="max-w-[85%] rounded-[12px] bg-surface-container-low px-3 py-2">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">IA</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Pensando...</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-secondary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-secondary/70 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-2 w-2 rounded-full bg-secondary/70 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 shrink-0 rounded-[14px] border border-outline-variant/15 bg-surface-container-lowest p-2.5 space-y-2 shadow-lg">
          {ia.cargando && (
            <div className="h-1.5 rounded-full bg-secondary/20 overflow-hidden">
              <div className="h-full w-1/2 bg-secondary animate-pulse" />
            </div>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ia.modoActivo ? "Responder..." : "Escribi o usa voz..."}
            className="w-full min-h-11 max-h-20 rounded-[10px] bg-surface-container-low border border-outline-variant/15 px-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40 leading-5 overflow-y-auto"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={abrirTeclado}
              className="h-10 w-10 rounded-[10px] bg-surface-container-high text-on-surface flex items-center justify-center"
              aria-label="Abrir teclado"
              title="Abrir teclado"
            >
              <Keyboard className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void usarVozRapida()}
              className={`h-10 w-10 rounded-[10px] bg-secondary text-on-secondary flex items-center justify-center ${voice.state === "recording" ? "animate-pulse" : ""}`}
              aria-label={voice.state === "recording" ? "Detener voz" : "Hablar"}
              title={voice.state === "recording" ? "Detener voz" : "Hablar"}
            >
              {voice.state === "recording" ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {ia.modoActivo ? (
              <button
                type="button"
                onClick={enviarSegunModo}
                disabled={ia.cargando || !input.trim()}
                className="flex-1 h-10 rounded-[12px] bg-secondary text-on-secondary font-headline text-sm font-bold disabled:opacity-40"
              >
                {ia.cargando ? "Procesando..." : "Enviar"}
              </button>
            ) : (
              <div className="flex-1 grid grid-cols-2 gap-2">
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
          </div>

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
    </section>
  );
}
