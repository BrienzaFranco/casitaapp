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

  if (!cantidad) return null;

  return (
    <div className="sticky top-14 z-20 px-4 pt-2">
      <div className="mx-auto max-w-xl rounded-lg bg-secondary-fixed/60 border border-secondary/15 px-3 py-2.5 font-label text-sm font-bold text-on-secondary-container">
        {cantidad} compras pendientes de sincronizar
      </div>
    </div>
  );
}
