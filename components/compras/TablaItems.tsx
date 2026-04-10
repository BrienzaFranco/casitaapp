"use client";

import type { Categoria, ItemEditable, Subcategoria } from "@/types";
import { FilaItem } from "@/components/compras/FilaItem";

interface Props {
  items: ItemEditable[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  onEditarItem: (id: string) => void;
}

export function TablaItems({ items, categorias, subcategorias, onEditarItem }: Props) {
  return (
    <div className="mx-4 mt-2 flex flex-col gap-3 rounded-[28px] border border-gray-100 bg-white p-2 shadow-sm">
      {items.length ? (
        items.map((item) => {
          const categoria = categorias.find((registro) => registro.id === item.categoria_id) ?? null;
          const subcategoria = subcategorias.find((registro) => registro.id === item.subcategoria_id) ?? null;

          return (
            <FilaItem
              key={item.id}
              item={item}
              categoria={categoria}
              subcategoria={subcategoria}
              onAbrir={() => onEditarItem(item.id as string)}
            />
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-500">
          Todavia no hay items. Toca + para cargar el primero.
        </div>
      )}
    </div>
  );
}
