"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SettlementCut } from "@/types";
import { crearClienteSupabase } from "@/lib/supabase";

interface OpcionesSettlementCuts {
  cargarInicial?: boolean;
}

interface CrearCorteInput {
  fecha_corte: string;
  nota?: string;
  hogar_id?: string | null;
  actualizado_por: string;
}

export function useSettlementCuts(opciones: OpcionesSettlementCuts = {}) {
  const { cargarInicial = true } = opciones;
  const [cortes, setCortes] = useState<SettlementCut[]>([]);
  const [cargando, setCargando] = useState(cargarInicial);
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    const cliente = crearClienteSupabase();
    setCargando(true);

    const { data, error } = await cliente
      .from("settlement_cuts")
      .select("*")
      .order("fecha_corte", { ascending: false })
      .order("creado_en", { ascending: false });

    if (error) {
      setCargando(false);
      throw error;
    }

    setCortes((data ?? []) as SettlementCut[]);
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!cargarInicial) {
      setCargando(false);
      return;
    }

    // Stagger initial load to avoid auth lock contention with other hooks
    const timer = setTimeout(() => { void recargar(); }, 250);
    return () => clearTimeout(timer);
  }, [cargarInicial, recargar]);

  const corteActivo = useMemo(
    () => cortes.find((corte) => corte.activo) ?? null,
    [cortes],
  );

  async function crearCorte(input: CrearCorteInput) {
    const cliente = crearClienteSupabase();
    setGuardando(true);

    try {
      let limpiarActivos = cliente.from("settlement_cuts").update({ activo: false }).eq("activo", true);

      if (input.hogar_id) {
        limpiarActivos = limpiarActivos.eq("hogar_id", input.hogar_id);
      }

      const limpiar = await limpiarActivos;
      if (limpiar.error) {
        throw limpiar.error;
      }

      const { error } = await cliente.from("settlement_cuts").insert({
        fecha_corte: input.fecha_corte,
        nota: input.nota ?? "",
        hogar_id: input.hogar_id ?? null,
        actualizado_por: input.actualizado_por,
        activo: true,
      });

      if (error) {
        throw error;
      }

      await recargar();
    } finally {
      setGuardando(false);
    }
  }

  return {
    cortes,
    corteActivo,
    cargando,
    guardando,
    recargar,
    crearCorte,
  };
}

export const usarSettlementCuts = useSettlementCuts;
