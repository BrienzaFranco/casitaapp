"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SettlementCut } from "@/types";
import { supabase } from "@/lib/supabase";

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
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);

  const { data: cortes = [], isLoading } = useQuery<SettlementCut[]>({
    queryKey: ["settlement_cuts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlement_cuts")
        .select("*")
        .order("fecha_corte", { ascending: false })
        .order("creado_en", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SettlementCut[];
    },
    enabled: cargarInicial && !!(queryClient.getQueryData(["usuario"]) as { usuarioId: string | null } | undefined)?.usuarioId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (count, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) return count < 2;
      return false;
    },
  });

  const recargar = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["settlement_cuts"] });
  }, [queryClient]);

  const corteActivo = useMemo(
    () => cortes.find((corte) => corte.activo) ?? null,
    [cortes],
  );

  async function crearCorte(input: CrearCorteInput) {
    setGuardando(true);

    try {
      let limpiarActivos = supabase.from("settlement_cuts").update({ activo: false }).eq("activo", true);

      if (input.hogar_id) {
        limpiarActivos = limpiarActivos.eq("hogar_id", input.hogar_id);
      }

      const limpiar = await limpiarActivos;
      if (limpiar.error) {
        throw limpiar.error;
      }

      const { error } = await supabase.from("settlement_cuts").insert({
        fecha_corte: input.fecha_corte,
        nota: input.nota ?? "",
        hogar_id: input.hogar_id ?? null,
        actualizado_por: input.actualizado_por,
        activo: true,
      });

      if (error) {
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["settlement_cuts"] });
    } finally {
      setGuardando(false);
    }
  }

  return {
    cortes,
    corteActivo,
    cargando: isLoading,
    guardando,
    recargar,
    crearCorte,
  };
}

export const usarSettlementCuts = useSettlementCuts;
