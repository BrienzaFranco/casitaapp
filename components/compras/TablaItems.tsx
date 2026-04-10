"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Categoria, ItemEditable, Subcategoria } from "@/types";
import { FilaItem } from "@/components/compras/FilaItem";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  items: ItemEditable[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  onEditarItem: (id: string) => void;
  onAgregarItem: (prefill?: { categoria_id: string; subcategoria_id: string }) => void;
}

interface GrupoItems {
  key: string;
  categoria: Categoria | null;
  subcategoria: Subcategoria | null;
  total: number;
  items: ItemEditable[];
}

function crearClaveGrupo(categoriaId: string, subcategoriaId: string) {
  if (subcategoriaId) {
    return `sub:${subcategoriaId}`;
  }
  if (categoriaId) {
    return `cat:${categoriaId}`;
  }
  return "sin-categoria";
}

export function TablaItems({ items, categorias, subcategorias, onEditarItem, onAgregarItem }: Props) {
  const categoriasPorId = useMemo(() => new Map(categorias.map((registro) => [registro.id, registro])), [categorias]);
  const subcategoriasPorId = useMemo(
    () => new Map(subcategorias.map((registro) => [registro.id, registro])),
    [subcategorias],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, GrupoItems>();

    for (const item of items) {
      const subcategoriaBase = item.subcategoria_id ? subcategoriasPorId.get(item.subcategoria_id) ?? null : null;
      const categoriaBase = item.categoria_id ? categoriasPorId.get(item.categoria_id) ?? null : null;
      const categoria = categoriaBase ?? (subcategoriaBase ? categoriasPorId.get(subcategoriaBase.categoria_id) ?? null : null);
      const subcategoria = subcategoriaBase && categoria && subcategoriaBase.categoria_id === categoria.id ? subcategoriaBase : null;
      const categoriaId = categoria?.id ?? "";
      const subcategoriaId = subcategoria?.id ?? "";
      const key = crearClaveGrupo(categoriaId, subcategoriaId);
      const existente = mapa.get(key);

      if (!existente) {
        mapa.set(key, {
          key,
          categoria,
          subcategoria,
          total: item.monto_resuelto,
          items: [item],
        });
        continue;
      }

      existente.total += item.monto_resuelto;
      existente.items.push(item);
    }

    return Array.from(mapa.values()).sort((a, b) => {
      if (a.categoria && !b.categoria) {
        return -1;
      }
      if (!a.categoria && b.categoria) {
        return 1;
      }
      if (a.categoria?.id !== b.categoria?.id) {
        return b.total - a.total;
      }
      if (a.subcategoria && !b.subcategoria) {
        return -1;
      }
      if (!a.subcategoria && b.subcategoria) {
        return 1;
      }
      return b.total - a.total;
    });
  }, [categoriasPorId, items, subcategoriasPorId]);

  const total = useMemo(() => items.reduce((acumulado, item) => acumulado + item.monto_resuelto, 0), [items]);

  return (
    <div className="mx-4 mt-2 flex flex-col gap-3 rounded-[28px] border border-gray-100 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2">
        <div className="grid flex-1 grid-cols-[1fr_auto] gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          <span>Detalle</span>
          <span className="text-right">Monto</span>
        </div>
        <button
          type="button"
          onClick={() => onAgregarItem()}
          aria-label="Agregar fila"
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition hover:bg-indigo-200"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {grupos.length ? (
        <>
          {grupos.map((grupo) => {
            const tituloGrupo = grupo.subcategoria?.nombre || grupo.categoria?.nombre || "Sin categoria";
            const subtituloGrupo = grupo.subcategoria && grupo.categoria ? grupo.categoria.nombre : "Items agrupados automaticamente";
            const prefill = {
              categoria_id: grupo.categoria?.id ?? "",
              subcategoria_id: grupo.subcategoria?.id ?? "",
            };

            return (
              <section key={grupo.key} className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-700">{tituloGrupo}</p>
                    <p className="truncate text-[11px] text-gray-500">
                      {grupo.items.length} filas - {formatearPeso(grupo.total)} - {subtituloGrupo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAgregarItem(prefill)}
                    aria-label={`Agregar fila en ${tituloGrupo}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition hover:bg-indigo-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {grupo.items.map((item, indice) => {
                    const itemId = item.id ?? `${grupo.key}-${indice}`;
                    return (
                      <FilaItem
                        key={itemId}
                        item={item}
                        categoria={grupo.categoria}
                        subcategoria={grupo.subcategoria}
                        onAbrir={() => onEditarItem(itemId)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          <button
            type="button"
            onClick={() => onAgregarItem()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Plus className="h-4 w-4" />
            Agregar fila
          </button>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Subtotal ticket</p>
            <p className="font-mono text-base font-bold text-gray-900">{formatearPeso(total)}</p>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center">
          <p className="text-sm font-medium text-gray-500">Todavia no hay filas en el ticket.</p>
          <button
            type="button"
            onClick={() => onAgregarItem()}
            className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Agregar primera fila
          </button>
        </div>
      )}
    </div>
  );
}
