import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ChatResponse, ChatDraftPatch } from "@/lib/ai/contracts-chat";
import { convertirChatDraftACompraEditable } from "@/lib/ai/contracts-chat";

// ─── Tipos públicos ────────────────────────────────────────────────
export interface MensajeChat {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  sourceUserText?: string;
  // Metadatos opcionales
  intent?: ChatResponse["intent"];
  toolResults?: ChatResponse["toolResults"];
  draftPatch?: ChatDraftPatch;
  warnings?: string[];
}

export interface BorradorGuardado {
  compraId: string;
  mensajeId: string;
  lugar: string;
  total: number | null;
  guardadoEn: number;
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
  guardando: boolean;
  error: string | null;
  draftActual: ChatDraftPatch | null;
  ultimoIntent: ChatResponse["intent"] | null;
  borradoresGuardados: BorradorGuardado[];
}

// ─── Hook ──────────────────────────────────────────────────────────
export function useChatGlobal() {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoChat>({
    abierto: false,
    mensajes: [],
    cargando: false,
    guardando: false,
    error: null,
    draftActual: null,
    ultimoIntent: null,
    borradoresGuardados: [],
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
      borradoresGuardados: [],
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
        sourceUserText: mensaje,
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

  const guardarBorrador = useCallback(async (
    draft: ChatDraftPatch,
    registradoPor: string,
    mensajeId: string,
    textoOriginal?: string,
    compraId?: string,
  ): Promise<string | null> => {
    setEstado((prev) => ({ ...prev, guardando: true, error: null }));

    try {
      const compraEditable = convertirChatDraftACompraEditable(draft, {
        registradoPor,
        textoOriginal,
        compraId,
      });

      const compraIdValido = compraEditable.id && !compraEditable.id.startsWith("tmp-")
        ? compraEditable.id
        : null;

      const payload = {
        p_compra_id: compraIdValido,
        p_fecha: compraEditable.fecha,
        p_nombre_lugar: compraEditable.nombre_lugar || null,
        p_notas: compraEditable.notas || null,
        p_registrado_por: compraEditable.registrado_por,
        p_hogar_id: compraEditable.hogar_id ?? null,
        p_pagador_general: compraEditable.pagador_general ?? "compartido",
        p_etiquetas_compra_ids: compraEditable.etiquetas_compra_ids ?? [],
        p_items: compraEditable.items.map((item) => ({
          categoria_id: item.categoria_id || null,
          subcategoria_id: item.subcategoria_id || null,
          descripcion: item.descripcion || null,
          expresion_monto: item.expresion_monto,
          monto_resuelto: item.monto_resuelto,
          tipo_reparto: item.tipo_reparto,
          pago_franco: item.pago_franco,
          pago_fabiola: item.pago_fabiola,
          etiquetas_ids: item.etiquetas_ids,
        })),
      };

      const { data, error } = await supabase.rpc("guardar_compra_borrador", payload);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["compras"] });

      const nuevoBorrador: BorradorGuardado = {
        compraId: data as string,
        mensajeId,
        lugar: draft.lugar ?? "Sin especificar",
        total: draft.total ?? null,
        guardadoEn: Date.now(),
      };

      setEstado((prev) => ({
        ...prev,
        guardando: false,
        borradoresGuardados: [...prev.borradoresGuardados, nuevoBorrador],
      }));

      return data as string;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "No se pudo guardar";
      setEstado((prev) => ({ ...prev, guardando: false, error: errorMsg }));
      return null;
    }
  }, [queryClient]);

  return {
    ...estado,
    toggle,
    abrir,
    cerrar,
    limpiar,
    enviar,
    guardarBorrador,
    sessionId: sessionIdRef.current,
  };
}
