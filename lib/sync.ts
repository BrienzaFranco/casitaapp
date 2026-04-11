/**
 * Utility para modo offline y background sync.
 * Permite registrar sync tasks cuando hay conexion.
 */

const SYNC_TAG = "sync-compras";

export function registrarSyncPendiente() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready.then((registration) => {
    if ("sync" in registration) {
      const syncReg = registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } };
      syncReg.sync.register(SYNC_TAG).catch(() => {
        // Fallback: el evento online del hook se encargara
      });
    }
  }).catch(() => {
    // Fallback silencioso
  });
}

export function escucharSync(callback: () => Promise<void>) {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    void callback();
  });
}

export function estaOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}
