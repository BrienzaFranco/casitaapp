import { useCallback, useRef, useState, useEffect } from "react";
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
  sugerencias?: ChatResponse["sugerencias"];
  camposFaltantes?: string[];
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
  forceIntent?: ChatResponse["intent"];
}

export interface ChatSession {
  id: string;
  titulo: string;
  fecha: number;
  mensajes: MensajeChat[];
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

const STORAGE_KEY = "casita_chat_v1";
const SESSIONS_KEY = "casita_chat_sessions_v1";
const MAX_SESSIONS = 20;

function cargarDesdeStorage(): Partial<EstadoChat> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { mensajes?: MensajeChat[]; borradoresGuardados?: BorradorGuardado[]; ts?: number };
    // Expira después de 24h
    if (parsed.ts && Date.now() - parsed.ts > 1000 * 60 * 60 * 24) {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
    return {
      mensajes: parsed.mensajes ?? [],
      borradoresGuardados: parsed.borradoresGuardados ?? [],
    };
  } catch {
    return {};
  }
}

function guardarEnStorage(estado: Pick<EstadoChat, "mensajes" | "borradoresGuardados">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mensajes: estado.mensajes,
        borradoresGuardados: estado.borradoresGuardados,
        ts: Date.now(),
      }),
    );
  } catch {
    // best-effort
  }
}

function guardarSesion(sesion: ChatSession) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const sesiones: ChatSession[] = raw ? JSON.parse(raw) : [];
    // Evitar duplicados por id
    const filtradas = sesiones.filter((s) => s.id !== sesion.id);
    filtradas.unshift(sesion);
    const recortadas = filtradas.slice(0, MAX_SESSIONS);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(recortadas));
  } catch {
    // best-effort
  }
}

function cargarSesiones(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

function eliminarSesion(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return;
    const sesiones = (JSON.parse(raw) as ChatSession[]).filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sesiones));
  } catch {
    // best-effort
  }
}

// ─── Hook ──────────────────────────────────────────────────────────
export function useChatGlobal() {
  const queryClient = useQueryClient();
  const saved = cargarDesdeStorage();
  const [estado, setEstado] = useState<EstadoChat>({
    abierto: false,
    mensajes: saved.mensajes ?? [],
    cargando: false,
    guardando: false,
    error: null,
    draftActual: null,
    ultimoIntent: null,
    borradoresGuardados: saved.borradoresGuardados ?? [],
  });

  const sessionIdRef = useRef(`chat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);

  // Persistir en localStorage
  useEffect(() => {
    guardarEnStorage({
      mensajes: estado.mensajes,
      borradoresGuardados: estado.borradoresGuardados,
    });
  }, [estado.mensajes, estado.borradoresGuardados]);

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
    // Guardar sesion actual antes de limpiar
    setEstado((prev) => {
      if (prev.mensajes.length > 0) {
        const primerUsuario = prev.mensajes.find((m) => m.role === "user");
        guardarSesion({
          id: sessionIdRef.current,
          titulo: primerUsuario?.text.slice(0, 40) ?? "Conversación",
          fecha: Date.now(),
          mensajes: prev.mensajes,
        });
      }
      sessionIdRef.current = `chat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      return {
        ...prev,
        mensajes: [],
        error: null,
        draftActual: null,
        ultimoIntent: null,
        borradoresGuardados: [],
      };
    });
  }, []);

  const cargarSesion = useCallback((sesion: ChatSession) => {
    sessionIdRef.current = sesion.id;
    setEstado((prev) => ({
      ...prev,
      mensajes: sesion.mensajes,
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

      // Solo enviamos el draft pendiente si estamos en medio de un flujo de registro
      const enFlujoRegistro =
        estado.ultimoIntent === "registro" ||
        estado.ultimoIntent === "registro_incompleto" ||
        estado.ultimoIntent === "edicion_borrador";
      const draftAEnviar = opciones?.draft ?? (enFlujoRegistro ? estado.draftActual : undefined);

      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: mensaje,
          sessionId: sessionIdRef.current,
          history,
          draft: draftAEnviar,
          previousIntent: estado.ultimoIntent ?? undefined,
          forceIntent: opciones?.forceIntent ?? undefined,
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
        sugerencias: data.sugerencias,
        camposFaltantes: data.camposFaltantes ?? data.draftPatch?.camposFaltantes,
      };

      // Limpiar draft si la respuesta ya no es de registro
      const esRegistro = data.intent === "registro" || data.intent === "registro_incompleto" || data.intent === "edicion_borrador";
      const nuevoDraft = esRegistro
        ? (data.draftPatch ?? estado.draftActual)
        : null;

      setEstado((prev) => ({
        ...prev,
        mensajes: [...prev.mensajes, respuestaMsg],
        cargando: false,
        draftActual: nuevoDraft,
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
  }, [estado.mensajes, estado.ultimoIntent, estado.draftActual]);

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
    cargarSesion,
    sesiones: cargarSesiones(),
    eliminarSesion,
    sessionId: sessionIdRef.current,
  };
}
