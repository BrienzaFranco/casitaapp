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
}

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
): Promise<RespuestaIa | null> {
  try {
    const res = await fetch("/api/ia/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: mensaje,
        draft,
        context: {
          categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
          subcategorias: subcategorias.map((s) => ({ id: s.id, categoria_id: s.categoria_id, nombre: s.nombre })),
        },
      }),
    });
    if (!res.ok) return null;
    return await res.json() as RespuestaIa;
  } catch {
    return null;
  }
}

function resumenCambio(op: RegistroIaCorrectionOp) {
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
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] = useState<PendingResolutionState | null>(null);

  const mapaLugares = useMemo(
    () => cargarMapaLugares(compras.map((c) => ({ nombre_lugar: c.nombre_lugar, items: c.items }))),
    [compras],
  );
  const mapaDetalles = useMemo(
    () => cargarMapaDetalles(compras.map((c) => ({ items: c.items }))),
    [compras],
  );

  const enriquecerCategorias = useCallback((draft: RegistroIaDraft): RegistroIaDraft => {
    const items = draft.items.map((item) => {
      let actualizado = mapearCategoriaPorNombre(item, categorias, subcategorias);
      if (!actualizado.categoria_id) {
        const pred = predecirCategoria(actualizado.descripcion || draft.lugar, mapaLugares, mapaDetalles);
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
  }, [categorias, subcategorias, mapaLugares, mapaDetalles]);

  const redactarMensajeAsistente = useCallback((res: RegistroIaResultado, modo: ModoRegistroIa) => {
    if (modo === "rapido") {
      const faltanMontos = res.draft.total != null && res.draft.items.some((i) => i.monto == null || i.monto <= 0);
      if (faltanMontos) {
        return "Detecte lugar, total e items. Faltan montos por item: podes detallar ahora o guardar rapido con ajuste.";
      }
      if (res.canSave) return "Listo, ya lo puedo guardar como borrador IA.";
      return res.preguntaSiguiente ?? "Necesito un poco mas de detalle para guardarlo.";
    }
    if (res.canSave) return "Perfecto. Ya esta completo. Si queres, lo guardo como borrador IA.";
    return res.preguntaSiguiente ?? "Decime el dato que falta para completar el registro.";
  }, []);

  const resolverConModo = useCallback(async (
    mensaje: string,
    modo: ModoRegistroIa,
    draftBase?: RegistroIaDraft,
  ) => {
    setError(null);
    setCargando(true);
    setPendingResolution(null);

    try {
      const draftActual = draftBase ?? resultado?.draft ?? null;
      const respuestaIa = await pedirRefinamientoIa(mensaje, draftActual, categorias, subcategorias);

      let draft: RegistroIaDraft;
      const intent = respuestaIa?.intent ?? "crear_o_actualizar";
      const answer = respuestaIa?.answer?.trim() ?? "";

      if (intent === "pregunta" && draftActual) {
        setMensajes((prev) => [...prev, { role: "user", text: mensaje }, { role: "assistant", text: answer || "Te respondo sin cambiar el borrador." }]);
        setModoActivo(modo);
        return;
      }

      if (intent === "corregir" && draftActual) {
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
              field: aplicado.ambiguous.op.field,
              options: aplicado.ambiguous.options,
              op: aplicado.ambiguous.op,
              draft: aplicado.draft,
              modo,
            });
            setResultado(resolverResultado(enriquecerCategorias(aplicado.draft), modo));
            setMensajes((prev) => [
              ...prev,
              { role: "user", text: mensaje },
              { role: "assistant", text: aplicado.ambiguous.reason },
            ]);
            setModoActivo(modo);
            return;
          }

          draft = aplicado.draft;
          if (aplicado.warnings.length > 0) {
            draft = { ...draft, warnings: [...draft.warnings, ...aplicado.warnings] };
          }
          const res = resolverResultado(enriquecerCategorias(draft), modo);
          const resumen = aplicado.cambios.length > 0
            ? `Cambios aplicados: ${aplicado.cambios.slice(0, 3).join(" | ")}`
            : "No detecte cambios concretos para aplicar.";
          setResultado(res);
          setMensajes((prev) => [
            ...prev,
            { role: "user", text: mensaje },
            { role: "assistant", text: answer ? `${resumen}\n${answer}` : resumen },
          ]);
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
          setResultado(resolverResultado(enriquecerCategorias(draft), modo));
          setMensajes((prev) => [
            ...prev,
            { role: "user", text: mensaje },
            { role: "assistant", text: respuestaIa.resolution?.reason || "Necesito que elijas una opcion." },
          ]);
          setModoActivo(modo);
          return;
        }
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

      const res = resolverResultado(draft, modo);
      setResultado(res);
      setMensajes((prev) => [
        ...prev,
        { role: "user", text: mensaje },
        { role: "assistant", text: answer || redactarMensajeAsistente(res, modo) },
      ]);
      setModoActivo(modo);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo procesar el mensaje";
      setError(msg);
    } finally {
      setCargando(false);
    }
  }, [categorias, subcategorias, enriquecerCategorias, redactarMensajeAsistente, resultado?.draft]);

  const ejecutarRapido = useCallback(async (mensaje: string) => {
    setMensajes([]);
    setPendingResolution(null);
    await resolverConModo(mensaje, "rapido");
  }, [resolverConModo]);

  const iniciarCompleto = useCallback(async (mensaje: string) => {
    setMensajes([]);
    setPendingResolution(null);
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
      const res = resolverResultado(draft, pendingResolution.modo);
      setResultado(res);
      setMensajes((prev) => [
        ...prev,
        { role: "user", text: option.label },
        { role: "assistant", text: aplicado.cambios.length ? `Listo. ${aplicado.cambios.join(" | ")}` : "Listo, aplique el cambio." },
      ]);
      setModoActivo(pendingResolution.modo);
      setPendingResolution(null);
      return;
    }

    setMensajes((prev) => [
      ...prev,
      { role: "user", text: option.label },
      { role: "assistant", text: "Perfecto, continuo con esa opcion." },
    ]);
    setPendingResolution(null);
  }, [pendingResolution, categorias, subcategorias, enriquecerCategorias]);

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
    setCargando(false);
    setError(null);
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

  return {
    modoActivo,
    resultado,
    mensajes,
    cargando,
    error,
    pendingResolution,
    faltanMontosEnRapido,
    ejecutarRapido,
    iniciarCompleto,
    responderRapido,
    responderCompleto,
    resolverAmbiguedad,
    pasarRapidoACompleto,
    buildCompraEditable,
    reset,
  };
}

