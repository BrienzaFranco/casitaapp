"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import type { CompraEditable } from "@/types";
import {
  guardarPendiente,
  obtenerComprasPendientes,
  reemplazarPendientes,
} from "@/lib/offline";

interface ResultadoGuardado {
  pendiente: boolean;
}

export function useOffline(guardarRemoto: (compra: CompraEditable) => Promise<unknown>) {
  const [cantidadPendientes, setCantidadPendientes] = useState(() =>
    typeof window === "undefined" ? 0 : obtenerComprasPendientes().length,
  );

  const sincronizarPendientes = useEffectEvent(async () => {
    const pendientes = obtenerComprasPendientes();

    if (!pendientes.length || (typeof navigator !== "undefined" && !navigator.onLine)) {
      setCantidadPendientes(pendientes.length);
      return 0;
    }

    const restantes: CompraEditable[] = [];
    let sincronizadas = 0;

    for (const compra of pendientes) {
      try {
        await guardarRemoto(compra);
        sincronizadas += 1;
      } catch {
        restantes.push(compra);
      }
    }

    reemplazarPendientes(restantes);
    setCantidadPendientes(restantes.length);

    if (sincronizadas > 0) {
      toast.success(`${sincronizadas} compras sincronizadas`);
    }

    return sincronizadas;
  });

  useEffect(() => {
    function manejarOnline() {
      void sincronizarPendientes();
    }

    window.addEventListener("online", manejarOnline);
    return () => {
      window.removeEventListener("online", manejarOnline);
    };
  }, []);

  async function guardarConFallback(compra: CompraEditable): Promise<ResultadoGuardado> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      guardarPendiente(compra);
      const cantidad = obtenerComprasPendientes().length;
      setCantidadPendientes(cantidad);
      toast.warning("Sin conexion. La compra quedo pendiente para sincronizar.");
      return { pendiente: true };
    }

    try {
      await guardarRemoto(compra);
      return { pendiente: false };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message.toLowerCase() : "";

      if (mensaje.includes("network") || mensaje.includes("fetch")) {
        guardarPendiente(compra);
        const cantidad = obtenerComprasPendientes().length;
        setCantidadPendientes(cantidad);
        toast.warning("No se pudo conectar. La compra quedo pendiente para sincronizar.");
        return { pendiente: true };
      }

      throw error;
    }
  }

  return {
    cantidadPendientes,
    guardarConFallback,
  };
}

export const usarOffline = useOffline;
