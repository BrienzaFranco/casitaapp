"use client";

import { useCallback, useEffect, useState } from "react";
import type { Categoria, Etiqueta, Subcategoria } from "@/types";
import { crearClienteSupabase } from "@/lib/supabase";

interface EstadoCategorias {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  cargando: boolean;
  cargandoCategorias: boolean;
  cargandoSubcategorias: boolean;
  cargandoEtiquetas: boolean;
}

const categoriasBasicas = [
  { nombre: "Alimentos", color: "#10b981", limite_mensual: null },
  { nombre: "Transporte", color: "#f59e0b", limite_mensual: null },
  { nombre: "Servicios", color: "#8b5cf6", limite_mensual: null },
  { nombre: "Salud", color: "#ef4444", limite_mensual: null },
  { nombre: "Hogar", color: "#6366f1", limite_mensual: null },
  { nombre: "Entretenimiento", color: "#14b8a6", limite_mensual: null },
  { nombre: "Otros", color: "#6b7280", limite_mensual: null },
] as const;

function recalcularCargando(estado: Omit<EstadoCategorias, "cargando">) {
  return estado.cargandoCategorias || estado.cargandoSubcategorias || estado.cargandoEtiquetas;
}

export function useCategorias() {
  const [estado, setEstado] = useState<EstadoCategorias>({
    categorias: [],
    subcategorias: [],
    etiquetas: [],
    cargando: true,
    cargandoCategorias: true,
    cargandoSubcategorias: true,
    cargandoEtiquetas: true,
  });

  const actualizarEstado = useCallback((cambios: Partial<Omit<EstadoCategorias, "cargando">>) => {
    setEstado((anterior) => {
      const base = {
        categorias: cambios.categorias ?? anterior.categorias,
        subcategorias: cambios.subcategorias ?? anterior.subcategorias,
        etiquetas: cambios.etiquetas ?? anterior.etiquetas,
        cargandoCategorias: cambios.cargandoCategorias ?? anterior.cargandoCategorias,
        cargandoSubcategorias: cambios.cargandoSubcategorias ?? anterior.cargandoSubcategorias,
        cargandoEtiquetas: cambios.cargandoEtiquetas ?? anterior.cargandoEtiquetas,
      };

      return {
        ...base,
        cargando: recalcularCargando(base),
      };
    });
  }, []);

  const recargar = useCallback(async () => {
    const cliente = crearClienteSupabase();

    actualizarEstado({
      cargandoCategorias: true,
      cargandoSubcategorias: true,
      cargandoEtiquetas: true,
    });

    const consultas = await Promise.allSettled([
      cliente.from("categorias").select("*").order("nombre"),
      cliente.from("subcategorias").select("*").order("nombre"),
      cliente.from("etiquetas").select("*").order("nombre"),
    ]);

    const [categorias, subcategorias, etiquetas] = consultas;
    const errores: Error[] = [];

    if (categorias.status === "fulfilled") {
      if (categorias.value.error) {
        errores.push(categorias.value.error);
      } else {
        actualizarEstado({
          categorias: categorias.value.data ?? [],
        });
      }
    } else {
      errores.push(categorias.reason as Error);
    }

    actualizarEstado({ cargandoCategorias: false });

    if (subcategorias.status === "fulfilled") {
      if (subcategorias.value.error) {
        errores.push(subcategorias.value.error);
      } else {
        actualizarEstado({
          subcategorias: subcategorias.value.data ?? [],
        });
      }
    } else {
      errores.push(subcategorias.reason as Error);
    }

    actualizarEstado({ cargandoSubcategorias: false });

    if (etiquetas.status === "fulfilled") {
      if (etiquetas.value.error) {
        errores.push(etiquetas.value.error);
      } else {
        actualizarEstado({
          etiquetas: etiquetas.value.data ?? [],
        });
      }
    } else {
      errores.push(etiquetas.reason as Error);
    }

    actualizarEstado({ cargandoEtiquetas: false });

    if (errores.length) {
      throw errores[0];
    }
  }, [actualizarEstado]);

  useEffect(() => {
    // Stagger initial load to avoid auth lock contention with other hooks
    const timer = setTimeout(() => { void recargar(); }, 600);
    return () => clearTimeout(timer);
  }, [recargar]);

  async function crearCategoria(input: Pick<Categoria, "nombre" | "color" | "limite_mensual">) {
    const cliente = crearClienteSupabase();
    const { data, error } = await cliente.from("categorias").insert(input).select("*").single();

    if (error) {
      throw error;
    }

    await recargar();
    return data as Categoria;
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
    const { data, error } = await cliente.from("subcategorias").insert(input).select("*").single();

    if (error) {
      throw error;
    }

    await recargar();
    return data as Subcategoria;
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
    const { data, error } = await cliente.from("etiquetas").insert(input).select("*").single();

    if (error) {
      throw error;
    }

    await recargar();
    return data as Etiqueta;
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

  async function crearCategoriasBasicas() {
    const cliente = crearClienteSupabase();
    const { error } = await cliente.from("categorias").upsert(categoriasBasicas, {
      onConflict: "nombre",
      ignoreDuplicates: true,
    });

    if (error) {
      throw error;
    }

    await recargar();
    return categoriasBasicas.length;
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
    crearCategoriasBasicas,
  };
}

export const usarCategorias = useCategorias;
