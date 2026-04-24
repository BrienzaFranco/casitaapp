"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  X,
  Sparkles,
  Trash2,
  Mic,
  MicOff,
  Check,
  ExternalLink,
  RotateCcw,
  Copy,
  CheckCheck,
  BarChart3,
  Scale,
  Flame,
  Receipt,
  TrendingUp,
  FileClock,
  AlertCircle,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { useChatGlobal, type MensajeChat, type BorradorGuardado } from "@/hooks/useChatGlobal";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarUsuario } from "@/hooks/usarUsuario";
import { usarCompras } from "@/hooks/usarCompras";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { formatearPeso } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import type { ChatDraftPatch, ChatDraftItem, ToolResult } from "@/lib/ai/contracts-chat";
import type { PagadorCompra } from "@/types";

// ─── Chips de acciones rápidas ─────────────────────────────────────
const CHIPS_RAPIDOS = [
  { label: "¿Cuánto gastamos este mes?", icon: BarChart3 },
  { label: "¿Le debo algo a Fabiola?", icon: Scale },
  { label: "Top gastos del mes", icon: Flame },
  { label: "Últimas compras", icon: Receipt },
  { label: "¿Cómo van los presupuestos?", icon: TrendingUp },
  { label: "Ver borradores", icon: FileClock },
];

// ─── Sugerencias contextuales según la respuesta ───────────────────
function sugerenciasContextuales(msg: MensajeChat): Array<{ label: string; texto: string }> {
  const primerTool = msg.toolResults?.[0]?.tool;
  const intent = msg.intent;

  if (intent === "registro" || msg.draftPatch) {
    return [
      { label: "Ver borradores", texto: "/consulta Ver borradores" },
      { label: "Nueva compra", texto: "Quiero hacer una nueva compra" },
    ];
  }

  switch (primerTool) {
    case "gastos_por_categoria":
      return [
        { label: "Top gastos", texto: "Top gastos del mes" },
        { label: "Ver dashboard", texto: "¿Cómo van los presupuestos?" },
      ];
    case "balance_actual":
      return [
        { label: "Saldar deuda", texto: "Quiero saldar la deuda" },
        { label: "Historial", texto: "Últimas compras" },
      ];
    case "ultima_compra_item":
    case "buscar_compras":
      return [
        { label: "Buscar otra", texto: "Buscar compras" },
        { label: "Ver historial", texto: "Ver historial completo" },
      ];
    case "presupuesto_status":
      return [
        { label: "Gastos por categoría", texto: "¿Cuánto gastamos este mes?" },
        { label: "Ver dashboard", texto: "Ir al dashboard" },
      ];
    case "top_gastos":
      return [
        { label: "Presupuestos", texto: "¿Cómo van los presupuestos?" },
        { label: "Balance", texto: "¿Le debo algo a Fabiola?" },
      ];
    case "borradores_pendientes":
      return [
        { label: "Nuevo gasto", texto: "Quiero anotar un gasto" },
      ];
    default:
      return [];
  }
}

// ─── Helpers ───────────────────────────────────────────────────────
function tiempoRelativo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
  return `hace ${Math.floor(s / 86400)}d`;
}

// ─── Componente principal ──────────────────────────────────────────
export function ChatGlobal() {
  const chat = useChatGlobal();
  const categorias = usarCategorias();
  const usuario = usarUsuario();
  const compras = usarCompras({ cargarInicial: true });

  // Insight del día
  const hoy = fechaLocalISO();
  const comprasHoy = compras.compras.filter((c) => c.fecha === hoy && c.estado === "confirmada");
  const totalHoy = comprasHoy.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.monto_resuelto, 0), 0);
  const itemsHoy = comprasHoy.flatMap((c) => c.items);
  const insightHoy = totalHoy > 0
    ? `Hoy llevan ${formatearPeso(totalHoy)} en ${itemsHoy.length} item${itemsHoy.length !== 1 ? "s" : ""}`
    : null;
  const voice = useVoiceRecognition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoOpenedRef = useRef(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const swipeRef = useRef<{ startY: number; startTime: number } | null>(null);

  // Cerrar guarda la sesion actual si tiene mensajes
  const cerrarChat = useCallback(() => {
    if (chat.mensajes.length > 0) {
      chat.limpiar();
    }
    chat.cerrar();
    setFullscreen(false);
    setMostrarHistorial(false);
  }, [chat]);

  // Abrir automáticamente si viene ?chat=open
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (searchParams.get("chat") === "open") {
      autoOpenedRef.current = true;
      chat.abrir();
      const url = new URL(window.location.href);
      url.searchParams.delete("chat");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, chat]);

  // Auto-scroll al recibir mensajes
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat.mensajes, chat.cargando]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  // Voice recognition → input (reemplaza, no appendea)
  useEffect(() => {
    if (voice.state === "recording" || voice.state === "done") {
      const text = voice.transcript + (voice.interimTranscript ? ` ${voice.interimTranscript}` : "");
      setInput(text.trim());
    }
  }, [voice.transcript, voice.interimTranscript, voice.state]);

  async function handleEnviar(textoOverride?: string) {
    const texto = (textoOverride ?? input).trim();
    if (!texto || chat.cargando) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    await chat.enviar(texto, {
      categorias: categorias.categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
      subcategorias: categorias.subcategorias.map((s) => ({ id: s.id, categoria_id: s.categoria_id, nombre: s.nombre })),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  }

  const copiarTexto = useCallback((texto: string, id: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 1500);
    });
  }, []);

  return (
    <>
      {/* ─── Botón flotante ─────────────────────────────────── */}
      {!chat.abierto && (
        <button
          onClick={chat.toggle}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-secondary-container text-on-secondary shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 md:bottom-6"
          style={{ boxShadow: "var(--shadow-fab)" }}
          aria-label="Abrir chat IA"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* ─── Drawer del chat ────────────────────────────────── */}
      {chat.abierto && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-on-surface/20 backdrop-blur-[2px] transition-opacity"
            onClick={cerrarChat}
          />

          {/* Panel */}
          <div
            className={`relative z-10 flex flex-col rounded-t-2xl border-t border-outline-variant/15 bg-surface-container-lowest shadow-2xl animar-aparecer-abajo transition-all duration-300 ease-out ${fullscreen ? "h-dvh max-h-dvh rounded-t-none" : "max-h-[85vh]"}`}
            onTouchStart={(e) => {
              const t = e.touches[0];
              swipeRef.current = { startY: t.clientY, startTime: Date.now() };
            }}
            onTouchMove={(e) => {
              const ref = swipeRef.current;
              if (!ref) return;
              const t = e.touches[0];
              const dy = ref.startY - t.clientY;
              const dt = Date.now() - ref.startTime;
              // Swipe up > 60px en menos de 400ms
              if (dy > 60 && dt < 400) {
                setFullscreen(true);
                swipeRef.current = null;
              }
              // Swipe down > 60px en menos de 400ms
              if (dy < -60 && dt < 400) {
                setFullscreen(false);
                swipeRef.current = null;
              }
            }}
            onTouchEnd={() => { swipeRef.current = null; }}
          >
            {/* Handle + Header */}
            <div className="flex flex-col border-b border-outline-variant/10">
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-outline-variant/40" />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container">
                  <Sparkles className="h-4.5 w-4.5 text-on-secondary-container" />
                </div>
                <div>
                  <h2 className="font-headline text-sm font-semibold text-on-surface">Asistente IA</h2>
                  <p className="text-[11px] text-on-surface-variant/70">
                    {chat.cargando ? "Pensando..." : "Consultá o anotá gastos"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setMostrarHistorial((v) => !v)}
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container transition-colors"
                  title="Historial"
                >
                  <History className="h-4 w-4" />
                </button>
                {chat.mensajes.length > 0 && (
                  <button
                    onClick={chat.limpiar}
                    className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container transition-colors"
                    title="Limpiar chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
            onClick={cerrarChat}
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              </div>
            </div>

            {/* Panel de historial */}
            {mostrarHistorial && (
              <div className="border-b border-outline-variant/10 bg-surface-container-low/50 px-4 py-3 animar-aparecer">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-on-surface">Conversaciones</p>
                  <button
                    onClick={() => setMostrarHistorial(false)}
                    className="text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
                {chat.sesiones.length === 0 ? (
                  <p className="text-[11px] text-on-surface-variant/60">No hay conversaciones guardadas.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-hide">
                    {chat.sesiones.map((sesion) => (
                      <div key={sesion.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => { chat.cargarSesion(sesion); setMostrarHistorial(false); }}
                          className="flex-1 text-left px-2 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container-high transition-colors truncate"
                        >
                          {sesion.titulo}
                        </button>
                        <button
                          onClick={() => {
                            chat.eliminarSesion(sesion.id);
                            // Forzar re-render
                            setMostrarHistorial(false);
                            setTimeout(() => setMostrarHistorial(true), 0);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-on-surface-variant/40 hover:text-error transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mensajes */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-hide">
              {chat.mensajes.length === 0 && !chat.cargando && (
                <div className="space-y-5 pt-6">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
                      <Sparkles className="h-7 w-7 text-on-primary-container" />
                    </div>
                    <p className="font-headline text-base font-semibold text-on-surface">
                      {new Date().getHours() < 12 ? "¡Buen día!" : new Date().getHours() < 19 ? "¡Buenas tardes!" : "¡Buenas noches!"}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant/70">
                      {insightHoy ?? "Aún no hay gastos hoy. ¿Querés anotar algo?"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {CHIPS_RAPIDOS.map((chip) => {
                      const Icon = chip.icon;
                      return (
                        <button
                          key={chip.label}
                          onClick={() => {
                            if (chip.label === "Ver borradores") {
                              router.push("/borradores");
                              chat.cerrar();
                            } else {
                              handleEnviar(chip.label);
                            }
                          }}
                          className="rounded-full border border-outline-variant/20 bg-surface-container px-3 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high hover:border-outline-variant/40 flex items-center gap-1.5"
                        >
                          <Icon className="h-3.5 w-3.5 text-on-surface-variant" />
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {chat.mensajes.map((msg, idx) => (
                <BurbujaMensaje
                  key={msg.id}
                  mensaje={msg}
                  guardando={chat.guardando}
                  borradoresGuardados={chat.borradoresGuardados}
                  esUltimo={idx === chat.mensajes.length - 1}
                  copiadoId={copiadoId}
                  onCopiar={() => copiarTexto(msg.text, msg.id)}
                  onReintentar={msg.role === "user" ? undefined : () => {
                    const textoOrigen = msg.sourceUserText;
                    if (textoOrigen) handleEnviar(textoOrigen);
                  }}
                  onSugerencia={(sug) => {
                    if (sug.action === "consulta" || sug.action === "registro") {
                      // Reenviar el mensaje original con el intent forzado
                      chat.enviar(sug.payload ?? msg.sourceUserText ?? msg.text, {
                        forceIntent: sug.action,
                      });
                    }
                  }}
                  onGuardarBorrador={async (draft) => {
                    const compraId = await chat.guardarBorrador(
                      draft,
                      usuario.perfil?.nombre ?? "Usuario",
                      msg.id,
                      msg.sourceUserText ?? msg.text,
                    );
                    if (compraId) {
                      toast.success("Borrador guardado");
                    } else if (chat.error) {
                      toast.error(chat.error);
                    }
                  }}
                  onEnviarSugerencia={(t) => {
                    if (t === "Ver borradores") { router.push("/borradores"); chat.cerrar(); }
                    else if (t === "Ver historial") { router.push("/historial"); chat.cerrar(); }
                    else if (t === "Ir al dashboard") { router.push("/dashboard"); chat.cerrar(); }
                    else if (t === "Nueva compra") { router.push("/nueva-compra"); chat.cerrar(); }
                    else { handleEnviar(t); }
                  }}
                  onSetInput={setInput}
                />
              ))}

              {chat.cargando && (
                <div className="flex items-start gap-2.5 animar-aparecer">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container">
                    <Sparkles className="h-3.5 w-3.5 text-on-secondary-container" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-surface-container px-3.5 py-2.5">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/40 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/40 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/40 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-outline-variant/10 px-3 pb-3 pt-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
              <div className="flex items-end gap-2">
                <button
                  onClick={voice.state === "recording" ? voice.stop : voice.start}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                    voice.state === "recording"
                      ? "bg-error text-on-error animate-pulse"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                  title={voice.state === "recording" ? "Detener grabación" : "Grabar voz"}
                >
                  {voice.state === "recording" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Preguntá o anotá un gasto..."
                    rows={1}
                    className="w-full resize-none rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary/40 focus:outline-none focus:ring-1 focus:ring-secondary/20 transition-all"
                    style={{ maxHeight: "6rem" }}
                  />
                </div>

                <button
                  onClick={() => handleEnviar()}
                  disabled={!input.trim() || chat.cargando}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/90 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Burbuja de mensaje ────────────────────────────────────────────
interface BurbujaMensajeProps {
  mensaje: MensajeChat;
  guardando: boolean;
  borradoresGuardados: BorradorGuardado[];
  esUltimo: boolean;
  copiadoId: string | null;
  onCopiar: () => void;
  onReintentar?: () => void;
  onSugerencia?: (sug: { id: string; label: string; action: string; payload?: string }) => void;
  onGuardarBorrador: (draft: ChatDraftPatch) => void;
  onEnviarSugerencia?: (texto: string) => void;
  onSetInput?: (texto: string) => void;
}

const CONSULTAS_RAPIDAS = [
  { label: "¿Cuánto gastamos este mes?", texto: "¿Cuánto gastamos este mes?" },
  { label: "¿Le debo algo a Fabiola?", texto: "¿Le debo algo a Fabiola?" },
  { label: "Top gastos", texto: "Top gastos del mes" },
  { label: "Últimas compras", texto: "Últimas compras" },
  { label: "Presupuestos", texto: "¿Cómo van los presupuestos?" },
  { label: "Borradores", texto: "¿Qué borradores tengo?" },
];

const PLANTILLAS_REGISTRO = [
  { label: "Pago Franco, compartido", texto: "Pago Franco, es compartido: " },
  { label: "Pago Fabiola, compartido", texto: "Pago Fabiola, es compartido: " },
  { label: "Pago Franco, solo mío", texto: "Pago Franco, es solo para mí: " },
  { label: "Pago Fabiola, solo de ella", texto: "Pago Fabiola, es solo para ella: " },
];

function BurbujaMensaje({
  mensaje,
  guardando,
  borradoresGuardados,
  esUltimo,
  copiadoId,
  onCopiar,
  onReintentar,
  onSugerencia,
  onGuardarBorrador,
  onEnviarSugerencia,
  onSetInput,
}: BurbujaMensajeProps) {
  const esUsuario = mensaje.role === "user";
  const esError = mensaje.text.startsWith("Error:");
  const [clarifExpandida, setClarifExpandida] = useState<"consulta" | "registro" | null>(null);

  const borradorYaGuardado = mensaje.draftPatch
    ? borradoresGuardados.find((b) => b.mensajeId === mensaje.id)
    : undefined;

  return (
    <div className={`flex items-start gap-2.5 ${esUsuario ? "flex-row-reverse" : ""} animar-aparecer`}>
      {!esUsuario && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container mt-0.5">
          {esError ? (
            <AlertCircle className="h-3.5 w-3.5 text-error" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-on-secondary-container" />
          )}
        </div>
      )}

      <div className={`max-w-[85%] space-y-1.5 ${esUsuario ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`relative group rounded-2xl px-3.5 py-2.5 text-sm ${
            esUsuario
              ? "rounded-tr-md bg-secondary text-on-secondary"
              : esError
                ? "rounded-tl-md bg-error-container/40 text-on-error-container border border-error/10"
                : "rounded-tl-md bg-surface-container text-on-surface"
          }`}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{mensaje.text}</p>

          {/* Acciones hover */}
          <div className={`absolute ${esUsuario ? "left-0 -translate-x-full pl-1" : "right-0 translate-x-full pr-1"} top-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button
              onClick={onCopiar}
              className="p-1.5 rounded-md text-on-surface-variant/60 hover:bg-surface-container hover:text-on-surface transition-colors"
              title="Copiar"
            >
              {copiadoId === mensaje.id ? <CheckCheck className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Timestamp + reintentar */}
        <div className={`flex items-center gap-2 ${esUsuario ? "justify-end" : ""}`}>
          <span className="text-[10px] text-on-surface-variant/40">{tiempoRelativo(mensaje.timestamp)}</span>
          {!esUsuario && esError && onReintentar && (
            <button
              onClick={onReintentar}
              className="text-[10px] text-secondary font-medium flex items-center gap-0.5 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Reintentar
            </button>
          )}
        </div>

        {/* Draft preview si hay */}
        {mensaje.draftPatch && (
          <DraftPreview
            draft={mensaje.draftPatch}
            guardando={guardando}
            yaGuardado={borradorYaGuardado}
            onGuardar={(d) => onGuardarBorrador(d)}
          />
        )}

        {/* Tool results si hay */}
        {mensaje.toolResults && mensaje.toolResults.length > 0 && (
          <ResultadosTools results={mensaje.toolResults} />
        )}

        {/* Warnings */}
        {mensaje.warnings && mensaje.warnings.length > 0 && (
          <div className="rounded-lg bg-error-container/30 px-2.5 py-1.5 space-y-0.5">
            {mensaje.warnings.map((w, i) => (
              <p key={i} className="text-xs text-on-error-container flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}

        {/* Sugerencias de clarificacion */}
        {mensaje.sugerencias && mensaje.sugerencias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {mensaje.sugerencias.map((sug) => (
              <button
                key={sug.id}
                onClick={() => {
                  if (sug.action === "consulta") {
                    setClarifExpandida("consulta");
                  } else if (sug.action === "registro") {
                    setClarifExpandida("registro");
                  } else {
                    onSugerencia?.(sug);
                  }
                }}
                className="rounded-full border border-secondary/30 bg-secondary-container/30 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary-container/50 transition-colors"
              >
                {sug.label}
              </button>
            ))}
          </div>
        )}

        {/* Opciones expandidas de clarificacion */}
        {clarifExpandida === "consulta" && (
          <div className="rounded-xl border border-secondary/15 bg-secondary-container/10 p-2.5 space-y-2 animar-aparecer">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60">¿Qué querés consultar?</p>
            <div className="flex flex-wrap gap-1.5">
              {CONSULTAS_RAPIDAS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => onSugerencia?.({ id: q.label, label: q.label, action: "consulta", payload: q.texto })}
                  className="rounded-full border border-outline-variant/20 bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setClarifExpandida(null)}
              className="text-[10px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {clarifExpandida === "registro" && (
          <div className="rounded-xl border border-secondary/15 bg-secondary-container/10 p-2.5 space-y-2 animar-aparecer">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60">¿Quién pagó y cómo se divide?</p>
            <div className="flex flex-wrap gap-1.5">
              {PLANTILLAS_REGISTRO.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    onSetInput?.(p.texto);
                    setClarifExpandida(null);
                  }}
                  className="rounded-full border border-outline-variant/20 bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setClarifExpandida(null)}
              className="text-[10px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Sugerencias contextuales de seguimiento */}
        {!esUsuario && esUltimo && onEnviarSugerencia && (
          <SugerenciasSeguimiento mensaje={mensaje} onEnviar={onEnviarSugerencia} />
        )}
      </div>
    </div>
  );
}

// ─── Sugerencias contextuales de seguimiento ───────────────────────
function SugerenciasSeguimiento({
  mensaje,
  onEnviar,
}: {
  mensaje: MensajeChat;
  onEnviar: (texto: string) => void;
}) {
  const sugerencias = sugerenciasContextuales(mensaje);
  if (sugerencias.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 animar-aparecer">
      {sugerencias.map((sug) => (
        <button
          key={sug.label}
          onClick={() => onEnviar(sug.texto)}
          className="rounded-full border border-secondary/25 bg-secondary-container/25 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary-container/45 transition-colors"
        >
          {sug.label}
        </button>
      ))}
    </div>
  );
}

// ─── Preview de draft ──────────────────────────────────────────────
interface DraftPreviewProps {
  draft: ChatDraftPatch;
  guardando: boolean;
  yaGuardado?: { compraId: string; guardadoEn: number };
  onGuardar: (draft: ChatDraftPatch) => void;
}

function DraftPreview({ draft, guardando, yaGuardado, onGuardar }: DraftPreviewProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editado, setEditado] = useState<ChatDraftPatch>(() => JSON.parse(JSON.stringify(draft)));

  useEffect(() => {
    setEditado(JSON.parse(JSON.stringify(draft)));
    setModoEdicion(false);
  }, [draft]);

  // Validar campos obligatorios en tiempo real
  const faltantes: string[] = [];
  const tieneMonto = (editado.total != null && editado.total > 0) || (editado.items?.some((it) => (it.monto ?? 0) > 0));
  if (!tieneMonto) faltantes.push("cuánto salió");
  if (!editado.pagador) faltantes.push("quién pagó");
  const puedeGuardar = faltantes.length === 0 && !guardando;

  if (!editado.items?.length && !editado.lugar && !editado.total) return null;

  function actualizarItem(index: number, cambios: Partial<ChatDraftItem>) {
    setEditado((prev) => {
      const items = [...(prev.items ?? [])];
      items[index] = { ...items[index], ...cambios };
      const total = items.reduce((sum, it) => sum + (it.monto ?? 0), 0);
      return { ...prev, items, total };
    });
  }

  function eliminarItem(index: number) {
    setEditado((prev) => {
      const items = (prev.items ?? []).filter((_, i) => i !== index);
      const total = items.reduce((sum, it) => sum + (it.monto ?? 0), 0);
      return { ...prev, items: items.length ? items : prev.items, total };
    });
  }

  const inputClase = "w-full bg-surface-container-low rounded-lg px-2.5 py-1.5 text-xs text-on-surface outline-none border border-outline-variant/15 focus:border-secondary/40 transition-colors";
  const inputNumClase = "w-20 bg-surface-container-low rounded-lg px-2 py-1.5 text-xs text-on-surface tabular-nums outline-none border border-outline-variant/15 focus:border-secondary/40 transition-colors";

  return (
    <div className="w-full rounded-xl border border-secondary/20 bg-secondary-container/10 p-3 text-xs animar-aparecer">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-secondary font-semibold">
          <FileClock className="h-3.5 w-3.5" />
          <span>Borrador</span>
        </div>
        {yaGuardado ? (
          <span className="flex items-center gap-1 text-tertiary font-medium">
            <Check className="h-3 w-3" />
            Guardado
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            {!modoEdicion && (
              <button
                onClick={() => setModoEdicion(true)}
                className="rounded-lg bg-surface-container-high px-2 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-highest"
              >
                Editar
              </button>
            )}
            <button
              onClick={() => { onGuardar(editado); setModoEdicion(false); }}
              disabled={!puedeGuardar}
              className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-on-secondary transition-all disabled:opacity-50 hover:bg-secondary/90 active:scale-95"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>

      {!yaGuardado && faltantes.length > 0 && (
        <div className="mb-2 flex items-center gap-1 text-[11px] text-error font-medium">
          <AlertCircle className="h-3 w-3" />
          Falta saber: {faltantes.join(" y ")}
        </div>
      )}

      {modoEdicion ? (
        <div className="space-y-2.5">
          {/* Lugar */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant/60">Lugar</label>
            <input
              className={inputClase}
              value={editado.lugar ?? ""}
              onChange={(e) => setEditado((p) => ({ ...p, lugar: e.target.value }))}
              placeholder="Lugar..."
            />
          </div>

          {/* Pagador */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant/60">Pagó</label>
            <select
              className={inputClase}
              value={editado.pagador ?? ""}
              onChange={(e) => setEditado((p) => ({ ...p, pagador: e.target.value as PagadorCompra || null }))}
            >
              <option value="">Seleccionar...</option>
              <option value="compartido">Compartido</option>
              <option value="franco">Franco</option>
              <option value="fabiola">Fabiola</option>
            </select>
          </div>

          {/* Items editables */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant/60">Items</label>
            {editado.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${inputClase} flex-1`}
                  value={item.descripcion}
                  onChange={(e) => actualizarItem(i, { descripcion: e.target.value })}
                  placeholder="Descripcion..."
                />
                <input
                  type="number"
                  className={inputNumClase}
                  value={item.monto ?? ""}
                  onChange={(e) => actualizarItem(i, { monto: Number(e.target.value) })}
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => eliminarItem(i)}
                  className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/40 hover:text-error hover:bg-error-container/30 transition-colors"
                  title="Eliminar item"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="font-mono font-semibold text-on-surface">{formatearPeso(editado.total ?? 0)}</p>
            <button
              onClick={() => { setEditado(JSON.parse(JSON.stringify(draft))); setModoEdicion(false); }}
              className="text-[11px] text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancelar edicion
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {editado.lugar && (
            <p className="text-on-surface"><span className="text-on-surface-variant">Lugar:</span> {editado.lugar}</p>
          )}
          {editado.total != null && (
            <p className="font-mono font-semibold text-on-surface">{formatearPeso(editado.total)}</p>
          )}
          {editado.pagador && (
            <p className="text-on-surface"><span className="text-on-surface-variant">Pagó:</span> {editado.pagador}</p>
          )}
          {editado.reparto && (
            <p className="text-on-surface"><span className="text-on-surface-variant">Reparto:</span> {editado.reparto}</p>
          )}
          {editado.items && editado.items.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {editado.items.map((item, i) => (
                <div key={i} className="flex justify-between text-on-surface">
                  <span className="truncate mr-2">{item.descripcion}</span>
                  {item.monto != null && <span className="font-mono shrink-0">{formatearPeso(item.monto)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {yaGuardado && (
        <a
          href="/borradores"
          className="mt-2 flex items-center gap-1 text-secondary text-[11px] font-medium hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Ver en borradores
        </a>
      )}
    </div>
  );
}

// ─── Resultados de tools ───────────────────────────────────────────
function ResultadosTools({ results }: { results: ToolResult[] }) {
  return (
    <div className="w-full space-y-2">
      {results.map((r, i) => (
        <ResultadoTool key={i} result={r} />
      ))}
    </div>
  );
}

function ResultadoTool({ result }: { result: ToolResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-lg bg-error-container/20 px-2.5 py-1.5 text-xs text-on-error-container flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Error: {result.error}
      </div>
    );
  }

  const d = result.data as Record<string, unknown>;

  switch (result.tool) {
    case "balance_actual":
      return <CardBalance data={d} />;
    case "gastos_por_categoria":
      return <CardGastosCategoria data={d} />;
    case "top_gastos":
      return <CardTopGastos data={d} />;
    case "compras_recientes":
      return <CardComprasRecientes data={d} />;
    case "presupuesto_status":
      return <CardPresupuesto data={d} />;
    case "ultima_compra_item":
      return <CardUltimaCompra data={d} />;
    case "buscar_compras":
      return <CardBuscarCompras data={d} />;
    case "gastos_por_mes":
      return <CardGastosPorMes data={d} />;
    case "items_frecuentes":
      return <CardItemsFrecuentes data={d} />;
    case "borradores_pendientes":
      return <CardBorradoresPendientes data={d} />;
    default:
      return (
        <pre className="rounded-lg bg-surface-container p-2 text-xs text-on-surface-variant overflow-x-auto">
          {JSON.stringify(d, null, 2)}
        </pre>
      );
  }
}

// ─── Cards de resultados ───────────────────────────────────────────

function ExplorarLink({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="mt-2 flex items-center gap-1 text-secondary text-[11px] font-medium hover:underline"
    >
      <ExternalLink className="h-3 w-3" />
      {label ?? "Explorar en dashboard"}
    </a>
  );
}

function CardBalance({ data }: { data: Record<string, unknown> }) {
  const deudor = data.deudor as string | null;
  const monto = data.montoAdeudado as number;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Scale className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Balance</span>
      </div>
      {deudor ? (
        <div>
          <p className="text-sm font-semibold text-secondary">
            {deudor} le debe {formatearPeso(monto)}
          </p>
          <p className="text-on-surface-variant mt-0.5">
            a {deudor === "Franco" ? "Fabiola" : "Franco"}
          </p>
        </div>
      ) : (
        <p className="text-sm font-semibold text-tertiary flex items-center gap-1">
          <Check className="h-4 w-4" /> Están en cero
        </p>
      )}
      <div className="mt-2 flex justify-between text-on-surface-variant">
        <span>Franco pagó: {formatearPeso(data.francoPago as number)}</span>
        <span>Fabiola pagó: {formatearPeso(data.fabiolaPago as number)}</span>
      </div>
      <ExplorarLink href="/dashboard" />
    </div>
  );
}

function CardGastosCategoria({ data }: { data: Record<string, unknown> }) {
  const cats = data.categorias as Array<{ nombre: string; total: number; porcentaje: string }>;
  const total = data.total as number;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-on-surface-variant" />
          <span className="font-semibold text-on-surface">Gastos del mes</span>
        </div>
        <span className="font-mono font-semibold text-sm text-on-surface">{formatearPeso(total)}</span>
      </div>
      <div className="space-y-1.5">
        {cats.slice(0, 6).map((c) => (
          <div key={c.nombre}>
            <div className="flex justify-between text-on-surface">
              <span>{c.nombre}</span>
              <span className="font-mono">{formatearPeso(c.total)}</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${Math.min(Number(c.porcentaje), 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <ExplorarLink href="/dashboard" />
    </div>
  );
}

function CardTopGastos({ data }: { data: Record<string, unknown> }) {
  const gastos = data.topGastos as Array<{ lugar: string; total: number; fecha: string; pagador: string }>;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-2">
        <Flame className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Top gastos</span>
      </div>
      <div className="space-y-1">
        {gastos?.map((g, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[10px] font-bold text-on-secondary-container">
                {i + 1}
              </span>
              <span className="truncate text-on-surface">{g.lugar}</span>
            </div>
            <span className="font-mono font-semibold text-on-surface shrink-0 ml-2">{formatearPeso(g.total)}</span>
          </div>
        ))}
      </div>
      <ExplorarLink href="/dashboard" />
    </div>
  );
}

function CardComprasRecientes({ data }: { data: Record<string, unknown> }) {
  const compras = data.compras as Array<{ fecha: string; lugar: string | null; total: number; estado: string; categorias: string[] }>;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-2">
        <Receipt className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Últimas compras</span>
      </div>
      <div className="space-y-1.5">
        {compras?.map((c, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <p className="text-on-surface font-medium truncate">{c.lugar ?? "Sin lugar"}</p>
              <p className="text-on-surface-variant">{c.fecha}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-semibold text-on-surface">{formatearPeso(c.total)}</p>
              {c.estado === "borrador" && (
                <span className="text-[10px] text-secondary font-medium">borrador</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <ExplorarLink href="/historial" label="Ver historial completo" />
    </div>
  );
}

function CardPresupuesto({ data }: { data: Record<string, unknown> }) {
  const presus = data.presupuestos as Array<{ nombre: string; gastado: number; limite: number; porcentaje: string; excedido: boolean }>;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Presupuestos</span>
      </div>
      <div className="space-y-2">
        {presus?.slice(0, 5).map((p) => (
          <div key={p.nombre}>
            <div className="flex justify-between mb-0.5">
              <span className="text-on-surface">{p.nombre}</span>
              <span className={`font-mono ${p.excedido ? "text-error font-semibold" : "text-on-surface-variant"}`}>
                {p.porcentaje}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${p.excedido ? "bg-error" : Number(p.porcentaje) > 80 ? "bg-secondary" : "bg-tertiary"}`}
                style={{ width: `${Math.min(Number(p.porcentaje), 100)}%` }}
              />
            </div>
            <p className="text-on-surface-variant mt-0.5">
              {formatearPeso(p.gastado)} / {formatearPeso(p.limite)}
            </p>
          </div>
        ))}
      </div>
      <ExplorarLink href="/dashboard" />
    </div>
  );
}

function CardUltimaCompra({ data }: { data: Record<string, unknown> }) {
  const ultima = data.ultima_compra as null | {
    fecha: string;
    lugar: string | null;
    descripcion: string;
    monto_item: number;
    total_compra: number;
  };
  const texto = String(data.texto ?? "");

  if (!ultima) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs text-on-surface-variant animar-aparecer">
        No encontré compras recientes de {texto}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-2">
        <Receipt className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Última compra</span>
      </div>
      <p className="text-on-surface font-medium">{ultima.descripcion}</p>
      <p className="text-on-surface-variant mt-0.5">{ultima.fecha} · {ultima.lugar ?? "Sin lugar"}</p>
      <div className="mt-2 flex justify-between text-on-surface">
        <span>Item</span>
        <span className="font-mono font-semibold">{formatearPeso(ultima.monto_item)}</span>
      </div>
      <div className="mt-1 flex justify-between text-on-surface-variant">
        <span>Total compra</span>
        <span className="font-mono">{formatearPeso(ultima.total_compra)}</span>
      </div>
      <ExplorarLink href="/historial" label="Ver historial" />
    </div>
  );
}

function CardBuscarCompras({ data }: { data: Record<string, unknown> }) {
  const compras = data.compras as Array<{ fecha: string; lugar: string | null; total: number; coincidencia: string }>;
  const cantidad = data.cantidad as number;

  if (!compras || compras.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs text-on-surface-variant animar-aparecer">
        No encontré compras para esa búsqueda.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Receipt className="h-4 w-4 text-on-surface-variant" />
          <span className="font-semibold text-on-surface">Búsqueda</span>
        </div>
        <span className="text-on-surface-variant">{cantidad} resultado(s)</span>
      </div>
      <div className="space-y-1.5">
        {compras.map((c, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <p className="text-on-surface font-medium truncate">{c.lugar ?? "Sin lugar"}</p>
              <p className="text-on-surface-variant">{c.fecha}</p>
            </div>
            <span className="font-mono font-semibold text-on-surface shrink-0">{formatearPeso(c.total)}</span>
          </div>
        ))}
      </div>
      <ExplorarLink href="/historial" label="Ver en historial" />
    </div>
  );
}

function CardGastosPorMes({ data }: { data: Record<string, unknown> }) {
  const meses = data.meses as Array<{ mes: string; total: number }>;

  if (!meses || meses.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs text-on-surface-variant animar-aparecer">
        Sin datos para mostrar.
      </div>
    );
  }

  const maximo = Math.max(...meses.map((m) => m.total));

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart3 className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Evolución mensual</span>
      </div>
      <div className="space-y-1.5">
        {meses.map((m) => (
          <div key={m.mes}>
            <div className="flex justify-between mb-0.5">
              <span className="text-on-surface-variant">{m.mes}</span>
              <span className="font-mono font-semibold text-on-surface">{formatearPeso(m.total)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${maximo > 0 ? (m.total / maximo) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <ExplorarLink href="/dashboard/explorar?ejeX=mes&ejeY=monto" />
    </div>
  );
}

function CardItemsFrecuentes({ data }: { data: Record<string, unknown> }) {
  const items = data.items as Array<{ descripcion: string; veces_comprado: number; ultimo_monto: number; ultima_fecha: string; categoria: string }>;

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs text-on-surface-variant animar-aparecer">
        Sin datos de items frecuentes.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-2">
        <Receipt className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Items más comprados</span>
      </div>
      <div className="space-y-1.5">
        {items.slice(0, 8).map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <p className="text-on-surface font-medium truncate capitalize">{item.descripcion}</p>
              <p className="text-on-surface-variant">{item.veces_comprado} compra(s) · {item.categoria}</p>
            </div>
            <span className="font-mono font-semibold text-on-surface shrink-0">{formatearPeso(item.ultimo_monto)}</span>
          </div>
        ))}
      </div>
      <ExplorarLink href="/dashboard/explorar?ejeX=categoria&ejeY=cantidad" />
    </div>
  );
}

function CardBorradoresPendientes({ data }: { data: Record<string, unknown> }) {
  const borradores = data.borradores as Array<{ id: string; fecha: string; lugar: string; total: number; pagador: string }>;

  if (!borradores || borradores.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs text-on-surface-variant animar-aparecer">
        No hay borradores pendientes.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs animar-aparecer">
      <div className="flex items-center gap-1.5 mb-2">
        <FileClock className="h-4 w-4 text-on-surface-variant" />
        <span className="font-semibold text-on-surface">Borradores pendientes</span>
      </div>
      <div className="space-y-1.5">
        {borradores.map((b) => (
          <div key={b.id} className="flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <p className="text-on-surface font-medium truncate">{b.lugar}</p>
              <p className="text-on-surface-variant">{b.fecha} · {b.pagador}</p>
            </div>
            <span className="font-mono font-semibold text-on-surface shrink-0">{formatearPeso(b.total)}</span>
          </div>
        ))}
      </div>
      <ExplorarLink href="/borradores" label="Ver todos los borradores" />
    </div>
  );
}
