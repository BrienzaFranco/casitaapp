import { crearClienteSupabase } from "./supabase";

const CACHE_KEY = "__config_cache__";
const CACHE_TTL = 60 * 1000; // 1 min

interface CacheEntry<T> {
  valor: T;
  timestamp: number;
}

function getCache<T>(clave: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: Record<string, CacheEntry<T>> = JSON.parse(raw);
    const entry = cache[clave];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.valor;
  } catch { return null; }
}

function setCache<T>(clave: string, valor: T) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const cache: Record<string, CacheEntry<T>> = raw ? JSON.parse(raw) : {};
    cache[clave] = { valor, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

export async function getConfiguracion<T>(clave: string, fallback: T): Promise<T> {
  const cache = getCache<T>(clave);
  if (cache) return cache;

  try {
    const cliente = crearClienteSupabase();
    const { data, error } = await cliente
      .from("configuracion")
      .select("valor")
      .eq("clave", clave)
      .single();

    if (error || !data) return fallback;
    const valor = data.valor as T;
    setCache(clave, valor);
    return valor;
  } catch {
    return fallback;
  }
}

export async function setConfiguracion<T>(clave: string, valor: T, actualizadoPor?: string) {
  setCache(clave, valor);

  try {
    const cliente = crearClienteSupabase();
    const { error } = await cliente
      .from("configuracion")
      .upsert({ clave, valor: valor as object, actualizado_por: actualizadoPor, actualizado_en: new Date().toISOString() });

    if (error) throw error;
  } catch {
    // Fallback: limpiar cache para que el proximo lectura traiga de DB
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    }
  }
}

export interface ColoresPersonas {
  franco: string;
  fabiola: string;
}

export const MODELOS_IA_DISPONIBLES = [
  "minimax/minimax-m2.7",
  "x-ai/grok-4.1-fast",
  "qwen/qwen3.6-plus",
  "openrouter/elephant-alpha",
  "google/gemma-4-26b-a4b-it",
] as const;

export async function obtenerColores(): Promise<ColoresPersonas> {
  return getConfiguracion<ColoresPersonas>("colores_personas", { franco: "#3b82f6", fabiola: "#10b981" });
}

export async function guardarColor(persona: "franco" | "fabiola", color: string, actualizadoPor?: string) {
  const actual = await obtenerColores();
  actual[persona] = color;
  await setConfiguracion("colores_personas", actual, actualizadoPor);
}

export async function obtenerLugaresOcultos(): Promise<string[]> {
  return getConfiguracion<string[]>("lugares_ocultos", []);
}

export async function ocultarLugar(lugar: string, actualizadoPor?: string) {
  const actuales = await obtenerLugaresOcultos();
  if (!actuales.includes(lugar)) {
    actuales.push(lugar);
    await setConfiguracion("lugares_ocultos", actuales, actualizadoPor);
  }
}

export async function mostrarLugar(lugar: string, actualizadoPor?: string) {
  const actuales = await obtenerLugaresOcultos();
  const nuevos = actuales.filter(l => l !== lugar);
  if (nuevos.length !== actuales.length) {
    await setConfiguracion("lugares_ocultos", nuevos, actualizadoPor);
  }
}

export async function obtenerModeloIa(): Promise<string> {
  return getConfiguracion<string>("ia_modelo_openrouter", MODELOS_IA_DISPONIBLES[0]);
}

export async function guardarModeloIa(modelo: string, actualizadoPor?: string) {
  await setConfiguracion("ia_modelo_openrouter", modelo, actualizadoPor);
}
