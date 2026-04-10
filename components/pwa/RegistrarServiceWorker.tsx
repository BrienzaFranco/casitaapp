"use client";

import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void (async () => {
      const registros = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registros.map((registro) => registro.unregister()));

      if ("caches" in window) {
        const claves = await caches.keys();
        await Promise.all(claves.map((clave) => caches.delete(clave)));
      }
    })();
  }, []);

  return null;
}
