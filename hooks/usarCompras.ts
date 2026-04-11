"use client";

import { useCallback, useEffect, useState } from "react";
import type { Compra, CompraBaseDatos, CompraEditable, Item } from "@/types";
import { crearClienteSupabase } from "@/lib/supabase";

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
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(cargarInicial);
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    const cliente = crearClienteSupabase();
    setCargando(true);

    let consulta = cliente.from("compras").select(seleccionCompras).order("fecha", {
      ascending: false,
    });

    if (!incluirBorradores) {
      consulta = consulta.neq("estado", "borrador");
    }

    const { data, error } = await consulta;

    if (error) {
      setCargando(false);
      throw error;
    }

    const registros = (data ?? []) as CompraBaseDatos[];
    setCompras(registros.map(normalizarCompra));
    setCargando(false);
  }, [incluirBorradores]);

  useEffect(() => {
    if (!cargarInicial) {
      setCargando(false);
      return;
    }

    // Stagger initial load to avoid auth lock contention with other hooks
    const timer = setTimeout(() => { void recargar(); }, 150);
    return () => clearTimeout(timer);
  }, [cargarInicial, recargar]);

  async function guardarCompra(compra: CompraEditable) {
    const cliente = crearClienteSupabase();
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
        ? await cliente.rpc("guardar_compra_borrador", { ...payload, p_compra_id: compraIdValido })
        : compraIdValido
          ? await cliente.rpc("actualizar_compra_completa", { ...payload, p_compra_id: compraIdValido })
          : await cliente.rpc("crear_compra_completa", payload);

      if (respuesta.error) {
        throw respuesta.error;
      }

      if (cargarInicial) {
        await recargar();
      }

      return respuesta.data as string;
    } finally {
      setGuardando(false);
    }
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
