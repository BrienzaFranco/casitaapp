"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import type { Categoria, Etiqueta, ItemEditable, Subcategoria } from "@/types";
import { Boton } from "@/components/ui/Boton";
import { ChipEtiqueta } from "@/components/ui/ChipEtiqueta";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatearPeso } from "@/lib/formatear";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";

const itemVacio: ItemEditable = {
  descripcion: "",
  categoria_id: "",
  subcategoria_id: "",
  expresion_monto: "",
  monto_resuelto: 0,
  tipo_reparto: "50/50",
  pago_franco: 0,
  pago_fabiola: 0,
  etiquetas_ids: [],
};

function resolverItem(item: ItemEditable) {
  if (!item.expresion_monto) {
    return {
      item: {
        ...item,
        monto_resuelto: 0,
      },
      error: "",
    };
  }

  try {
    const monto = evaluarExpresion(item.expresion_monto);
    const siguiente = {
      ...item,
      monto_resuelto: monto,
    };

    if (item.tipo_reparto !== "personalizado") {
      const reparto = calcularReparto(item.tipo_reparto, monto);
      siguiente.pago_franco = reparto.pago_franco;
      siguiente.pago_fabiola = reparto.pago_fabiola;
    }

    return {
      item: siguiente,
      error: "",
    };
  } catch {
    return {
      item: {
        ...item,
        monto_resuelto: 0,
      },
      error: "La expresion no es valida.",
    };
  }
}

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  nombres: { franco: string; fabiola: string };
  itemEditando: ItemEditable | null;
  onGuardarItem: (item: ItemEditable) => void;
  onCancelarEdicion: () => void;
}

export function FormularioItem({
  categorias,
  subcategorias,
  etiquetas,
  nombres,
  itemEditando,
  onGuardarItem,
  onCancelarEdicion,
}: Props) {
  const estadoInicial = resolverItem(itemEditando ?? itemVacio);
  const [item, setItem] = useState<ItemEditable>(estadoInicial.item);
  const [errorMonto, setErrorMonto] = useState(estadoInicial.error);
  const [sacudirMonto, setSacudirMonto] = useState(false);

  const subcategoriasFiltradas = subcategorias.filter((subcategoria) => subcategoria.categoria_id === item.categoria_id);

  function actualizarCampo<K extends keyof ItemEditable>(campo: K, valor: ItemEditable[K]) {
    const siguiente = {
      ...item,
      [campo]: valor,
    };

    if (campo === "categoria_id") {
      siguiente.subcategoria_id = "";
    }

    const resuelto = resolverItem(siguiente);
    setItem(resuelto.item);
    setErrorMonto(resuelto.error);
  }

  function alternarEtiqueta(id: string) {
    setItem((anterior) => ({
      ...anterior,
      etiquetas_ids: anterior.etiquetas_ids.includes(id)
        ? anterior.etiquetas_ids.filter((etiquetaId) => etiquetaId !== id)
        : [...anterior.etiquetas_ids, id],
    }));
  }

  function confirmar() {
    if (!item.categoria_id || !item.expresion_monto || !!errorMonto) {
      setSacudirMonto(true);
      window.setTimeout(() => setSacudirMonto(false), 400);
      return;
    }

    onGuardarItem(item);
    const resuelto = resolverItem(itemVacio);
    setItem(resuelto.item);
    setErrorMonto(resuelto.error);
  }

  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Paso 2: agregar item</h2>
          <p className="text-sm text-gray-500">Carga rapida y expandible solo cuando hace falta.</p>
        </div>
        {itemEditando ? (
          <button type="button" onClick={onCancelarEdicion} className="text-sm font-semibold text-gray-500">
            Cancelar
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        <Input
          etiqueta="Descripcion"
          value={item.descripcion}
          onChange={(event) => actualizarCampo("descripcion", event.target.value)}
          placeholder="Ej: compra semanal"
        />

        <Select
          etiqueta="Categoria"
          value={item.categoria_id}
          onChange={(event) => actualizarCampo("categoria_id", event.target.value)}
          placeholder="Elegi una categoria"
          opciones={categorias.map((categoria) => ({
            etiqueta: categoria.nombre,
            valor: categoria.id,
          }))}
        />

        {item.categoria_id ? (
          <Select
            etiqueta="Subcategoria"
            value={item.subcategoria_id}
            onChange={(event) => actualizarCampo("subcategoria_id", event.target.value)}
            placeholder="Opcional"
            opciones={subcategoriasFiltradas.map((subcategoria) => ({
              etiqueta: subcategoria.nombre,
              valor: subcategoria.id,
            }))}
          />
        ) : null}

        <div className={sacudirMonto ? "animar-sacudida" : ""}>
          <Input
            etiqueta="Monto"
            value={item.expresion_monto}
            onChange={(event) => actualizarCampo("expresion_monto", event.target.value)}
            placeholder="Ej: 4000-521+200"
            ayuda={
              errorMonto
                ? errorMonto
                : item.expresion_monto
                  ? `= ${formatearPeso(item.monto_resuelto)}`
                  : "Acepta expresiones aritmeticas"
            }
            error={errorMonto || undefined}
          />
        </div>

        <details className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">Reparto y etiquetas</summary>
          <div className="mt-4 space-y-4">
            <Select
              etiqueta="Tipo de reparto"
              value={item.tipo_reparto}
              onChange={(event) => actualizarCampo("tipo_reparto", event.target.value as ItemEditable["tipo_reparto"])}
              opciones={[
                { etiqueta: "50/50", valor: "50/50" },
                { etiqueta: `Solo ${nombres.franco}`, valor: "solo_franco" },
                { etiqueta: `Solo ${nombres.fabiola}`, valor: "solo_fabiola" },
                { etiqueta: "Personalizado", valor: "personalizado" },
              ]}
            />

            {item.tipo_reparto === "personalizado" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  etiqueta={`Cuanto paga ${nombres.franco}`}
                  type="number"
                  inputMode="decimal"
                  value={String(item.pago_franco || "")}
                  onChange={(event) => actualizarCampo("pago_franco", Number(event.target.value || 0))}
                />
                <Input
                  etiqueta={`Cuanto paga ${nombres.fabiola}`}
                  type="number"
                  inputMode="decimal"
                  value={String(item.pago_fabiola || "")}
                  onChange={(event) => actualizarCampo("pago_fabiola", Number(event.target.value || 0))}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Etiquetas</p>
              <div className="flex flex-wrap gap-2">
                {etiquetas.map((etiqueta) => (
                  <ChipEtiqueta
                    key={etiqueta.id}
                    nombre={etiqueta.nombre}
                    color={etiqueta.color}
                    activa={item.etiquetas_ids.includes(etiqueta.id)}
                    onClick={() => alternarEtiqueta(etiqueta.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </details>

        <Boton
          anchoCompleto
          onClick={confirmar}
          icono={itemEditando ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        >
          {itemEditando ? "Actualizar item" : "Agregar otro item"}
        </Boton>
      </div>
    </section>
  );
}
