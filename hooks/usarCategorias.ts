"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Categoria, Etiqueta, Subcategoria } from "@/types";
import { supabase } from "@/lib/supabase";

const categoriasBasicas = [
  { nombre: "Alimentos", color: "#10b981", limite_mensual: null },
  { nombre: "Transporte", color: "#f59e0b", limite_mensual: null },
  { nombre: "Servicios", color: "#8b5cf6", limite_mensual: null },
  { nombre: "Salud", color: "#ef4444", limite_mensual: null },
  { nombre: "Hogar", color: "#6366f1", limite_mensual: null },
  { nombre: "Entretenimiento", color: "#14b8a6", limite_mensual: null },
  { nombre: "Otros", color: "#6b7280", limite_mensual: null },
] as const;

export function useCategorias() {
  const queryClient = useQueryClient();

  const { data: categorias = [], isLoading: cargandoCategorias } = useQuery<Categoria[]>({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: (count, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) return count < 2;
      return false;
    },
  });

  const { data: subcategorias = [], isLoading: cargandoSubcategorias } = useQuery<Subcategoria[]>({
    queryKey: ["subcategorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subcategorias").select("*").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: (count, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) return count < 2;
      return false;
    },
  });

  const { data: etiquetas = [], isLoading: cargandoEtiquetas } = useQuery<Etiqueta[]>({
    queryKey: ["etiquetas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("etiquetas").select("*").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: (count, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) return count < 2;
      return false;
    },
  });

  const cargando = cargandoCategorias || cargandoSubcategorias || cargandoEtiquetas;

  const recargar = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["categorias"] });
    await queryClient.invalidateQueries({ queryKey: ["subcategorias"] });
    await queryClient.invalidateQueries({ queryKey: ["etiquetas"] });
  }, [queryClient]);

  async function crearCategoria(input: Pick<Categoria, "nombre" | "color" | "limite_mensual">) {
    const { data, error } = await supabase.from("categorias").insert(input).select("*").single();
    if (error) throw error;
    await recargar();
    return data as Categoria;
  }

  async function actualizarCategoria(
    id: string,
    cambios: Partial<Pick<Categoria, "nombre" | "color" | "limite_mensual">>,
  ) {
    const { error } = await supabase.from("categorias").update(cambios).eq("id", id);
    if (error) throw error;
    await recargar();
  }

  async function eliminarCategoria(id: string) {
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) throw error;
    await recargar();
  }

  async function crearSubcategoria(input: Pick<Subcategoria, "categoria_id" | "nombre" | "limite_mensual">) {
    const { data, error } = await supabase.from("subcategorias").insert(input).select("*").single();
    if (error) throw error;
    await recargar();
    return data as Subcategoria;
  }

  async function actualizarSubcategoria(
    id: string,
    cambios: Partial<Pick<Subcategoria, "categoria_id" | "nombre" | "limite_mensual">>,
  ) {
    const { error } = await supabase.from("subcategorias").update(cambios).eq("id", id);
    if (error) throw error;
    await recargar();
  }

  async function eliminarSubcategoria(id: string) {
    const { error } = await supabase.from("subcategorias").delete().eq("id", id);
    if (error) throw error;
    await recargar();
  }

  async function crearEtiqueta(input: Pick<Etiqueta, "nombre" | "color">) {
    const { data, error } = await supabase.from("etiquetas").insert(input).select("*").single();
    if (error) throw error;
    await recargar();
    return data as Etiqueta;
  }

  async function actualizarEtiqueta(id: string, cambios: Partial<Pick<Etiqueta, "nombre" | "color">>) {
    const { error } = await supabase.from("etiquetas").update(cambios).eq("id", id);
    if (error) throw error;
    await recargar();
  }

  async function eliminarEtiqueta(id: string) {
    const { error } = await supabase.from("etiquetas").delete().eq("id", id);
    if (error) throw error;
    await recargar();
  }

  async function crearCategoriasBasicas() {
    const { error } = await supabase.from("categorias").upsert(categoriasBasicas, {
      onConflict: "nombre",
      ignoreDuplicates: true,
    });
    if (error) throw error;
    await recargar();
    return categoriasBasicas.length;
  }

  return {
    categorias,
    subcategorias,
    etiquetas,
    cargando,
    cargandoCategorias,
    cargandoSubcategorias,
    cargandoEtiquetas,
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
    crearCategoriasBasicas,
  };
}

export const usarCategorias = useCategorias;
