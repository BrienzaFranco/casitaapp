"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Sparkles } from "lucide-react";
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

function resumenMensaje(role: "user" | "assistant") {
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
      toast.error("Todavía no hay datos para guardar");
      return;
    }

    try {
      setGuardando(true);
      const etiquetaIaId = await asegurarEtiquetaIa();
      if (etiquetaIaId) {
        compra.etiquetas_compra_ids = [...new Set([...(compra.etiquetas_compra_ids ?? []), etiquetaIaId])];
      }
      const resultado = await guardarConFallback(compra);
      toast.success(resultado.pendiente ? "Borrador IA guardado (sin conexión)" : "Borrador IA guardado");
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
    if (ia.modoActivo === "completo") {
      await responderCompleto();
      return;
    }
    if (ia.modoActivo === "rapido") {
      await responderRapido();
      return;
    }
    await enviarRapido();
  }

  async function enviarTextoDirecto(texto: string) {
    if (!texto.trim()) return;
    if (ia.modoActivo === "completo") {
      await ia.responderCompleto(texto);
      return;
    }
    if (ia.modoActivo === "rapido") {
      await ia.responderRapido(texto);
      return;
    }
    await ia.ejecutarRapido(texto);
  }

  function usarTranscripcionEnInput() {
    const t = (voice.transcript || voice.interimTranscript || "").trim();
    if (!t) return;
    setInput((prev) => (prev ? `${prev} ${t}` : t));
    voice.reset();
  }

  async function enviarTranscripcionDirecta() {
    const t = (voice.transcript || voice.interimTranscript || "").trim();
    if (!t) return;
    setInput("");
    voice.reset();
    if (ia.modoActivo === "completo") {
      await ia.responderCompleto(t);
      return;
    }
    if (ia.modoActivo === "rapido") {
      await ia.responderRapido(t);
      return;
    }
    await ia.ejecutarRapido(t);
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-md mx-auto px-4 pt-4 pb-3 h-[calc(100vh-8px)] flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] text-on-surface-variant/50 hover:text-on-surface"
        >
          ← Volver
        </button>

        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">Registro IA</p>
          <h2 className="font-headline text-xl font-bold text-on-surface mt-1">Texto o voz + carga inteligente</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Todo se guarda en borradores para revisar después.
          </p>
        </div>

        {ia.error && (
          <div className="rounded-[12px] bg-error-container text-on-error-container px-3 py-2 text-xs">
            {ia.error}
          </div>
        )}

        {ia.mensajes.length > 0 && (
          <div className="rounded-[14px] border border-outline-variant/15 bg-surface-container-lowest p-3 space-y-2 max-h-56 overflow-y-auto">
            {ia.mensajes.map((m, idx) => (
              <div key={`${m.role}-${idx}`} className="space-y-0.5">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">{resumenMensaje(m.role)}</p>
                <p className="text-sm text-on-surface">{m.text}</p>
              </div>
            ))}
          </div>
        )}

        {borrador && (
          <div className="rounded-[14px] border border-outline-variant/15 bg-surface-container-lowest p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">Resumen detectado</p>
              <span className="text-[10px] text-on-surface-variant/60 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {(borrador.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-sm text-on-surface space-y-1">
              <p><span className="text-on-surface-variant/60">Lugar:</span> {borrador.lugar || "—"}</p>
              <p><span className="text-on-surface-variant/60">Total:</span> {borrador.total != null ? formatearPeso(borrador.total) : "—"}</p>
              <p><span className="text-on-surface-variant/60">Pagador:</span> {borrador.pagador ?? "—"}</p>
              <p><span className="text-on-surface-variant/60">Items:</span> {borrador.items.length} ({formatearPeso(totalItems)})</p>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {borrador.items.map((item) => (
                <div key={item.id} className="text-xs text-on-surface flex items-center justify-between gap-2">
                  <span className="truncate">{item.cantidad && item.cantidad > 1 ? `${item.cantidad} ` : ""}{item.descripcion}</span>
                  <span className="tabular-nums text-on-surface-variant">{item.monto != null ? formatearPeso(item.monto) : "sin monto"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ia.modoActivo && faltantes.length > 0 && (
          <div className="rounded-[12px] bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
            Faltan: {faltantes.join(", ")}
          </div>
        )}

        {ia.modoActivo === "completo" && faltantes.includes("pagador") && (
          <div className="rounded-[12px] border border-outline-variant/15 bg-surface-container-lowest p-2.5 space-y-2">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              ¿Quién pagó?
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => void enviarTextoDirecto("Pagó Franco")}
                className="h-9 rounded-[10px] bg-surface-container-low text-on-surface text-xs font-label font-bold uppercase"
              >
                Franco
              </button>
              <button
                type="button"
                onClick={() => void enviarTextoDirecto("Pagó Fabiola")}
                className="h-9 rounded-[10px] bg-surface-container-low text-on-surface text-xs font-label font-bold uppercase"
              >
                Fabiola
              </button>
              <button
                type="button"
                onClick={() => void enviarTextoDirecto("Fue compartido")}
                className="h-9 rounded-[10px] bg-surface-container-low text-on-surface text-xs font-label font-bold uppercase"
              >
                Compartido
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 rounded-[14px] border border-outline-variant/15 bg-surface-container-lowest p-3 space-y-2 overflow-y-auto">
          {ia.mensajes.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Escribí o hablá. Ejemplo: &quot;Compré en Coto por 44.300 una leche y 3 cafés&quot;.
            </p>
          ) : (
            ia.mensajes.map((m, idx) => (
              <div key={`${m.role}-${idx}`} className="space-y-0.5">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">{resumenMensaje(m.role)}</p>
                <p className="text-sm text-on-surface">{m.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 pt-1 border-t border-outline-variant/10">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Responder acá..."
            className="w-full min-h-20 max-h-28 rounded-[12px] bg-surface-container-low border border-outline-variant/15 px-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
          />

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={voice.state === "recording" ? voice.stop : voice.start}
              className="h-9 rounded-[10px] bg-surface-container-low text-on-surface font-label text-[11px] font-bold uppercase tracking-wider"
            >
              {voice.state === "recording" ? (
                <span className="inline-flex items-center gap-1"><MicOff className="h-4 w-4" /> Stop</span>
              ) : (
                <span className="inline-flex items-center gap-1"><Mic className="h-4 w-4" /> Voz</span>
              )}
            </button>
            <button
              type="button"
              onClick={usarTranscripcionEnInput}
              className="h-9 rounded-[10px] bg-surface-container-low text-on-surface font-label text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
              disabled={!voice.transcript && !voice.interimTranscript}
            >
              Usar voz
            </button>
            <button
              type="button"
              onClick={enviarTranscripcionDirecta}
              className="h-9 rounded-[10px] bg-surface-container-low text-on-surface font-label text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
              disabled={!voice.transcript && !voice.interimTranscript || ia.cargando}
            >
              Voz → Enviar
            </button>
          </div>

          {ia.modoActivo ? (
            <button
              type="button"
              onClick={enviarSegunModo}
              disabled={ia.cargando || !input.trim()}
              className="w-full h-11 rounded-[14px] bg-secondary text-on-secondary font-headline text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {ia.cargando ? "Procesando..." : "Enviar"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={enviarRapido}
                disabled={ia.cargando || !input.trim()}
                className="h-11 rounded-[14px] bg-secondary text-on-secondary font-headline text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                Registro rápido
              </button>
              <button
                type="button"
                onClick={enviarCompletoInicial}
                disabled={ia.cargando || !input.trim()}
                className="h-11 rounded-[14px] bg-primary text-on-primary font-headline text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                Registro completo
              </button>
            </div>
          )}
        </div>

        {ia.modoActivo === "rapido" && ia.faltanMontosEnRapido && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={ia.pasarRapidoACompleto}
              className="h-10 rounded-[12px] bg-surface-container-low text-on-surface font-label text-xs font-bold uppercase tracking-wider"
            >
              Detallar ahora
            </button>
            <button
              type="button"
              onClick={guardarBorradorIa}
              disabled={guardando || !puedeGuardarActual}
              className="h-10 rounded-[12px] bg-secondary text-on-secondary font-label text-xs font-bold uppercase tracking-wider disabled:opacity-40"
            >
              {guardando ? "Guardando..." : "Guardar rápido"}
            </button>
          </div>
        )}

        {puedeGuardarActual && !(ia.modoActivo === "rapido" && ia.faltanMontosEnRapido) && (
          <button
            type="button"
            onClick={guardarBorradorIa}
            disabled={guardando}
            className="w-full h-11 rounded-[14px] bg-secondary text-on-secondary font-headline text-sm font-bold disabled:opacity-40"
          >
            {guardando ? "Guardando..." : "Guardar borrador IA"}
          </button>
        )}

        {ia.modoActivo === "completo" && ia.resultado?.preguntaSiguiente && !ia.resultado.canSave && (
          <p className="text-xs text-on-surface-variant">{ia.resultado.preguntaSiguiente}</p>
        )}

        {(ia.resultado || ia.mensajes.length > 0) && (
          <button
            type="button"
            onClick={() => {
              ia.reset();
              setInput("");
              voice.reset();
            }}
            className="w-full h-9 rounded-[12px] bg-surface-container-low text-on-surface-variant font-label text-xs"
          >
            Reiniciar conversación
          </button>
        )}
      </div>
    </div>
  );
}
