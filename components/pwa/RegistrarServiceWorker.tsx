"use client";

import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void (async () => {
      try {
        const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await registro.update();
      } catch (error) {
        console.error("No se pudo registrar el service worker", error);
      }
    })();
  }, []);

  return null;
}
