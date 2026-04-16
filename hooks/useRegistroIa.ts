"use client";

import { useCallback, useMemo, useState } from "react";
import { cargarMapaDetalles, cargarMapaLugares, predecirCategoria } from "@/lib/categorizacion";
import type { Categoria, Compra, CompraEditable, PagadorCompra, Subcategoria } from "@/types";
import type { ModoRegistroIa, RegistroIaDraft, RegistroIaResultado } from "@/lib/ai/contracts";
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
  draft: RegistroIaDraft,
  categorias: Categoria[],
  subcategorias: Subcategoria[],
): Promise<Partial<RegistroIaDraft> | null> {
  try {
    const res = await fetch("/api/ia/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: mensaje,
        draft,
        context: {
          categorias: categorias.map((c) => c.nombre),
          subcategorias: subcategorias.map((s) => s.nombre),
        },
      }),
    });
    if (!res.ok) return null;
    const body = await res.json() as { draftPatch?: Partial<RegistroIaDraft> };
    return body.draftPatch ?? null;
  } catch {
    return null;
  }
}

export function useRegistroIa({ compras, categorias, subcategorias }: UseRegistroIaArgs) {
  const [modoActivo, setModoActivo] = useState<ModoRegistroIa | null>(null);
  const [resultado, setResultado] = useState<RegistroIaResultado | null>(null);
  const [mensajes, setMensajes] = useState<MensajeRegistroIa[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        return "Detecté lugar, total e items. Faltan montos por item: podés detallar ahora o guardar rápido con ajuste.";
      }
      if (res.canSave) {
        return "Listo, ya lo puedo guardar como borrador IA.";
      }
      return res.preguntaSiguiente ?? "Necesito un poco más de detalle para guardarlo.";
    }
    if (res.canSave) return "Perfecto. Ya está completo. Si querés, lo guardo como borrador IA.";
    return res.preguntaSiguiente ?? "Decime el dato que falta para completar el registro.";
  }, []);

  const resolverConModo = useCallback(async (
    mensaje: string,
    modo: ModoRegistroIa,
    draftBase?: RegistroIaDraft,
  ) => {
    setError(null);
    setCargando(true);
    try {
      let draft = crearDraftDesdeMensaje(mensaje, draftBase);

      const necesitaIa =
        draft.confidence < 0.55 ||
        (!draft.lugar && draft.items.length === 0) ||
        (modo === "completo" && draft.total != null && draft.items.length === 0);

      if (necesitaIa) {
        const patchIa = await pedirRefinamientoIa(mensaje, draft, categorias, subcategorias);
        if (patchIa) {
          draft = fusionarDraftConIa(draft, patchIa);
        }
      }

      draft = enriquecerCategorias(draft);
      const res = resolverResultado(draft, modo);
      setResultado(res);
      setMensajes((prev) => [
        ...prev,
        { role: "user", text: mensaje },
        { role: "assistant", text: redactarMensajeAsistente(res, modo) },
      ]);
      setModoActivo(modo);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo procesar el mensaje";
      setError(msg);
    } finally {
      setCargando(false);
    }
  }, [categorias, subcategorias, enriquecerCategorias, redactarMensajeAsistente]);

  const ejecutarRapido = useCallback(async (mensaje: string) => {
    setMensajes([]);
    await resolverConModo(mensaje, "rapido");
  }, [resolverConModo]);

  const iniciarCompleto = useCallback(async (mensaje: string) => {
    setMensajes([]);
    await resolverConModo(mensaje, "completo");
  }, [resolverConModo]);

  const responderCompleto = useCallback(async (mensaje: string) => {
    if (!resultado?.draft) return;
    await resolverConModo(mensaje, "completo", resultado.draft);
  }, [resultado?.draft, resolverConModo]);

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
        text: res.preguntaSiguiente ?? "Pasé a registro completo. Te voy preguntando lo que falte.",
      },
    ]);
  }, [resultado?.draft]);

  const reset = useCallback(() => {
    setModoActivo(null);
    setResultado(null);
    setMensajes([]);
    setCargando(false);
    setError(null);
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
    faltanMontosEnRapido,
    ejecutarRapido,
    iniciarCompleto,
    responderCompleto,
    pasarRapidoACompleto,
    buildCompraEditable,
    reset,
  };
}

