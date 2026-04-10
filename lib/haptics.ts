function puedeVibrar() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function vibrarTactico(duracion = 14) {
  if (!puedeVibrar()) {
    return;
  }

  navigator.vibrate(duracion);
}

export function vibrarExito() {
  if (!puedeVibrar()) {
    return;
  }

  navigator.vibrate([12, 24, 12]);
}
