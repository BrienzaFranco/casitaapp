"use client";

import { useCallback, useMemo, useState } from "react";
import { cargarMapaDetalles, cargarMapaLugares, predecirCategoria } from "@/lib/categorizacion";
import type { Categoria, Compra, CompraEditable, PagadorCompra, Subcategoria } from "@/types";
import type {
  ModoRegistroIa,
  RegistroIaCorrectionOp,
  RegistroIaDraft,
  RegistroIaIntent,
  RegistroIaItem,
  RegistroIaResolution,
  RegistroIaResolutionOption,
  RegistroIaResultado,
  RegistroIaError,
  RegistroIaMeta,
} from "@/lib/ai/contracts";
import {
  aplicarAjustePorTotal,
  convertirDraftACompraEditable,
  crearDraftDesdeMensaje,
  fusionarDraftConIa,
  resolverResultado,
} from "@/lib/ai/registroDeterministico";

interface MensajeRegistroIa {
  role: "user" | "assistant";
  text: string;
}

interface UseRegistroIaArgs {
  compras: Compra[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
}

interface ParamsGuardar {
  registradoPor: string;
  etiquetasCompraIds?: string[];
  incluirAjuste?: boolean;
  forzarPagador?: PagadorCompra;
  forzarLugar?: string;
}

interface RespuestaIa {
  intent?: RegistroIaIntent;
  answer?: string;
  draftPatch?: Partial<RegistroIaDraft>;
  operations?: RegistroIaCorrectionOp[];
  resolution?: RegistroIaResolution | null;
  warnings?: string[];
  error?: RegistroIaError;
  meta?: RegistroIaMeta;
}

interface TurnoHistorialIa {
  role: "user" | "assistant";
  content: string;
}

interface EstadoUltimoIntento {
  mensaje: string;
  modo: ModoRegistroIa;
  draftBase?: RegistroIaDraft;
}

const MAX_TURNOS_HISTORIAL = 6;
const IA_QUICKSAVE_V2_ENABLED = true;

interface PendingResolutionState {
  reason: string;
  field: RegistroIaResolution["field"];
  options: RegistroIaResolutionOption[];
  op?: RegistroIaCorrectionOp;
  draft: RegistroIaDraft;
  modo: ModoRegistroIa;
}

function normalizar(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function generarIdItemIa() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ia-${crypto.randomUUID()}`;
  }
  return `ia-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mapearCategoriaPorNombre(
  item: RegistroIaDraft["items"][number],
  categorias: Categoria[],
  subcategorias: Subcategoria[],
) {
  const categoriaRaw = (item as unknown as { categoria_nombre?: string }).categoria_nombre;
  const subcategoriaRaw = (item as unknown as { subcategoria_nombre?: string }).subcategoria_nombre;
  if (!categoriaRaw && !subcategoriaRaw) return item;

  let categoriaId = item.categoria_id;
  let subcategoriaId = item.subcategoria_id;

  if (!categoriaId && categoriaRaw) {
    const cat = categorias.find((c) => normalizar(c.nombre) === normalizar(categoriaRaw))
      ?? categorias.find((c) => normalizar(c.nombre).includes(normalizar(categoriaRaw)));
    categoriaId = cat?.id ?? "";
  }
  if (!subcategoriaId && subcategoriaRaw) {
    const candidatas = categoriaId
      ? subcategorias.filter((s) => s.categoria_id === categoriaId)
      : subcategorias;
    const sub = candidatas.find((s) => normalizar(s.nombre) === normalizar(subcategoriaRaw))
      ?? candidatas.find((s) => normalizar(s.nombre).includes(normalizar(subcategoriaRaw)));
    subcategoriaId = sub?.id ?? "";
  }

  return { ...item, categoria_id: categoriaId, subcategoria_id: subcategoriaId };
}

async function pedirRefinamientoIa(
  mensaje: string,
  draft: RegistroIaDraft | null,
  categorias: Categoria[],
  subcategorias: Subcategoria[],
  opciones: {
    modo: ModoRegistroIa;
    sessionId: string;
    history: TurnoHistorialIa[];
    incluirContexto: boolean;
  },
): Promise<RespuestaIa | null> {
  try {
    const res = await fetch("/api/ia/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: mensaje,
        mode: opciones.modo,
        sessionId: opciones.sessionId,
        history: opciones.history.slice(-MAX_TURNOS_HISTORIAL),
        draft,
        context: opciones.incluirContexto
          ? {
            categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
            subcategorias: subcategorias.map((s) => ({ id: s.id, categoria_id: s.categoria_id, nombre: s.nombre })),
          }
          : undefined,
      }),
    });
    let data: RespuestaIa | null = null;
    try {
      data = await res.json() as RespuestaIa;
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (data) return data;
      return {
        error: {
          code: "http_error",
          message: "No se pudo interpretar la respuesta de IA.",
          retryable: true,
        },
      };
    }
    return data;
  } catch {
    return {
      error: {
        code: "network_error",
        message: "No hay conexion con el servicio IA.",
        retryable: true,
      },
    };
  }
}

function resumenCambio(op: RegistroIaCorrectionOp) {
  if (op.type === "add_item") {
    return `item+ ${op.item.descripcion}`;
  }
  if (op.type === "remove_item") {
    return `item- ${op.targetMatcher || op.from || op.targetItemId || "seleccionado"}`;
  }
  if (op.targetType === "draft") {
    return `${op.field} -> ${String(op.to ?? "-")}`;
  }
  return `item(${op.targetMatcher || op.targetItemId || "seleccionado"}).${op.field} -> ${String(op.to ?? "-")}`;
}

function aplicarCambioEnItem(
  item: RegistroIaItem,
  op: RegistroIaCorrectionOp,
  categorias: Categoria[],
  subcategorias: Subcategoria[],
): RegistroIaItem {
  if (op.type !== "replace_field") return item;
  if (op.field === "descripcion") {
    return { ...item, descripcion: String(op.to ?? "").trim() || item.descripcion };
  }
  if (op.field === "monto") {
    const monto = typeof op.to === "number" ? op.to : item.monto;
    return { ...item, monto, expresionMonto: monto != null ? String(monto) : item.expresionMonto };
  }
  if (op.field === "cantidad") {
    const cantidad = typeof op.to === "number" ? Math.max(1, Math.round(op.to)) : item.cantidad;
    return { ...item, cantidad };
  }
  if (op.field === "categoria_id") {
    const categoriaId = String(op.to ?? "");
    if (!categorias.some((c) => c.id === categoriaId)) return item;
    const subValida = item.subcategoria_id && subcategorias.some((s) => s.id === item.subcategoria_id && s.categoria_id === categoriaId);
    return { ...item, categoria_id: categoriaId, subcategoria_id: subValida ? item.subcategoria_id : "" };
  }
  if (op.field === "subcategoria_id") {
    const subcategoriaId = String(op.to ?? "");
    const sub = subcategorias.find((s) => s.id === subcategoriaId);
    if (!sub) return item;
    return { ...item, subcategoria_id: subcategoriaId, categoria_id: item.categoria_id || sub.categoria_id };
  }
  return item;
}

function buscarCandidatos(
  op: RegistroIaCorrectionOp,
  items: RegistroIaItem[],
) {
  if (op.type === "add_item") return [];

  if (op.targetItemId) {
    return items.filter((item) => item.id === op.targetItemId);
  }
  const matcher = normalizar(op.targetMatcher || op.from || "");
  if (!matcher) return [];
  return items.filter((item) => normalizar(item.descripcion).includes(matcher));
}

function aplicarCorrecciones(
  draft: RegistroIaDraft,
  operations: RegistroIaCorrectionOp[],
  categorias: Categoria[],
  subcategorias: Subcategoria[],
) {
  let actual = draft;
  const cambios: string[] = [];
  const warnings: string[] = [];

  for (const op of operations) {
    if (op.type === "add_item") {
      const descripcion = String(op.item.descripcion ?? "").trim();
      if (!descripcion) {
        warnings.push("No pude agregar item porque falta descripcion.");
        continue;
      }
      const cantidad = typeof op.item.cantidad === "number" ? Math.max(1, Math.round(op.item.cantidad)) : null;
      const monto = typeof op.item.monto === "number" ? op.item.monto : null;
      const expresionMonto = op.item.expresionMonto?.trim() || (monto != null ? String(monto) : null);
      const categoriaId = op.item.categoria_id && categorias.some((c) => c.id === op.item.categoria_id)
        ? op.item.categoria_id
        : "";
      const sub = op.item.subcategoria_id
        ? subcategorias.find((s) => s.id === op.item.subcategoria_id)
        : null;
      const subcategoriaId = sub && (!categoriaId || sub.categoria_id === categoriaId) ? sub.id : "";

      actual = {
        ...actual,
        items: [
          ...actual.items,
          {
            id: generarIdItemIa(),
            descripcion,
            cantidad,
            expresionMonto,
            monto,
            categoria_id: categoriaId,
            subcategoria_id: subcategoriaId,
            fuente: "ia",
          },
        ],
      };
      cambios.push(resumenCambio(op));
      continue;
    }

    if (op.type === "remove_item") {
      const candidatos = buscarCandidatos(op, actual.items);
      if (!candidatos.length) {
        warnings.push(`No encontre item para eliminar (${op.targetMatcher || op.from || op.targetItemId || "sin referencia"}).`);
        continue;
      }
      if (!op.targetItemId && candidatos.length > 1) {
        return {
          draft: actual,
          cambios,
          warnings,
          ambiguous: {
            op,
            field: "descripcion" as const,
            reason: "Encontre mas de un item para eliminar. Elegi cual queres quitar.",
            options: candidatos.map((item) => ({
              id: item.id,
              label: `${item.descripcion}${item.monto != null ? ` (${item.monto})` : ""}`,
              targetItemId: item.id,
            })),
          },
        };
      }
      const target = candidatos[0];
      actual = { ...actual, items: actual.items.filter((item) => item.id !== target.id) };
      cambios.push(`item- ${target.descripcion}`);
      continue;
    }

    if (op.targetType === "draft") {
      if (op.field === "lugar") {
        actual = { ...actual, lugar: String(op.to ?? "").trim() || actual.lugar };
        cambios.push(resumenCambio(op));
        continue;
      }
      if (op.field === "pagador") {
        const pagador = op.to;
        if (pagador === "franco" || pagador === "fabiola" || pagador === "compartido") {
          actual = { ...actual, pagador };
          cambios.push(resumenCambio(op));
        } else {
          warnings.push("No pude interpretar el nuevo pagador.");
        }
        continue;
      }
      if (op.field === "reparto") {
        const reparto = op.to;
        if (reparto === "50/50" || reparto === "solo_franco" || reparto === "solo_fabiola") {
          actual = { ...actual, reparto };
          cambios.push(resumenCambio(op));
        } else {
          warnings.push("No pude interpretar el nuevo reparto.");
        }
        continue;
      }
      if (op.field === "total") {
        if (typeof op.to === "number") {
          actual = { ...actual, total: op.to };
          cambios.push(resumenCambio(op));
        } else {
          warnings.push("No pude interpretar el nuevo total.");
        }
      }
      continue;
    }

    const candidatos = buscarCandidatos(op, actual.items);
    if (!candidatos.length) {
      warnings.push(`No encontre item para actualizar (${op.targetMatcher || op.from || op.targetItemId || "sin referencia"}).`);
      continue;
    }

    if (!op.targetItemId && candidatos.length > 1) {
        return {
          draft: actual,
          cambios,
          warnings,
          ambiguous: {
            op,
            field: op.field,
            reason: "Encontre mas de un item que coincide. Elegi cual queres cambiar.",
            options: candidatos.map((item) => ({
              id: item.id,
            label: `${item.descripcion}${item.monto != null ? ` (${item.monto})` : ""}`,
            targetItemId: item.id,
          })),
        },
      };
    }

    const target = candidatos[0];
    actual = {
      ...actual,
      items: actual.items.map((item) => {
        if (item.id !== target.id) return item;
        return aplicarCambioEnItem(item, op, categorias, subcategorias);
      }),
    };
    cambios.push(resumenCambio({ ...op, targetItemId: target.id }));
  }

  return { draft: actual, cambios, warnings };
}

export function useRegistroIa({ compras, categorias, subcategorias }: UseRegistroIaArgs) {
  const [modoActivo, setModoActivo] = useState<ModoRegistroIa | null>(null);
  const [resultado, setResultado] = useState<RegistroIaResultado | null>(null);
  const [mensajes, setMensajes] = useState<MensajeRegistroIa[]>([]);
  const [history, setHistory] = useState<TurnoHistorialIa[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puedeReintentar, setPuedeReintentar] = useState(false);
  const [ultimoIntento, setUltimoIntento] = useState<EstadoUltimoIntento | null>(null);
  const [firmaContextoEnviada, setFirmaContextoEnviada] = useState("");
  const [pendingResolution, setPendingResolution] = useState<PendingResolutionState | null>(null);
  const sessionId = useMemo(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `ria-${crypto.randomUUID()}`;
    }
    return `ria-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }, []);

  const mapaLugares = useMemo(
    () => cargarMapaLugares(compras.map((c) => ({ nombre_lugar: c.nombre_lugar, items: c.items }))),
    [compras],
  );
  const mapaDetalles = useMemo(
    () => cargarMapaDetalles(compras.map((c) => ({ items: c.items }))),
    [compras],
  );
  const firmaContexto = useMemo(() => {
    const cats = categorias.map((c) => `${c.id}:${normalizar(c.nombre)}`).join("|");
    const subs = subcategorias.map((s) => `${s.id}:${s.categoria_id}:${normalizar(s.nombre)}`).join("|");
    return `${cats}::${subs}`;
  }, [categorias, subcategorias]);
  const catalogoPredictivo = useMemo(() => ({
    categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
    subcategorias: subcategorias.map((s) => ({ id: s.id, categoria_id: s.categoria_id, nombre: s.nombre })),
  }), [categorias, subcategorias]);

  const enriquecerCategorias = useCallback((draft: RegistroIaDraft): RegistroIaDraft => {
    const items = draft.items.map((item) => {
      let actualizado = mapearCategoriaPorNombre(item, categorias, subcategorias);
      if (!actualizado.categoria_id) {
        const pred = predecirCategoria(actualizado.descripcion || draft.lugar, mapaLugares, mapaDetalles, catalogoPredictivo);
        if (pred) {
          actualizado = {
            ...actualizado,
            categoria_id: pred.categoria_id || "",
            subcategoria_id: pred.subcategoria_id || "",
          };
        }
      }
      return actualizado;
    });
    return { ...draft, items };
  }, [categorias, subcategorias, mapaLugares, mapaDetalles, catalogoPredictivo]);

  const redactarMensajeAsistente = useCallback((res: RegistroIaResultado, modo: ModoRegistroIa) => {
    if (modo === "rapido") {
      const faltanMontos = res.draft.total != null && res.draft.items.some((i) => i.monto == null || i.monto <= 0);
      if (faltanMontos) {
        return "Detecte lugar, total e items. Faltan montos por item: podes detallar ahora o guardar rapido con ajuste.";
      }
      if (res.canSave) return "Listo. Ya esta para guardado rapido con un mensaje.";
      return res.preguntaSiguiente ?? "Necesito un poco mas de detalle para guardarlo.";
    }
    if (res.canSave) return "Perfecto. Ya esta completo. Si queres, lo guardo como borrador IA.";
    return res.preguntaSiguiente ?? "Decime el dato que falta para completar el registro.";
  }, []);

  const formatearRespuestaAsistente = useCallback((
    res: RegistroIaResultado,
    modo: ModoRegistroIa,
    answerRaw: string,
  ) => {
    const answer = answerRaw.trim();
    if (res.canSave) {
      if (answer && /^listo\b/i.test(answer)) return answer;
      return redactarMensajeAsistente(res, modo);
    }
    if (res.preguntaSiguiente) {
      if (answer.includes("?")) return answer;
      return res.preguntaSiguiente;
    }
    if (answer) {
      if (answer.includes("?")) return answer;
      return `${answer.replace(/[.!]+$/, "")}. ¿Querés que ajuste algo más?`;
    }
    return redactarMensajeAsistente(res, modo);
  }, [redactarMensajeAsistente]);

  const ajustarResultadoRapido = useCallback((res: RegistroIaResultado, modo: ModoRegistroIa): RegistroIaResultado => {
    if (modo !== "rapido" || !IA_QUICKSAVE_V2_ENABLED) return res;
    const tieneTotal = Boolean(res.draft.total && res.draft.total > 0);
    const tieneItems = res.draft.items.length > 0;
    if (!tieneTotal && !tieneItems) return res;

    const faltanDatosPago = res.faltantes.includes("pagador") || res.faltantes.includes("reparto");
    if (faltanDatosPago) {
      return { ...res, canSave: false };
    }

    return { ...res, canSave: true, faltantes: [] };
  }, []);

  const pushTurno = useCallback((mensajeUsuario: string, mensajeAsistente: string) => {
    setMensajes((prev) => [
      ...prev,
      { role: "user", text: mensajeUsuario },
      { role: "assistant", text: mensajeAsistente },
    ]);
    setHistory((prev) => {
      const next: TurnoHistorialIa[] = [
        ...prev,
        { role: "user", content: mensajeUsuario },
        { role: "assistant", content: mensajeAsistente },
      ];
      return next.slice(-MAX_TURNOS_HISTORIAL);
    });
  }, []);

  const resolverConModo = useCallback(async (
    mensaje: string,
    modo: ModoRegistroIa,
    draftBase?: RegistroIaDraft,
  ) => {
    setError(null);
    setPuedeReintentar(false);
    setCargando(true);
    setPendingResolution(null);
    setUltimoIntento({ mensaje, modo, draftBase });

    try {
      const draftActual = draftBase ?? resultado?.draft ?? null;
      const incluirContexto = firmaContextoEnviada !== firmaContexto;
      const respuestaIa = await pedirRefinamientoIa(
        mensaje,
        draftActual,
        categorias,
        subcategorias,
        {
          modo,
          sessionId,
          history,
          incluirContexto,
        },
      );
      if (incluirContexto) setFirmaContextoEnviada(firmaContexto);

      if (!respuestaIa) {
        throw new Error("No se pudo obtener una respuesta valida de IA.");
      }

      if (respuestaIa.error) {
        const msgError = respuestaIa.error.message || "No se pudo procesar el mensaje con IA.";
        const msgAsistente = respuestaIa.answer?.trim() || "No pude resolverlo ahora. Podes reintentar.";
        if (respuestaIa.error.code === "context_missing") {
          setFirmaContextoEnviada("");
        }
        pushTurno(mensaje, msgAsistente);
        setError(msgError);
        setPuedeReintentar(Boolean(respuestaIa.error.retryable));
        setModoActivo(modo);
        return;
      }

      let draft: RegistroIaDraft;
      const intent = respuestaIa?.intent ?? "crear_o_actualizar";
      const answer = respuestaIa?.answer?.trim() ?? "";
      const tieneOperaciones = Boolean(respuestaIa?.operations?.length);
      const tienePatch = Boolean(respuestaIa?.draftPatch);
      const tieneResolution = Boolean(respuestaIa?.resolution?.options?.length);

      if (intent === "pregunta" && draftActual && !tieneOperaciones && !tienePatch && !tieneResolution) {
        const resSinCambios = ajustarResultadoRapido(resolverResultado(enriquecerCategorias(draftActual), modo), modo);
        setResultado(resSinCambios);
        pushTurno(mensaje, formatearRespuestaAsistente(resSinCambios, modo, answer || "Te respondo sin cambiar el borrador."));
        setModoActivo(modo);
        return;
      }

      if (draftActual && (intent === "corregir" || tieneOperaciones || tienePatch || tieneResolution)) {
        draft = draftActual;
        if (respuestaIa?.draftPatch) {
          draft = fusionarDraftConIa(draft, respuestaIa.draftPatch);
        }

        const operations = respuestaIa?.operations ?? [];
        if (operations.length > 0) {
          const aplicado = aplicarCorrecciones(draft, operations, categorias, subcategorias);

          if (aplicado.ambiguous) {
            setPendingResolution({
              reason: aplicado.ambiguous.reason,
              field: aplicado.ambiguous.field,
              options: aplicado.ambiguous.options,
              op: aplicado.ambiguous.op,
              draft: aplicado.draft,
              modo,
            });
            setResultado(ajustarResultadoRapido(resolverResultado(enriquecerCategorias(aplicado.draft), modo), modo));
            pushTurno(mensaje, aplicado.ambiguous.reason);
            setModoActivo(modo);
            return;
          }

          draft = aplicado.draft;
          if (aplicado.warnings.length > 0) {
            draft = { ...draft, warnings: [...draft.warnings, ...aplicado.warnings] };
          }
          const res = ajustarResultadoRapido(resolverResultado(enriquecerCategorias(draft), modo), modo);
          const resumen = aplicado.cambios.length > 0
            ? `Cambios aplicados: ${aplicado.cambios.slice(0, 3).join(" | ")}`
            : "No detecte cambios concretos para aplicar.";
          setResultado(res);
          const mensajeAsistente = formatearRespuestaAsistente(res, modo, answer);
          pushTurno(mensaje, `${resumen}\n${mensajeAsistente}`);
          setModoActivo(modo);
          return;
        }

        if (respuestaIa?.resolution?.options?.length) {
          setPendingResolution({
            reason: respuestaIa.resolution.reason,
            field: respuestaIa.resolution.field,
            options: respuestaIa.resolution.options,
            draft,
            modo,
          });
          setResultado(ajustarResultadoRapido(resolverResultado(enriquecerCategorias(draft), modo), modo));
          pushTurno(mensaje, respuestaIa.resolution?.reason || "Necesito que elijas una opcion.");
          setModoActivo(modo);
          return;
        }

        const res = ajustarResultadoRapido(resolverResultado(enriquecerCategorias(draft), modo), modo);
        setResultado(res);
        pushTurno(mensaje, formatearRespuestaAsistente(res, modo, answer));
        setModoActivo(modo);
        return;
      }

      const deterministico = crearDraftDesdeMensaje(mensaje, draftBase);
      draft = deterministico;

      if (respuestaIa?.draftPatch) {
        draft = fusionarDraftConIa(draft, respuestaIa.draftPatch);
      }

      draft = enriquecerCategorias(draft);
      if (respuestaIa?.warnings?.length) {
        draft = { ...draft, warnings: [...draft.warnings, ...respuestaIa.warnings] };
      }

      const res = ajustarResultadoRapido(resolverResultado(draft, modo), modo);
      setResultado(res);
      pushTurno(mensaje, formatearRespuestaAsistente(res, modo, answer));
      setModoActivo(modo);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo procesar el mensaje";
      setError(msg);
      setPuedeReintentar(true);
    } finally {
      setCargando(false);
    }
  }, [
    categorias,
    subcategorias,
    history,
    sessionId,
    firmaContexto,
    firmaContextoEnviada,
    enriquecerCategorias,
    formatearRespuestaAsistente,
    ajustarResultadoRapido,
    pushTurno,
    resultado?.draft,
  ]);

  const ejecutarRapido = useCallback(async (mensaje: string) => {
    setMensajes([]);
    setHistory([]);
    setFirmaContextoEnviada("");
    setPendingResolution(null);
    setPuedeReintentar(false);
    await resolverConModo(mensaje, "rapido");
  }, [resolverConModo]);

  const iniciarCompleto = useCallback(async (mensaje: string) => {
    setMensajes([]);
    setHistory([]);
    setFirmaContextoEnviada("");
    setPendingResolution(null);
    setPuedeReintentar(false);
    await resolverConModo(mensaje, "completo");
  }, [resolverConModo]);

  const responderRapido = useCallback(async (mensaje: string) => {
    if (!resultado?.draft) return;
    await resolverConModo(mensaje, "rapido", resultado.draft);
  }, [resultado?.draft, resolverConModo]);

  const responderCompleto = useCallback(async (mensaje: string) => {
    if (!resultado?.draft) return;
    await resolverConModo(mensaje, "completo", resultado.draft);
  }, [resultado?.draft, resolverConModo]);

  const resolverAmbiguedad = useCallback((optionId: string) => {
    if (!pendingResolution) return;
    const option = pendingResolution.options.find((opt) => opt.id === optionId);
    if (!option) return;

    if (pendingResolution.op) {
      const op = { ...pendingResolution.op, targetItemId: option.targetItemId || option.id };
      const aplicado = aplicarCorrecciones(pendingResolution.draft, [op], categorias, subcategorias);
      const draft = enriquecerCategorias(aplicado.draft);
      const res = ajustarResultadoRapido(resolverResultado(draft, pendingResolution.modo), pendingResolution.modo);
      setResultado(res);
      pushTurno(option.label, aplicado.cambios.length ? `Listo. ${aplicado.cambios.join(" | ")}` : "Listo, aplique el cambio.");
      setModoActivo(pendingResolution.modo);
      setPendingResolution(null);
      return;
    }

    pushTurno(option.label, "Perfecto, continuo con esa opcion.");
    setPendingResolution(null);
  }, [pendingResolution, categorias, subcategorias, enriquecerCategorias, ajustarResultadoRapido, pushTurno]);

  const pasarRapidoACompleto = useCallback(() => {
    if (!resultado?.draft) return;
    const conAjuste = aplicarAjustePorTotal(resultado.draft);
    const res = resolverResultado(conAjuste, "completo");
    setResultado(res);
    setModoActivo("completo");
    setMensajes((prev) => [
      ...prev,
      {
        role: "assistant",
        text: res.preguntaSiguiente ?? "Pase a registro completo. Te voy preguntando lo que falte.",
      },
    ]);
  }, [resultado?.draft]);

  const reset = useCallback(() => {
    setModoActivo(null);
    setResultado(null);
    setMensajes([]);
    setHistory([]);
    setFirmaContextoEnviada("");
    setCargando(false);
    setError(null);
    setPuedeReintentar(false);
    setUltimoIntento(null);
    setPendingResolution(null);
  }, []);

  const faltanMontosEnRapido = useMemo(() => {
    if (modoActivo !== "rapido" || !resultado?.draft) return false;
    return resultado.draft.total != null && resultado.draft.items.some((i) => i.monto == null || i.monto <= 0);
  }, [modoActivo, resultado?.draft]);

  const buildCompraEditable = useCallback((params: ParamsGuardar): CompraEditable | null => {
    if (!resultado?.draft || !modoActivo) return null;
    return convertirDraftACompraEditable(resultado.draft, {
      registradoPor: params.registradoPor,
      etiquetasCompraIds: params.etiquetasCompraIds,
      incluirAjuste: params.incluirAjuste,
      forzarPagador: params.forzarPagador,
      forzarLugar: params.forzarLugar,
    });
  }, [resultado?.draft, modoActivo]);

  const reintentarUltimoMensaje = useCallback(async () => {
    if (!ultimoIntento || cargando) return;
    await resolverConModo(ultimoIntento.mensaje, ultimoIntento.modo, ultimoIntento.draftBase);
  }, [ultimoIntento, cargando, resolverConModo]);

  return {
    modoActivo,
    resultado,
    mensajes,
    cargando,
    error,
    puedeReintentar,
    pendingResolution,
    faltanMontosEnRapido,
    ejecutarRapido,
    iniciarCompleto,
    responderRapido,
    responderCompleto,
    resolverAmbiguedad,
    pasarRapidoACompleto,
    reintentarUltimoMensaje,
    buildCompraEditable,
    reset,
  };
}
