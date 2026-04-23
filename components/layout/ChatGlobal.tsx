"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, X, Sparkles, Trash2, Mic, MicOff } from "lucide-react";
import { useChatGlobal, type MensajeChat } from "@/hooks/useChatGlobal";
import { usarCategorias } from "@/hooks/usarCategorias";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { formatearPeso } from "@/lib/formatear";
import type { ChatDraftPatch, ToolResult } from "@/lib/ai/contracts-chat";

// ─── Chips de acciones rápidas ─────────────────────────────────────
const CHIPS_RAPIDOS = [
  { label: "¿Cuánto gastamos este mes?", icon: "📊" },
  { label: "¿Le debo algo a Fabiola?", icon: "⚖️" },
  { label: "Top gastos del mes", icon: "🔥" },
  { label: "Últimas compras", icon: "🧾" },
  { label: "¿Cómo van los presupuestos?", icon: "📈" },
];

// ─── Componente principal ──────────────────────────────────────────
export function ChatGlobal() {
  const chat = useChatGlobal();
  const categorias = usarCategorias();
  const voice = useVoiceRecognition();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoOpenedRef = useRef(false);

  // Abrir automáticamente si viene ?chat=open
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (searchParams.get("chat") === "open") {
      autoOpenedRef.current = true;
      chat.abrir();
      // Limpiar el parámetro de la URL sin recargar
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

  async function handleEnviar(textoOverride?: string) {
    const texto = (textoOverride ?? input).trim();
    if (!texto || chat.cargando) return;
    setInput("");
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
            className="absolute inset-0 bg-on-surface/30 backdrop-blur-[2px]"
            onClick={chat.cerrar}
          />

          {/* Panel */}
          <div className="relative z-10 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-outline-variant/15 bg-surface-container-lowest shadow-xl animar-aparecer-abajo">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container">
                  <Sparkles className="h-4 w-4 text-on-secondary-container" />
                </div>
                <div>
                  <h2 className="font-headline text-sm font-semibold text-on-surface">Asistente IA</h2>
                  <p className="text-xs text-on-surface-variant">Consultá o anotá gastos</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {chat.mensajes.length > 0 && (
                  <button
                    onClick={chat.limpiar}
                    className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
                    title="Limpiar chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={chat.cerrar}
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
              {chat.mensajes.length === 0 && !chat.cargando && (
                <div className="space-y-4 pt-4">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
                      <Sparkles className="h-6 w-6 text-on-primary-container" />
                    </div>
                    <p className="font-headline text-sm font-semibold text-on-surface">¿En qué te ayudo?</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Preguntá sobre tus gastos o anotá uno nuevo
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {CHIPS_RAPIDOS.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => handleEnviar(chip.label)}
                        className="rounded-full border border-outline-variant/20 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                      >
                        <span className="mr-1">{chip.icon}</span>
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chat.mensajes.map((msg) => (
                <BurbujaMensaje key={msg.id} mensaje={msg} />
              ))}

              {chat.cargando && (
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container">
                    <Sparkles className="h-3.5 w-3.5 text-on-secondary-container" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-surface-container px-3 py-2">
                    <div className="flex gap-1">
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
                    className="w-full resize-none rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary/40 focus:outline-none focus:ring-1 focus:ring-secondary/20"
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
function BurbujaMensaje({ mensaje }: { mensaje: MensajeChat }) {
  const esUsuario = mensaje.role === "user";

  return (
    <div className={`flex items-start gap-2 ${esUsuario ? "flex-row-reverse" : ""}`}>
      {!esUsuario && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container">
          <Sparkles className="h-3.5 w-3.5 text-on-secondary-container" />
        </div>
      )}

      <div className={`max-w-[85%] space-y-1.5 ${esUsuario ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            esUsuario
              ? "rounded-tr-md bg-secondary text-on-secondary"
              : "rounded-tl-md bg-surface-container text-on-surface"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{mensaje.text}</p>
        </div>

        {/* Draft preview si hay */}
        {mensaje.draftPatch && <DraftPreview draft={mensaje.draftPatch} />}

        {/* Tool results si hay */}
        {mensaje.toolResults && mensaje.toolResults.length > 0 && (
          <ResultadosTools results={mensaje.toolResults} />
        )}

        {/* Warnings */}
        {mensaje.warnings && mensaje.warnings.length > 0 && (
          <div className="rounded-lg bg-error-container/30 px-2 py-1">
            {mensaje.warnings.map((w, i) => (
              <p key={i} className="text-xs text-on-error-container">⚠ {w}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preview de draft ──────────────────────────────────────────────
function DraftPreview({ draft }: { draft: ChatDraftPatch }) {
  if (!draft.items?.length && !draft.lugar && !draft.total) return null;

  return (
    <div className="w-full rounded-xl border border-secondary/20 bg-secondary-container/10 p-2.5 text-xs">
      <div className="mb-1.5 flex items-center gap-1.5 text-secondary font-semibold">
        <span>📝</span>
        <span>Borrador</span>
      </div>
      {draft.lugar && (
        <p className="text-on-surface"><span className="text-on-surface-variant">Lugar:</span> {draft.lugar}</p>
      )}
      {draft.total != null && (
        <p className="font-mono font-semibold text-on-surface">{formatearPeso(draft.total)}</p>
      )}
      {draft.pagador && (
        <p className="text-on-surface"><span className="text-on-surface-variant">Pagó:</span> {draft.pagador}</p>
      )}
      {draft.reparto && (
        <p className="text-on-surface"><span className="text-on-surface-variant">Reparto:</span> {draft.reparto}</p>
      )}
      {draft.items && draft.items.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {draft.items.map((item, i) => (
            <div key={i} className="flex justify-between text-on-surface">
              <span className="truncate mr-2">{item.descripcion}</span>
              {item.monto != null && <span className="font-mono shrink-0">{formatearPeso(item.monto)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Resultados de tools ───────────────────────────────────────────
function ResultadosTools({ results }: { results: ToolResult[] }) {
  return (
    <div className="w-full space-y-1.5">
      {results.map((r, i) => (
        <ResultadoTool key={i} result={r} />
      ))}
    </div>
  );
}

function ResultadoTool({ result }: { result: ToolResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-lg bg-error-container/20 px-2 py-1.5 text-xs text-on-error-container">
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
    case "buscar_compras":
      return <CardBuscarCompras data={d} />;
    case "gastos_por_mes":
      return <CardGastosPorMes data={d} />;
    default:
      return (
        <pre className="rounded-lg bg-surface-container p-2 text-xs text-on-surface-variant overflow-x-auto">
          {JSON.stringify(d, null, 2)}
        </pre>
      );
  }
}

// ─── Cards de resultados ───────────────────────────────────────────

function CardBalance({ data }: { data: Record<string, unknown> }) {
  const deudor = data.deudor as string | null;
  const monto = data.montoAdeudado as number;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span>⚖️</span>
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
        <p className="text-sm font-semibold text-tertiary">Están en cero</p>
      )}
      <div className="mt-2 flex justify-between text-on-surface-variant">
        <span>Franco pagó: {formatearPeso(data.francoPago as number)}</span>
        <span>Fabiola pagó: {formatearPeso(data.fabiolaPago as number)}</span>
      </div>
    </div>
  );
}

function CardGastosCategoria({ data }: { data: Record<string, unknown> }) {
  const cats = data.categorias as Array<{ nombre: string; total: number; porcentaje: string }>;
  const total = data.total as number;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span>📊</span>
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
    </div>
  );
}

function CardTopGastos({ data }: { data: Record<string, unknown> }) {
  const gastos = data.topGastos as Array<{ lugar: string; total: number; fecha: string; pagador: string }>;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span>🔥</span>
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
    </div>
  );
}

function CardComprasRecientes({ data }: { data: Record<string, unknown> }) {
  const compras = data.compras as Array<{ fecha: string; lugar: string | null; total: number; estado: string; categorias: string[] }>;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span>🧾</span>
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
    </div>
  );
}

function CardPresupuesto({ data }: { data: Record<string, unknown> }) {
  const presus = data.presupuestos as Array<{ nombre: string; gastado: number; limite: number; porcentaje: string; excedido: boolean }>;

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span>📈</span>
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
    </div>
  );
}

function CardBuscarCompras({ data }: { data: Record<string, unknown> }) {
  const compras = data.compras as Array<{ fecha: string; lugar: string | null; total: number; coincidencia: string }>;
  const cantidad = data.cantidad as number;

  if (!compras || compras.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs text-on-surface-variant">
        No encontré compras para esa búsqueda.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span>🔍</span>
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
    </div>
  );
}

function CardGastosPorMes({ data }: { data: Record<string, unknown> }) {
  const meses = data.meses as Array<{ mes: string; total: number }>;

  if (!meses || meses.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs text-on-surface-variant">
        Sin datos para mostrar.
      </div>
    );
  }

  const maximo = Math.max(...meses.map((m) => m.total));

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3 text-xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span>📅</span>
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
    </div>
  );
}
