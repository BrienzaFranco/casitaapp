"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Compra, CompraBaseDatos, CompraEditable, Item } from "@/types";
import { supabase } from "@/lib/supabase";

const seleccionCompras = `
  id,
  fecha,
  hogar_id,
  nombre_lugar,
  notas,
  registrado_por,
  pagador_general,
  estado,
  creado_en,
  compra_etiquetas (
    etiqueta_id,
    etiquetas (
      id,
      nombre,
      color
    )
  ),
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

interface OpcionesCompras {
  cargarInicial?: boolean;
  incluirBorradores?: boolean;
}

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
    pagador_general: compra.pagador_general ?? "compartido",
    estado: compra.estado ?? "confirmada",
    creado_en: compra.creado_en,
    etiquetas_compra: (compra.compra_etiquetas ?? [])
      .map((relacion) => relacion.etiquetas)
      .filter(Boolean) as Compra["etiquetas_compra"],
    items: (compra.items ?? []).map(normalizarItem),
  };
}

export function useCompras(opciones: OpcionesCompras = {}) {
  const { cargarInicial = true, incluirBorradores = false } = opciones;
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);

  const { data: compras = [], isLoading, isFetching, refetch } = useQuery<Compra[]>({
    queryKey: ["compras", incluirBorradores],
    queryFn: async () => {
      let consulta = supabase.from("compras").select(seleccionCompras).order("fecha", {
        ascending: false,
      });

      if (!incluirBorradores) {
        consulta = consulta.neq("estado", "borrador");
      }

      const { data, error } = await consulta;
      if (error) throw error;

      const registros = (data ?? []) as unknown as CompraBaseDatos[];
      return registros.map(normalizarCompra);
    },
    enabled: cargarInicial,
    staleTime: 1000 * 60 * 2, // 2 min — compras change frequently
    refetchOnWindowFocus: false,
    retry: (count, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) return count < 2;
      return false;
    },
  });

  const recargar = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["compras"] });
  }, [queryClient]);

  async function guardarCompra(compra: CompraEditable) {
    setGuardando(true);
    const compraIdValido = compra.id && !compra.id.startsWith("tmp-") ? compra.id : null;

    const payload = {
      p_fecha: compra.fecha,
      p_nombre_lugar: compra.nombre_lugar || null,
      p_notas: compra.notas || null,
      p_registrado_por: compra.registrado_por,
      p_hogar_id: compra.hogar_id ?? null,
      p_pagador_general: compra.pagador_general ?? "compartido",
      p_etiquetas_compra_ids: compra.etiquetas_compra_ids ?? [],
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

    try {
      const respuesta = compra.estado === "borrador"
        ? await supabase.rpc("guardar_compra_borrador", { ...payload, p_compra_id: compraIdValido })
        : compraIdValido
          ? await supabase.rpc("actualizar_compra_completa", { ...payload, p_compra_id: compraIdValido })
          : await supabase.rpc("crear_compra_completa", payload);

      if (respuesta.error) {
        throw respuesta.error;
      }

      await queryClient.invalidateQueries({ queryKey: ["compras"] });
      return respuesta.data as string;
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCompra(id: string) {
    const { error } = await supabase.from("compras").delete().eq("id", id);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["compras"] });
  }

  return {
    compras,
    cargando: isLoading || isFetching,
    guardando,
    recargar,
    guardarCompra,
    eliminarCompra,
  };
}

export const usarCompras = useCompras;
