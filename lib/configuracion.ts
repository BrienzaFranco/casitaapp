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

export const MODELOS_IA: Array<{ id: string; nombre: string; desc: string; precio: string }> = [
  { id: "deepseek/deepseek-v4-flash", nombre: "DeepSeek V4 Flash", desc: "NUEVO. El más barato de todos. 284B params, 1M contexto, razona muy bien. Ideal para casi todo.", precio: "~$0.14/M tokens" },
  { id: "openai/gpt-4o-mini", nombre: "GPT-4o Mini", desc: "El mejor calidad/precio. Excelente para JSON, español perfecto, muy obediente.", precio: "~$0.75/M tokens" },
  { id: "google/gemini-2.0-flash-001", nombre: "Gemini 2.0 Flash", desc: "Ultra barato, muy rápido, buen español. Ideal si usás mucho el chat.", precio: "~$0.15/M tokens" },
  { id: "deepseek/deepseek-chat", nombre: "DeepSeek V3", desc: "Muy inteligente, razona bien. Un poco más lento pero potente.", precio: "~$1.50/M tokens" },
  { id: "openai/gpt-4o", nombre: "GPT-4o", desc: "El más inteligente. Usalo si querés la mejor calidad sin importar el costo.", precio: "~$6.25/M tokens" },
  { id: "anthropic/claude-3-haiku", nombre: "Claude 3 Haiku", desc: "Rápido, buen español, muy seguro. Buena opción intermedia.", precio: "~$0.50/M tokens" },
];

/** @deprecated usar MODELOS_IA */
export const MODELOS_IA_DISPONIBLES = MODELOS_IA.map((m) => m.id) as unknown as readonly string[];

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
