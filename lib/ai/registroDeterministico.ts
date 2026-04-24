import { calcularReparto } from "@/lib/calculos";
import { parseMontoFlexible } from "@/lib/ai/montos";
import { fechaLocalISO, normalizarTexto } from "@/lib/utiles";
import type { CompraEditable, PagadorCompra, TipoReparto } from "@/types";
import type {
  CampoFaltanteRegistroIa,
  ModoRegistroIa,
  RegistroIaDraft,
  RegistroIaItem,
  RegistroIaResultado,
} from "./contracts";

const PALABRAS_NUMERO = new Set([
  "cero",
  "un",
  "uno",
  "una",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciseis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidos",
  "veintitres",
  "veinticuatro",
  "veinticinco",
  "veintiseis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
  "cien",
  "ciento",
  "doscientos",
  "doscientas",
  "trescientos",
  "trescientas",
  "cuatrocientos",
  "cuatrocientas",
  "quinientos",
  "quinientas",
  "seiscientos",
  "seiscientas",
  "setecientos",
  "setecientas",
  "ochocientos",
  "ochocientas",
  "novecientos",
  "novecientas",
  "mil",
  "millon",
  "millon",
  "millones",
  "y",
]);

const UNIDADES: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
};

const DECENAS: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};

const CENTENAS: Record<string, number> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900,
};

function generarIdItem() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ria-${crypto.randomUUID()}`;
  }
  return `ria-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function aNumeroSeguro(valor: unknown): number | null {
  return parseMontoFlexible(valor);
}

function textoANumeroEspanol(frase: string): number | null {
  const tokens = normalizarTexto(frase)
    .split(/\s+/)
    .filter((t) => t && t !== "y");
  if (!tokens.length) return null;
  if (!tokens.every((t) => PALABRAS_NUMERO.has(t))) return null;

  let acumulado = 0;
  let bloque = 0;

  for (const token of tokens) {
    if (token === "y") continue;
    if (token in UNIDADES) {
      bloque += UNIDADES[token];
      continue;
    }
    if (token in DECENAS) {
      bloque += DECENAS[token];
      continue;
    }
    if (token in CENTENAS) {
      bloque += CENTENAS[token];
      continue;
    }
    if (token === "mil") {
      bloque = (bloque || 1) * 1000;
      acumulado += bloque;
      bloque = 0;
      continue;
    }
    if (token === "millon" || token === "millones") {
      bloque = (bloque || 1) * 1_000_000;
      acumulado += bloque;
      bloque = 0;
      continue;
    }
  }

  const total = acumulado + bloque;
  return total > 0 ? total : null;
}

function extraerMontoDesdeTexto(texto: string): number | null {
  const textoOriginal = texto;
  const normalizado = normalizarTexto(textoOriginal);
  type CandidatoMonto = { valor: number; score: number; idx: number };
  const candidatos: CandidatoMonto[] = [];

  function agregar(raw: string | undefined, score: number, idx: number) {
    if (!raw) return;
    const limpio = raw.trim();
    if (!limpio) return;
    let valor = aNumeroSeguro(limpio);
    if (valor == null) valor = textoANumeroEspanol(limpio);
    if (valor == null || !Number.isFinite(valor) || valor <= 0) return;
    candidatos.push({ valor, score, idx });
  }

  const regexTotal = /\b(?:en\s+total|total)\s+(?:de\s+)?([a-z0-9.,+\-*/()\s]+?)(?=[,.]|$)/gi;
  for (const match of normalizado.matchAll(regexTotal)) {
    agregar(match[1], 120, match.index ?? 0);
  }

  const regexContexto = /\b(?:por|fue|fueron|gaste|gasto|salio|costo)\s+(?:de\s+)?([a-z0-9.,+\-*/()\s]+?)(?=[,.]|$)/gi;
  for (const match of normalizado.matchAll(regexContexto)) {
    agregar(match[1], 100, match.index ?? 0);
  }

  const regexConMoneda = /([0-9][0-9.,]*(?:\s*(?:k|mil|m|millon(?:es)?))?(?:\s*[+\-*/]\s*[0-9][0-9.,]*(?:\s*(?:k|mil|m|millon(?:es)?))?)*)\s*(?:pesos?|ars)\b/gi;
  for (const match of normalizado.matchAll(regexConMoneda)) {
    agregar(match[1], 90, match.index ?? 0);
  }

  const regexExpresion = /\b\d[\d.,]*(?:\s*(?:k|mil|m|millon(?:es)?))?(?:\s*[+\-*/]\s*\d[\d.,]*(?:\s*(?:k|mil|m|millon(?:es)?))?)+\b/gi;
  for (const match of normalizado.matchAll(regexExpresion)) {
    agregar(match[0], 75, match.index ?? 0);
  }

  const regexSufijo = /\b\d[\d.,]*\s*(?:k|mil|m|millon(?:es)?)\b/gi;
  for (const match of normalizado.matchAll(regexSufijo)) {
    agregar(match[0], 70, match.index ?? 0);
  }

  const hayPistaMoneda = /(?:\bpesos?\b|\bars\b|\$|\bk\b|\bmil\b|\bmillon(?:es)?\b)/.test(normalizado);
  const hayContextoMonto = /\b(?:por|total|fue|fueron|gaste|gasto|salio|costo)\b/.test(normalizado);
  const regexSimple = /\b\d[\d.,]*\b/g;
  for (const match of normalizado.matchAll(regexSimple)) {
    const valor = aNumeroSeguro(match[0]);
    if (valor == null) continue;
    if (!hayPistaMoneda && !hayContextoMonto && valor < 100) continue;
    candidatos.push({ valor, score: 40, idx: match.index ?? 0 });
  }

  const tokens = normalizado.split(/\s+/);
  for (let tam = Math.min(tokens.length, 10); tam >= 2; tam -= 1) {
    for (let i = 0; i + tam <= tokens.length; i += 1) {
      const sub = tokens.slice(i, i + tam).join(" ");
      const valor = textoANumeroEspanol(sub);
      if (valor != null && valor >= 100) {
        candidatos.push({ valor, score: 65, idx: i });
      }
    }
  }

  if (!candidatos.length) return null;
  candidatos.sort((a, b) => b.score - a.score || a.idx - b.idx || b.valor - a.valor);
  return candidatos[0]?.valor ?? null;
}

function extraerLugar(texto: string): string {
  const m1 = texto.match(/(?:en|del|de)\s+([a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s.'-]{2,40}?)(?=\s+(?:por|total|gaste|gast[eé]|compre|compr[eé]|una|un|y|con)\b|[,.]|$)/i);
  if (m1?.[1]) return m1[1].trim();
  const m2 = texto.match(/(?:compre|compr[eé]|gaste|gast[eé])\s+en\s+([a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s.'-]{2,40})(?:[,.]|$)/i);
  if (m2?.[1]) return m2[1].trim();
  return "";
}

function extraerPagador(texto: string): PagadorCompra | null {
  const n = normalizarTexto(texto);
  // Frases explícitas de "quién pagó" (más específicas primero)
  if (/\b(lo\s+pago|lo\s+pag[oó]|pago)\s+franco\b/.test(n)) return "franco";
  if (/\b(lo\s+pago|lo\s+pag[oó]|pago)\s+(fabiola|fabi)\b/.test(n)) return "fabiola";
  if (/\b(pago|pague|pag[ué])\s+franco\b/.test(n)) return "franco";
  if (/\b(pago|pague|pag[ué])\s+(fabiola|fabi)\b/.test(n)) return "fabiola";
  if (/\b(pagamos|pagaron ambos|pago\s+compartido)\b/.test(n)) return "compartido";
  // Fallback por nombre mencionado (solo si no hay reparto explícito que contradiga)
  const tieneRepartoCompartido = /\b(50\/50|mitad|a medias|compartido|entre los dos|ambos)\b/.test(n);
  if (!tieneRepartoCompartido) {
    if (/\b(franco)\b/.test(n) && !/\b(fabiola|fabi)\b/.test(n)) return "franco";
    if (/\b(fabiola|fabi)\b/.test(n) && !/\b(franco)\b/.test(n)) return "fabiola";
  }
  return null;
}

function extraerReparto(texto: string): TipoReparto | null {
  const n = normalizarTexto(texto);
  // Compartido / 50/50 — palabras que indican división
  if (/\b(50\/50|mitad|a medias|compartido|entre los dos|ambos|lo compartimos|compartimos)\b/.test(n)) return "50/50";
  // Solo Franco
  if (/\b(solo franco|todo franco|a cargo franco|lo asume franco|para franco|de franco)\b/.test(n)) return "solo_franco";
  // Solo Fabiola
  if (/\b(solo fabiola|solo fabi|todo fabiola|todo fabi|a cargo fabiola|a cargo fabi|lo asume fabi|para fabiola|de fabiola)\b/.test(n)) return "solo_fabiola";
  return null;
}

function cantidadDesdeToken(token: string): number | null {
  const n = normalizarTexto(token);
  const num = aNumeroSeguro(n);
  if (num != null) return Math.max(1, Math.round(num));
  const desdeTxt = textoANumeroEspanol(n);
  if (desdeTxt != null) return Math.max(1, Math.round(desdeTxt));
  return null;
}

function limpiarDescripcionItem(texto: string): string {
  return texto
    .replace(/\b(ah|tambien|también|y)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerItems(texto: string): RegistroIaItem[] {
  const normalizado = texto.replace(/\n/g, " ");
  const items: RegistroIaItem[] = [];

  // Patron 1: item con monto ("leche a 800", "pan salio 400")
  const itemConMontoRegex = /(?:el|la|los|las)?\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ][a-zA-ZáéíóúñÁÉÍÓÚÑ\s]{1,40}?)\s+(?:salio|salió|costo|costó|vale|valio|valió|a)\s+([0-9][0-9+\-*/.,\s]*(?:k|mil|m|millones?)?)/gi;
  for (const match of normalizado.matchAll(itemConMontoRegex)) {
    const descripcion = limpiarDescripcionItem(match[1] ?? "");
    const expresion = (match[2] ?? "").trim();
    if (!descripcion || /peso/i.test(descripcion)) continue;
    const monto = aNumeroSeguro(expresion);
    items.push({
      id: generarIdItem(),
      descripcion,
      cantidad: 1,
      expresionMonto: expresion || null,
      monto,
      categoria_id: "",
      subcategoria_id: "",
      fuente: "deterministico",
    });
  }

  // Patron 2: listas con coma o "y" ("leche $800, pan $400 y queso $1200")
  // Extraemos segmentos separados por "," o " y " que tengan monto
  const partes = normalizado.split(/,\s*|\s+y\s+/i);
  for (const parte of partes) {
    // Buscar: [descripcion] [$monto] o [descripcion] [numero]
    const matchLista = parte.match(/([a-zA-ZáéíóúñÁÉÍÓÚÑ][a-zA-ZáéíóúñÁÉÍÓÚÑ\s]{1,35}?)\s*(?:\$?\s*)([0-9][0-9+\-*/.,\s]*(?:k|mil|m)?)\s*(?:pesos?)?/i);
    if (matchLista) {
      const descripcion = limpiarDescripcionItem(matchLista[1] ?? "");
      const expresion = (matchLista[2] ?? "").trim();
      if (!descripcion || /peso/i.test(descripcion)) continue;
      // Evitar duplicados
      if (items.some((i) => normalizarTexto(i.descripcion) === normalizarTexto(descripcion))) continue;
      const monto = aNumeroSeguro(expresion);
      if (monto != null && monto > 0) {
        items.push({
          id: generarIdItem(),
          descripcion,
          cantidad: 1,
          expresionMonto: expresion,
          monto,
          categoria_id: "",
          subcategoria_id: "",
          fuente: "deterministico",
        });
      }
    }
  }

  // Patron 3: cantidad + item sin monto ("2 leches", "un pan")
  const countRegex = /(?:^|[\s,.;])(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+([a-zA-ZáéíóúñÁÉÍÓÚÑ][a-zA-ZáéíóúñÁÉÍÓÚÑ\s]{1,32}?)(?=(?:\s+y\s+|\s+ah\b|\s+tambien\b|[,.]|$))/gi;
  for (const match of normalizado.matchAll(countRegex)) {
    const cantidad = cantidadDesdeToken(match[1] ?? "");
    const descripcion = limpiarDescripcionItem(match[2] ?? "");
    if (!descripcion || /peso/i.test(descripcion)) continue;
    if (items.some((i) => normalizarTexto(i.descripcion) === normalizarTexto(descripcion))) continue;
    items.push({
      id: generarIdItem(),
      descripcion,
      cantidad,
      expresionMonto: null,
      monto: null,
      categoria_id: "",
      subcategoria_id: "",
      fuente: "deterministico",
    });
  }

  return items;
}

function scoreConfidence(draft: RegistroIaDraft): number {
  let score = 0;
  if (draft.lugar) score += 0.22;
  if (draft.total != null && draft.total > 0) score += 0.35;
  if (draft.items.length > 0) score += 0.3;
  if (draft.pagador) score += 0.08;
  if (draft.reparto) score += 0.05;
  return Number(score.toFixed(2));
}

function fusionarItems(base: RegistroIaItem[], nuevos: RegistroIaItem[]): RegistroIaItem[] {
  const resultado = [...base];
  for (const item of nuevos) {
    const idx = resultado.findIndex((x) => normalizarTexto(x.descripcion) === normalizarTexto(item.descripcion));
    if (idx >= 0) {
      resultado[idx] = {
        ...resultado[idx],
        ...item,
        monto: item.monto ?? resultado[idx].monto,
        expresionMonto: item.expresionMonto ?? resultado[idx].expresionMonto,
        cantidad: item.cantidad ?? resultado[idx].cantidad,
      };
    } else {
      resultado.push(item);
    }
  }
  return resultado;
}

function aplicarDescuento(mensaje: string, items: RegistroIaItem[]): RegistroIaItem[] {
  const n = normalizarTexto(mensaje);
  if (!/descuento|resta|restale|desconta|descontale/.test(n)) return items;

  const match = n.match(
    /(?:aplica|aplicar|resta|restale|desconta|descontale)\s+(\d+(?:[.,]\d+)?)\s*(%|porciento|por ciento)?(?:\s+de\s+descuento)?\s+(?:a|al|sobre)\s+(.+)$/i,
  );
  if (!match) return items;

  const valor = Number(match[1].replace(",", "."));
  const esPorcentaje = Boolean(match[2]);
  const objetivo = normalizarTexto(match[3]);

  return items.map((item) => {
    const desc = normalizarTexto(item.descripcion);
    if (!desc.includes(objetivo) && !objetivo.includes(desc)) return item;
    if (item.monto == null) return item;
    const montoNuevo = esPorcentaje ? item.monto * (1 - valor / 100) : item.monto - valor;
    const montoFinal = Math.max(0, Number(montoNuevo.toFixed(2)));
    return {
      ...item,
      monto: montoFinal,
      expresionMonto: String(montoFinal),
    };
  });
}

export function crearDraftDesdeMensaje(mensaje: string, base?: RegistroIaDraft): RegistroIaDraft {
  const lugar = extraerLugar(mensaje);
  const pagador = extraerPagador(mensaje);
  const reparto = extraerReparto(mensaje);
  const total = extraerMontoDesdeTexto(mensaje);
  const nuevosItems = extraerItems(mensaje);

  const draftBase: RegistroIaDraft = base ?? {
    textoOriginal: mensaje,
    fecha: fechaLocalISO(),
    lugar: "",
    pagador: null,
    reparto: null,
    total: null,
    items: [],
    fuente: "deterministico",
    confidence: 0,
    warnings: [],
  };

  let draft: RegistroIaDraft = {
    ...draftBase,
    textoOriginal: base ? `${base.textoOriginal}\n${mensaje}` : mensaje,
    lugar: lugar || draftBase.lugar,
    pagador: pagador ?? draftBase.pagador,
    reparto: reparto ?? draftBase.reparto,
    total: total ?? draftBase.total,
    items: fusionarItems(draftBase.items, nuevosItems),
    fuente: "deterministico",
    warnings: [...draftBase.warnings],
    confidence: 0,
  };

  draft = {
    ...draft,
    items: aplicarDescuento(mensaje, draft.items),
  };

  draft.confidence = scoreConfidence(draft);
  return draft;
}

export function fusionarDraftConIa(base: RegistroIaDraft, parcial: Partial<RegistroIaDraft>): RegistroIaDraft {
  const items = parcial.items ? fusionarItems(base.items, parcial.items) : base.items;
  const merged: RegistroIaDraft = {
    ...base,
    ...parcial,
    items,
    lugar: parcial.lugar ?? base.lugar,
    pagador: parcial.pagador ?? base.pagador,
    reparto: parcial.reparto ?? base.reparto,
    total: parcial.total ?? base.total,
    fuente: parcial.fuente ?? base.fuente,
    warnings: [...base.warnings, ...(parcial.warnings ?? [])],
    confidence: 0,
  };
  merged.confidence = scoreConfidence(merged);
  return merged;
}

export function aplicarAjustePorTotal(draft: RegistroIaDraft): RegistroIaDraft {
  if (draft.total == null || draft.total <= 0) return draft;
  const suma = draft.items.reduce((acc, i) => acc + (i.monto ?? 0), 0);
  const diferencia = Number((draft.total - suma).toFixed(2));
  if (Math.abs(diferencia) < 0.01) return draft;

  const nombreAjuste = "Ajuste IA (monto no distribuido)";
  const idx = draft.items.findIndex((i) => normalizarTexto(i.descripcion) === normalizarTexto(nombreAjuste));
  const ajuste: RegistroIaItem = {
    id: idx >= 0 ? draft.items[idx].id : generarIdItem(),
    descripcion: nombreAjuste,
    cantidad: 1,
    expresionMonto: String(diferencia),
    monto: diferencia,
    categoria_id: "",
    subcategoria_id: "",
    fuente: "deterministico",
  };
  const items = idx >= 0
    ? draft.items.map((item, i) => (i === idx ? ajuste : item))
    : [...draft.items, ajuste];
  return { ...draft, items, confidence: scoreConfidence({ ...draft, items }) };
}

export function obtenerFaltantes(draft: RegistroIaDraft, modo: ModoRegistroIa): CampoFaltanteRegistroIa[] {
  const faltantes: CampoFaltanteRegistroIa[] = [];

  if (modo === "completo") {
    if (!draft.lugar) faltantes.push("lugar");
    if (!draft.pagador) faltantes.push("pagador");
    if (!draft.reparto) faltantes.push("reparto");
    if (draft.total == null || draft.total <= 0) faltantes.push("total");
    if (!draft.items.length) faltantes.push("items");
    if (draft.items.some((item) => item.monto == null || item.monto <= 0)) faltantes.push("items_sin_monto");
    return faltantes;
  }

  const tieneTotal = Boolean(draft.total && draft.total > 0);
  const tieneItems = draft.items.length > 0;
  if (!tieneTotal && !tieneItems) faltantes.push("items");
  if (tieneTotal || tieneItems) {
    if (!draft.pagador) faltantes.push("pagador");
    if (!draft.reparto) faltantes.push("reparto");
  }
  return faltantes;
}

export function puedeGuardar(draft: RegistroIaDraft, modo: ModoRegistroIa): boolean {
  return obtenerFaltantes(draft, modo).length === 0;
}

export function preguntaSiguiente(faltantes: CampoFaltanteRegistroIa[]): string | null {
  if (faltantes.includes("pagador") && faltantes.includes("reparto")) {
    return "¿Quién pagó efectivamente y cómo querés repartir (50/50, solo Franco o solo Fabiola)?";
  }
  if (faltantes.includes("total") && faltantes.includes("lugar")) {
    return "¿En qué lugar fue y cuál fue el total de la compra?";
  }
  if (faltantes.includes("reparto") && faltantes.includes("total")) {
    return "¿Cómo querés repartir la compra (50/50, solo Franco o solo Fabiola) y cuál fue el total?";
  }
  if (faltantes.includes("pagador") && faltantes.includes("total")) {
    return "¿Quién pagó efectivamente y cuál fue el total?";
  }
  if (faltantes.includes("lugar")) return "¿En qué lugar fue la compra?";
  if (faltantes.includes("pagador")) return "¿Quién pagó efectivamente: Franco, Fabiola o compartido?";
  if (faltantes.includes("reparto")) return "¿Cómo querés repartir esta compra: 50/50, solo Franco o solo Fabiola?";
  if (faltantes.includes("total")) return "¿Cuál fue el total de la compra?";
  if (faltantes.includes("items")) return "Decime al menos un item de la compra.";
  if (faltantes.includes("items_sin_monto")) return "Faltan montos por item. ¿Me pasás cuánto costó cada uno?";
  return null;
}

function tipoRepartoDesdePagador(pagador: PagadorCompra): TipoReparto {
  if (pagador === "franco") return "solo_franco";
  if (pagador === "fabiola") return "solo_fabiola";
  return "50/50";
}

export function convertirDraftACompraEditable(
  draft: RegistroIaDraft,
  opciones: {
    registradoPor: string;
    etiquetasCompraIds?: string[];
    incluirAjuste?: boolean;
    forzarPagador?: PagadorCompra;
    forzarLugar?: string;
  },
): CompraEditable {
  const pagador = opciones.forzarPagador ?? draft.pagador ?? "compartido";
  const tipoReparto = draft.reparto && draft.reparto !== "personalizado"
    ? draft.reparto
    : tipoRepartoDesdePagador(pagador);
  const etiquetas_compra_ids = opciones.etiquetasCompraIds ?? [];
  const base = opciones.incluirAjuste ? aplicarAjustePorTotal(draft) : draft;

  const itemsBase = base.items.length
    ? base.items
    : [{
      id: generarIdItem(),
      descripcion: "Compra sin detalle",
      cantidad: 1,
      expresionMonto: base.total != null ? String(base.total) : "0",
      monto: base.total ?? 0,
      categoria_id: "",
      subcategoria_id: "",
      fuente: "deterministico" as const,
    }];

  const items = itemsBase.map((item) => {
    const monto = item.monto != null ? item.monto : 0;
    const reparto = calcularReparto(tipoReparto, monto);
    return {
      id: item.id,
      descripcion: item.descripcion || "Sin descripción",
      categoria_id: item.categoria_id || "",
      subcategoria_id: item.subcategoria_id || "",
      expresion_monto: item.expresionMonto || String(monto),
      monto_resuelto: monto,
      tipo_reparto: tipoReparto,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
      etiquetas_ids: [],
    };
  });

  const notas = [
    `Cargado desde registro IA (${opciones.incluirAjuste ? "rapido" : "completo"})`,
    `Texto original: ${draft.textoOriginal}`,
  ].join("\n");

  return {
    fecha: draft.fecha || fechaLocalISO(),
    nombre_lugar: (opciones.forzarLugar ?? draft.lugar) || "Sin especificar",
    notas,
    registrado_por: opciones.registradoPor,
    pagador_general: pagador,
    estado: "borrador",
    etiquetas_compra_ids,
    items,
  };
}

export function resolverResultado(draft: RegistroIaDraft, modo: ModoRegistroIa): RegistroIaResultado {
  const faltantes = obtenerFaltantes(draft, modo);
  return {
    draft,
    faltantes,
    preguntaSiguiente: preguntaSiguiente(faltantes),
    canSave: faltantes.length === 0,
  };
}
