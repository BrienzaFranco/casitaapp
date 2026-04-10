"use client";

import { useEffect, useState } from "react";
import { obtenerComprasPendientes } from "@/lib/offline";

export function BannerPendientes() {
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    function actualizar() {
      setCantidad(obtenerComprasPendientes().length);
    }

    actualizar();
    window.addEventListener("storage", actualizar);
    window.addEventListener("online", actualizar);
    window.addEventListener("pendientes-actualizados", actualizar);

    return () => {
      window.removeEventListener("storage", actualizar);
      window.removeEventListener("online", actualizar);
      window.removeEventListener("pendientes-actualizados", actualizar);
    };
  }, []);

  if (!cantidad) {
    return null;
  }

  return (
    <div className="sticky top-3 z-20 rounded-2xl border border-amber-200 bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
      {cantidad} compras pendientes de sincronizar
    </div>
  );
}
