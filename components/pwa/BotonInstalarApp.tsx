"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function esDispositivoMovil() {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function BotonInstalarApp() {
  const [eventoInstalacion, setEventoInstalacion] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [esMovil, setEsMovil] = useState(true);

  useEffect(() => {
    setEsMovil(esDispositivoMovil());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setEventoInstalacion(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalada(true);
      setEventoInstalacion(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    if (!eventoInstalacion) {
      return;
    }

    await eventoInstalacion.prompt();
    const eleccion = await eventoInstalacion.userChoice;
    if (eleccion.outcome === "accepted") {
      setEventoInstalacion(null);
    }
  }

  if (!esMovil) {
    return null;
  }

  if (instalada) {
    return <span className="text-xs font-medium text-gray-500">App instalada</span>;
  }

  if (eventoInstalacion) {
    return (
      <button
        type="button"
        onClick={() => void instalar()}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
      >
        <Download className="h-4 w-4" />
        Instalar app
      </button>
    );
  }

  return (
    <span className="text-[11px] text-gray-500">
      Android: menu &rarr; Instalar app
    </span>
  );
}