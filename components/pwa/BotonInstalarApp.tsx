"use client";

import { useEffect, useState } from "react";
import { Download, MonitorSmartphone, Share2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function detectarStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function detectarIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function detectarAndroid() {
  if (typeof window === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function BotonInstalarApp() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(() => detectarStandalone());
  const esIos = detectarIos();
  const esAndroid = detectarAndroid();

  useEffect(() => {

    function handler(e: Event) {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalada(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", () => setInstalada(true));
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const resultado = await evento.userChoice;
    if (resultado.outcome === "accepted") setInstalada(true);
    setEvento(null);
  }

  if (instalada) {
    return (
      <div className="bg-surface-container-low rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="bg-tertiary-fixed/30 rounded-lg p-2.5">
            <MonitorSmartphone className="h-5 w-5 text-tertiary" />
          </div>
          <div>
            <p className="font-headline text-sm font-semibold text-on-surface">App instalada</p>
            <p className="font-body text-xs text-on-surface-variant">Abrila desde tu pantalla principal.</p>
          </div>
        </div>
      </div>
    );
  }

  if (evento) {
    return (
      <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
        <div>
          <p className="font-headline text-sm font-semibold text-on-surface">Instalar app</p>
          <p className="font-body text-xs text-on-surface-variant">Instala CasitaApp para acceso rapido.</p>
        </div>
        <button
          type="button"
          onClick={instalar}
          className="w-full h-10 rounded bg-primary font-label text-sm font-bold uppercase tracking-wider text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" /> Instalar
        </button>
      </div>
    );
  }

  if (esIos) {
    return (
      <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
        <div>
          <p className="font-headline text-sm font-semibold text-on-surface">Instalar en iPhone/iPad</p>
          <p className="font-body text-xs text-on-surface-variant">En Safari, tocá Compartir y luego &quot;Agregar a pantalla de inicio&quot;.</p>
        </div>
        <div className="bg-surface-container rounded-lg p-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-on-surface-variant shrink-0" />
          <span className="font-label text-xs text-on-surface-variant">Safari → Compartir → Agregar a inicio</span>
        </div>
      </div>
    );
  }

  if (esAndroid) {
    return (
      <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
        <div>
          <p className="font-headline text-sm font-semibold text-on-surface">Instalar en Android</p>
          <p className="font-body text-xs text-on-surface-variant">Tocá el menú (⋮) del navegador y seleccioná &quot;Instalar app&quot; o &quot;Agregar a pantalla principal&quot;.</p>
        </div>
        <div className="bg-surface-container rounded-lg p-3 flex items-center gap-2">
          <Download className="h-4 w-4 text-on-surface-variant shrink-0" />
          <span className="font-label text-xs text-on-surface-variant">Menu → Instalar app</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
      <div>
        <p className="font-headline text-sm font-semibold text-on-surface">Instalacion</p>
        <p className="font-body text-xs text-on-surface-variant">Refrescá la pagina o usa Chrome/Edge para ver la opcion de instalacion.</p>
      </div>
    </div>
  );
}
