import type { CompraEditable } from "@/types";

const CLAVE_COMPRAS_PENDIENTES = "compras_pendientes";
const CLAVE_REGISTRADO_POR = "registrado_por_preferido";

function notificarCambioPendientes() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pendientes-actualizados"));
  }
}

export function obtenerComprasPendientes() {
  if (typeof window === "undefined") {
    return [] as CompraEditable[];
  }

  const contenido = window.localStorage.getItem(CLAVE_COMPRAS_PENDIENTES);

  if (!contenido) {
    return [] as CompraEditable[];
  }

  try {
    return JSON.parse(contenido) as CompraEditable[];
  } catch {
    return [] as CompraEditable[];
  }
}

export function guardarPendiente(compra: CompraEditable) {
  if (typeof window === "undefined") {
    return;
  }

  const pendientes = obtenerComprasPendientes();
  pendientes.push(compra);
  window.localStorage.setItem(CLAVE_COMPRAS_PENDIENTES, JSON.stringify(pendientes));
  notificarCambioPendientes();
}

export function limpiarPendientes() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CLAVE_COMPRAS_PENDIENTES);
  notificarCambioPendientes();
}

export function reemplazarPendientes(compras: CompraEditable[]) {
  if (typeof window === "undefined") {
    return;
  }

  if (!compras.length) {
    limpiarPendientes();
    return;
  }

  window.localStorage.setItem(CLAVE_COMPRAS_PENDIENTES, JSON.stringify(compras));
  notificarCambioPendientes();
}

export function guardarRegistradoPor(nombre: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLAVE_REGISTRADO_POR, nombre);
}

export function obtenerRegistradoPor() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(CLAVE_REGISTRADO_POR) ?? "";
}
