"use client";

import { useEffect, useState } from "react";
import type { Categoria, Etiqueta, Subcategoria } from "@/types";
import { crearClienteSupabase } from "@/lib/supabase";

interface EstadoCategorias {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  cargando: boolean;
}

export function useCategorias() {
  const [estado, setEstado] = useState<EstadoCategorias>({
    categorias: [],
    subcategorias: [],
    etiquetas: [],
    cargando: true,
  });

  async function recargar() {
    const cliente = crearClienteSupabase();
    const [categorias, subcategorias, etiquetas] = await Promise.all([
      cliente.from("categorias").select("*").order("nombre"),
      cliente.from("subcategorias").select("*").order("nombre"),
      cliente.from("etiquetas").select("*").order("nombre"),
    ]);

    setEstado({
      categorias: categorias.data ?? [],
      subcategorias: subcategorias.data ?? [],
      etiquetas: etiquetas.data ?? [],
      cargando: false,
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar();
  }, []);

  async function crearCategoria(input: Pick<Categoria, "nombre" | "color" | "limite_mensual">) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("categorias").insert(input);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function actualizarCategoria(
    id: string,
    cambios: Partial<Pick<Categoria, "nombre" | "color" | "limite_mensual">>,
  ) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("categorias").update(cambios).eq("id", id);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function eliminarCategoria(id: string) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("categorias").delete().eq("id", id);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function crearSubcategoria(input: Pick<Subcategoria, "categoria_id" | "nombre" | "limite_mensual">) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("subcategorias").insert(input);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function actualizarSubcategoria(
    id: string,
    cambios: Partial<Pick<Subcategoria, "categoria_id" | "nombre" | "limite_mensual">>,
  ) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("subcategorias").update(cambios).eq("id", id);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function eliminarSubcategoria(id: string) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("subcategorias").delete().eq("id", id);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function crearEtiqueta(input: Pick<Etiqueta, "nombre" | "color">) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("etiquetas").insert(input);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function actualizarEtiqueta(id: string, cambios: Partial<Pick<Etiqueta, "nombre" | "color">>) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("etiquetas").update(cambios).eq("id", id);

    if (error) {
      throw error;
    }

    await recargar();
  }

  async function eliminarEtiqueta(id: string) {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("etiquetas").delete().eq("id", id);

    if (error) {
      throw error;
    }

    await recargar();
  }

  return {
    ...estado,
    recargar,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    crearSubcategoria,
    actualizarSubcategoria,
    eliminarSubcategoria,
    crearEtiqueta,
    actualizarEtiqueta,
    eliminarEtiqueta,
  };
}

export const usarCategorias = useCategorias;
