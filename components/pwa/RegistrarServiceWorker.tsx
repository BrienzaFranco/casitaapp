"use client";

import { useEffect, useRef } from "react";

export function RegistrarServiceWorker() {
  const refrescoPendiente = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        registro.addEventListener("updatefound", () => {
          const nuevo = registro.installing;
          if (!nuevo) return;
          nuevo.addEventListener("statechange", () => {
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              refrescoPendiente.current = true;
            }
          });
        });

        let refrescando = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refrescando) return;
          refrescando = true;
          window.location.reload();
        });

        await registro.update();
      } catch {
        // El SW no se pudo registrar, la app funciona igual
      }
    })();
  }, []);

  return null;
}
