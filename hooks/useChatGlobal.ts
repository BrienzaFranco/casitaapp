import { useCallback, useRef, useState } from "react";
import type { ChatResponse, ChatDraftPatch } from "@/lib/ai/contracts-chat";

// ─── Tipos públicos ────────────────────────────────────────────────
export interface MensajeChat {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  // Metadatos opcionales
  intent?: ChatResponse["intent"];
  toolResults?: ChatResponse["toolResults"];
  draftPatch?: ChatDraftPatch;
  warnings?: string[];
}

interface OpcionesEnviar {
  categorias?: Array<{ id: string; nombre: string }>;
  subcategorias?: Array<{ id: string; categoria_id: string; nombre: string }>;
  draft?: unknown;
}

interface EstadoChat {
  abierto: boolean;
  mensajes: MensajeChat[];
  cargando: boolean;
  error: string | null;
  draftActual: ChatDraftPatch | null;
  ultimoIntent: ChatResponse["intent"] | null;
}

// ─── Hook ──────────────────────────────────────────────────────────
export function useChatGlobal() {
  const [estado, setEstado] = useState<EstadoChat>({
    abierto: false,
    mensajes: [],
    cargando: false,
    error: null,
    draftActual: null,
    ultimoIntent: null,
  });

  const sessionIdRef = useRef(`chat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);

  const toggle = useCallback(() => {
    setEstado((prev) => ({ ...prev, abierto: !prev.abierto }));
  }, []);

  const abrir = useCallback(() => {
    setEstado((prev) => ({ ...prev, abierto: true }));
  }, []);

  const cerrar = useCallback(() => {
    setEstado((prev) => ({ ...prev, abierto: false }));
  }, []);

  const limpiar = useCallback(() => {
    sessionIdRef.current = `chat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setEstado((prev) => ({
      ...prev,
      mensajes: [],
      error: null,
      draftActual: null,
      ultimoIntent: null,
    }));
  }, []);

  const enviar = useCallback(async (texto: string, opciones?: OpcionesEnviar) => {
    const mensaje = texto.trim();
    if (!mensaje) return;

    const msgId = `user-${Date.now()}`;
    const nuevoMensaje: MensajeChat = {
      id: msgId,
      role: "user",
      text: mensaje,
      timestamp: Date.now(),
    };

    setEstado((prev) => ({
      ...prev,
      mensajes: [...prev.mensajes, nuevoMensaje],
      cargando: true,
      error: null,
    }));

    try {
      // Construir historial para el endpoint
      const history = estado.mensajes
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: mensaje,
          sessionId: sessionIdRef.current,
          history,
          draft: opciones?.draft,
          context: {
            categorias: opciones?.categorias,
            subcategorias: opciones?.subcategorias,
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(errBody?.error ?? `Error ${res.status}`);
      }

      const data = await res.json() as ChatResponse;

      const respuestaMsg: MensajeChat = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data.answer || "Sin respuesta",
        timestamp: Date.now(),
        intent: data.intent,
        toolResults: data.toolResults,
        draftPatch: data.draftPatch,
        warnings: data.warnings,
      };

      setEstado((prev) => ({
        ...prev,
        mensajes: [...prev.mensajes, respuestaMsg],
        cargando: false,
        draftActual: data.draftPatch ?? prev.draftActual,
        ultimoIntent: data.intent,
      }));

      return data;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Error desconocido";
      setEstado((prev) => ({
        ...prev,
        cargando: false,
        error: errorMsg,
        mensajes: [
          ...prev.mensajes,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            text: `Error: ${errorMsg}`,
            timestamp: Date.now(),
          },
        ],
      }));
      return null;
    }
  }, [estado.mensajes]);

  return {
    ...estado,
    toggle,
    abrir,
    cerrar,
    limpiar,
    enviar,
    sessionId: sessionIdRef.current,
  };
}
