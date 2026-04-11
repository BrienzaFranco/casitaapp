import { normalizarTexto } from "./utiles";

export interface ParseoRapido {
  monto: number;
  lugar: string;
  detalle: string;
}

/**
 * Parsea texto libre como "Cena en Burger King 15000" o "Coto 2500+500 yerba"
 * Extrae: monto, lugar, detalle
 */
export function parsearTextoLibre(texto: string): ParseoRapido | null {
  const limpio = texto.trim();
  if (!limpio) return null;

  // Buscar monto: numero grande (con o sin puntos/comas)
  // Patrones: "15000", "15.000", "15,000", "2000+500", "4500-200"
  const montoRegex = /(?:^|\s)(\d[\d.,+\-*/\s]*)$/;
  const montoInicio = /(?:^|\s)(\d[\d.,+\-*/\s]*)/;

  let monto = 0;
  let resto = limpio;

  // Intentar encontrar monto al final
  const matchFinal = limpio.match(montoRegex);
  if (matchFinal) {
    const montoStr = matchFinal[1].trim();
    monto = evaluarSimple(montoStr);
    if (monto > 0) {
      resto = limpio.slice(0, matchFinal.index).trim();
    }
  }

  // Si no encontro al final, buscar al inicio
  if (monto === 0) {
    const matchInicio = limpio.match(montoInicio);
    if (matchInicio) {
      const montoStr = matchInicio[1].trim();
      monto = evaluarSimple(montoStr);
      if (monto > 0) {
        resto = limpio.slice(matchInicio.index! + matchInicio[0].length).trim();
      }
    }
  }

  // Si还是没有找到 monto, intentar buscar cualquier numero en el texto
  if (monto === 0) {
    const numeros = limpio.match(/(\d[\d.,+\-*/]*)/g);
    if (numeros) {
      // Usar el numero mas grande encontrado
      for (const num of numeros.sort((a, b) => evaluarSimple(b) - evaluarSimple(a))) {
        const val = evaluarSimple(num.trim());
        if (val > 0) {
          monto = val;
          resto = limpio.replace(num, "").trim();
          break;
        }
      }
    }
  }

  // Extraer lugar: detectar preposiciones comunes
  const preposiciones = [" en ", " de ", " del ", " al ", " a ", " por "];
  let lugar = "";
  let detalle = resto;

  for (const prep of preposiciones) {
    const idx = normalizarTexto(resto).indexOf(normalizarTexto(prep));
    if (idx > 0) {
      // Todo antes de la preposicion podria ser el detalle
      // Todo despues podria ser el lugar
      const partes = resto.split(new RegExp(prep, "i"));
      if (partes.length >= 2) {
        detalle = partes[0].trim();
        lugar = partes.slice(1).join(prep).trim();
        break;
      }
    }
  }

  // Si no encontro lugar, usar todo el resto como detalle
  if (!lugar && !detalle) {
    detalle = resto;
  }

  return { monto, lugar: lugar || "", detalle: detalle || limpio };
}

function evaluarSimple(expr: string): number {
  const limpio = expr.replace(/[.,]/g, "").replace(/\s/g, "");
  if (!limpio || !/^[\d+\-*/]+$/.test(limpio)) return 0;
  try {
    const resultado = Function(`"use strict"; return (${limpio})`)();
    return typeof resultado === "number" && Number.isFinite(resultado) ? resultado : 0;
  } catch {
    return 0;
  }
}
