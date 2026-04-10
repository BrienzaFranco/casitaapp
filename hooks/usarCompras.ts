"use client";

import { useEffect, useState } from "react";
import type { Compra, CompraBaseDatos, CompraEditable, Item } from "@/types";
import { crearClienteSupabase } from "@/lib/supabase";

const seleccionCompras = `
  id,
  fecha,
  hogar_id,
  nombre_lugar,
  notas,
  registrado_por,
  creado_en,
  items (
    id,
    compra_id,
    hogar_id,
    categoria_id,
    subcategoria_id,
    descripcion,
    expresion_monto,
    monto_resuelto,
    tipo_reparto,
    pago_franco,
    pago_fabiola,
    creado_en,
    categorias (
      id,
      hogar_id,
      nombre,
      color,
      limite_mensual,
      creado_en
    ),
    subcategorias (
      id,
      categoria_id,
      nombre,
      limite_mensual,
      creado_en
    ),
    item_etiquetas (
      etiqueta_id,
      etiquetas (
        id,
        nombre,
        color
      )
    )
  )
`;

function normalizarItem(item: CompraBaseDatos["items"][number]): Item {
  return {
    id: item.id,
    compra_id: item.compra_id,
    hogar_id: item.hogar_id,
    categoria_id: item.categoria_id,
    subcategoria_id: item.subcategoria_id,
    descripcion: item.descripcion ?? "",
    expresion_monto: item.expresion_monto,
    monto_resuelto: Number(item.monto_resuelto),
    tipo_reparto: item.tipo_reparto,
    pago_franco: Number(item.pago_franco),
    pago_fabiola: Number(item.pago_fabiola),
    creado_en: item.creado_en,
    categoria: item.categorias,
    subcategoria: item.subcategorias,
    etiquetas: item.item_etiquetas
      .map((relacion) => relacion.etiquetas)
      .filter(Boolean) as Item["etiquetas"],
  };
}

function normalizarCompra(compra: CompraBaseDatos): Compra {
  return {
    id: compra.id,
    fecha: compra.fecha,
    hogar_id: compra.hogar_id,
    nombre_lugar: compra.nombre_lugar ?? "",
    notas: compra.notas ?? "",
    registrado_por: compra.registrado_por,
    creado_en: compra.creado_en,
    items: (compra.items ?? []).map(normalizarItem),
  };
}

export function useCompras() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  async function recargar() {
    const cliente = crearClienteSupabase();
    setCargando(true);

    const { data, error } = await cliente.from("compras").select(seleccionCompras).order("fecha", {
      ascending: false,
    });

    if (error) {
      setCargando(false);
      throw error;
    }

    const registros = (data ?? []) as CompraBaseDatos[];
    setCompras(registros.map(normalizarCompra));
    setCargando(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar();
  }, []);

  async function guardarCompra(compra: CompraEditable) {
    const cliente = crearClienteSupabase();
    setGuardando(true);

    const payload = {
      p_fecha: compra.fecha,
      p_nombre_lugar: compra.nombre_lugar || null,
      p_notas: compra.notas || null,
      p_registrado_por: compra.registrado_por,
      p_hogar_id: compra.hogar_id ?? null,
      p_items: compra.items.map((item) => ({
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

    const respuesta = compra.id
      ? await cliente.rpc("actualizar_compra_completa", { ...payload, p_compra_id: compra.id })
      : await cliente.rpc("crear_compra_completa", payload);

    setGuardando(false);

    if (respuesta.error) {
      throw respuesta.error;
    }

    await recargar();
    return respuesta.data as string;
  }

  async function eliminarCompra(id: string) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("compras").delete().eq("id", id);

    if (error) {
      throw error;
    }

    await recargar();
  }

  return {
    compras,
    cargando,
    guardando,
    recargar,
    guardarCompra,
    eliminarCompra,
  };
}

export const usarCompras = useCompras;
