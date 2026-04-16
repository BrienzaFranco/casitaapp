import { evaluarExpresion } from "@/lib/calculos";
import { normalizarTexto } from "@/lib/utiles";

function redondear(valor: number) {
  return Number(valor.toFixed(2));
}

function parsearNumeroConSeparadores(valor: string): number | null {
  const limpio = valor.trim();
  if (!limpio || !/^\d[\d.,]*$/.test(limpio)) return null;

  const tienePunto = limpio.includes(".");
  const tieneComa = limpio.includes(",");

  if (!tienePunto && !tieneComa) {
    const n = Number(limpio);
    return Number.isFinite(n) ? n : null;
  }

  if (tienePunto && tieneComa) {
    const ultPunto = limpio.lastIndexOf(".");
    const ultComa = limpio.lastIndexOf(",");
    const idxDecimal = Math.max(ultPunto, ultComa);
    const decimales = limpio.length - idxDecimal - 1;

    if (decimales >= 1 && decimales <= 2) {
      const enteros = limpio.slice(0, idxDecimal).replace(/[.,]/g, "");
      const dec = limpio.slice(idxDecimal + 1).replace(/[.,]/g, "");
      if (!enteros || !dec) return null;
      const n = Number(`${enteros}.${dec}`);
      return Number.isFinite(n) ? n : null;
    }

    const n = Number(limpio.replace(/[.,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  if (tieneComa) {
    if (/^\d{1,3}(,\d{3})+$/.test(limpio)) {
      const n = Number(limpio.replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    if (/^\d+,\d{1,2}$/.test(limpio)) {
      const n = Number(limpio.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(limpio.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    const n = Number(limpio.replace(/\./g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d+\.\d{1,2}$/.test(limpio)) {
    const n = Number(limpio);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(limpio.replace(/\./g, ""));
  return Number.isFinite(n) ? n : null;
}

function extraerMultiplicador(raw: string): { numero: string; multiplicador: number } {
  const sinEspacios = raw.replace(/\s+/g, "");
  if (sinEspacios.endsWith("millones")) {
    return { numero: sinEspacios.slice(0, -8), multiplicador: 1_000_000 };
  }
  if (sinEspacios.endsWith("millon")) {
    return { numero: sinEspacios.slice(0, -6), multiplicador: 1_000_000 };
  }
  if (sinEspacios.endsWith("mil")) {
    return { numero: sinEspacios.slice(0, -3), multiplicador: 1_000 };
  }
  if (sinEspacios.endsWith("k")) {
    return { numero: sinEspacios.slice(0, -1), multiplicador: 1_000 };
  }
  if (sinEspacios.endsWith("m")) {
    return { numero: sinEspacios.slice(0, -1), multiplicador: 1_000_000 };
  }
  return { numero: sinEspacios, multiplicador: 1 };
}

function parsearTokenMonto(raw: string): number | null {
  const limpio = normalizarTexto(raw)
    .replace(/\$/g, "")
    .replace(/\b(ars|pesos?)\b/g, "")
    .trim();
  if (!limpio) return null;

  const { numero, multiplicador } = extraerMultiplicador(limpio);
  const base = parsearNumeroConSeparadores(numero);
  if (base == null) return null;
  const resultado = redondear(base * multiplicador);
  return Number.isFinite(resultado) ? resultado : null;
}

function convertirExpresionMonto(raw: string): string | null {
  const normalizado = normalizarTexto(raw)
    .replace(/\$/g, "")
    .replace(/\b(ars|pesos?)\b/g, "");

  const regexToken = /\d[\d.,]*(?:\s*(?:k|mil|m|millon(?:es)?))?/gi;
  let cursor = 0;
  let expresion = "";
  let encontroToken = false;

  for (const match of normalizado.matchAll(regexToken)) {
    const inicio = match.index ?? 0;
    const token = match[0] ?? "";
    if (!token) continue;

    expresion += normalizado.slice(cursor, inicio);
    const valor = parsearTokenMonto(token);
    if (valor == null) return null;
    expresion += String(valor);
    cursor = inicio + token.length;
    encontroToken = true;
  }

  expresion += normalizado.slice(cursor);
  const limpia = expresion.replace(/\s+/g, "");
  if (!encontroToken || !limpia) return null;
  if (!/^[\d+\-*/().]+$/.test(limpia)) return null;
  return limpia;
}

export function parseMontoFlexible(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? redondear(valor) : null;
  }
  if (typeof valor !== "string") return null;

  const texto = valor.trim();
  if (!texto) return null;

  const directo = parsearTokenMonto(texto);
  if (directo != null) return directo;

  const expr = convertirExpresionMonto(texto);
  if (!expr) return null;

  try {
    const resultado = evaluarExpresion(expr);
    return Number.isFinite(resultado) ? redondear(resultado) : null;
  } catch {
    return null;
  }
}

