"use client";

import { useEffect, useState } from "react";
import { Download, MonitorSmartphone, Share2 } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function detectarStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectarIos() {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function BotonInstalarApp() {
  const [eventoInstalacion, setEventoInstalacion] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(detectarStandalone);
  const [esIos] = useState(detectarIos);

  useEffect(() => {
    function manejarBeforeInstallPrompt(evento: Event) {
      evento.preventDefault();
      setEventoInstalacion(evento as BeforeInstallPromptEvent);
    }

    function manejarInstalacion() {
      setInstalada(true);
      setEventoInstalacion(null);
    }

    window.addEventListener("beforeinstallprompt", manejarBeforeInstallPrompt);
    window.addEventListener("appinstalled", manejarInstalacion);

    return () => {
      window.removeEventListener("beforeinstallprompt", manejarBeforeInstallPrompt);
      window.removeEventListener("appinstalled", manejarInstalacion);
    };
  }, []);

  async function instalar() {
    if (!eventoInstalacion) {
      return;
    }

    await eventoInstalacion.prompt();
    const resultado = await eventoInstalacion.userChoice;

    if (resultado.outcome === "accepted") {
      setInstalada(true);
    }

    setEventoInstalacion(null);
  }

  if (instalada) {
    return (
      <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <MonitorSmartphone className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">La app ya está lista en este dispositivo</p>
            <p className="text-emerald-800/80">Podés abrir CasitaApp desde tu pantalla principal o escritorio.</p>
          </div>
        </div>
      </div>
    );
  }

  if (eventoInstalacion) {
    return (
      <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-950">Instalar app</p>
          <p className="text-sm text-[var(--muted)]">
            Instalá CasitaApp para abrirla como app independiente y tener acceso más rápido desde el celu.
          </p>
        </div>
        <Boton anchoCompleto icono={<Download className="h-4 w-4" />} onClick={() => void instalar()}>
          Instalar CasitaApp
        </Boton>
      </div>
    );
  }

  if (esIos) {
    return (
      <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-950">Instalar app en iPhone o iPad</p>
          <p className="text-sm text-[var(--muted)]">
            En Safari tocá Compartir y después elegí Agregar a pantalla de inicio.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
          <Share2 className="h-4 w-4 text-blue-600" />
          <span>Safari → Compartir → Agregar a pantalla de inicio</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-950">Instalación no disponible ahora</p>
        <p className="text-sm text-[var(--muted)]">
          Si abriste la app desde un navegador no compatible o ya descartaste el aviso, probá refrescar la página.
        </p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
        Chrome, Edge y algunos navegadores móviles muestran el botón de instalación automáticamente cuando está disponible.
      </div>
    </div>
  );
}
