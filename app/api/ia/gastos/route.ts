import { NextResponse } from "next/server";
import type { PagadorCompra } from "@/types";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";

const MODELO_DEFAULT = "minimax/minimax-m2.7";

interface CuerpoEntrada {
  message?: string;
  draft?: unknown;
  context?: {
    categorias?: string[];
    subcategorias?: string[];
  };
}

interface ItemIaRaw {
  descripcion?: string;
  cantidad?: number | string | null;
  monto?: number | string | null;
  expresionMonto?: string | null;
  categoria_nombre?: string;
  subcategoria_nombre?: string;
}

interface DraftPatchRaw {
  lugar?: string;
  total?: number | string | null;
  pagador?: PagadorCompra | null;
  items?: ItemIaRaw[];
  warnings?: string[];
}

function extraerJsonSeguro(texto: string): DraftPatchRaw | null {
  try {
    return JSON.parse(texto) as DraftPatchRaw;
  } catch {
    const start = texto.indexOf("{");
    const end = texto.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(texto.slice(start, end + 1)) as DraftPatchRaw;
    } catch {
      return null;
    }
  }
}

function parsearNumeroSeguro(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sanitizarPatch(raw: DraftPatchRaw) {
  const items = (raw.items ?? [])
    .map((item) => {
      const descripcion = String(item.descripcion ?? "").trim();
      if (!descripcion) return null;
      const cantidad = parsearNumeroSeguro(item.cantidad);
      const monto = parsearNumeroSeguro(item.monto);
      return {
        id: `ia-${Math.random().toString(16).slice(2, 10)}`,
        descripcion,
        cantidad: cantidad != null ? Math.max(1, Math.round(cantidad)) : null,
        expresionMonto: item.expresionMonto ? String(item.expresionMonto).trim() : null,
        monto,
        categoria_id: "",
        subcategoria_id: "",
        categoria_nombre: item.categoria_nombre ? String(item.categoria_nombre).trim() : undefined,
        subcategoria_nombre: item.subcategoria_nombre ? String(item.subcategoria_nombre).trim() : undefined,
        fuente: "ia" as const,
      };
    })
    .filter(Boolean);

  const total = parsearNumeroSeguro(raw.total);
  const pagador: PagadorCompra | null =
    raw.pagador === "franco" || raw.pagador === "fabiola" || raw.pagador === "compartido"
      ? raw.pagador
      : null;

  return {
    lugar: raw.lugar ? String(raw.lugar).trim() : "",
    total,
    pagador,
    items,
    warnings: (raw.warnings ?? []).map((w) => String(w)),
    fuente: "ia" as const,
  };
}

async function obtenerModeloActual() {
  const cliente = await crearClienteSupabaseServidor();
  const { data } = await cliente
    .from("configuracion")
    .select("valor")
    .eq("clave", "ia_modelo_openrouter")
    .maybeSingle();

  const desdeConfig = data?.valor && typeof data.valor === "string"
    ? data.valor
    : data?.valor && typeof data.valor === "object" && "modelo" in data.valor
      ? String((data.valor as { modelo: unknown }).modelo ?? "")
      : "";

  return desdeConfig || process.env.OPENROUTER_MODEL || MODELO_DEFAULT;
}

export async function POST(request: Request) {
  const cliente = await crearClienteSupabaseServidor();
  const {
    data: { user },
  } = await cliente.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 503 });
  }

  const body = await request.json() as CuerpoEntrada;
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Falta message" }, { status: 400 });
  }

  const modelo = await obtenerModeloActual();

  const categorias = body.context?.categorias?.slice(0, 80) ?? [];
  const subcategorias = body.context?.subcategorias?.slice(0, 120) ?? [];

  const promptSistema = [
    "Sos un extractor de gastos para una app de finanzas domesticas.",
    "Devolve SOLO JSON valido.",
    "Si algo no esta en el texto, devolvelo null o vacio.",
    "No inventes montos por item si no estan claros.",
    "Estructura JSON esperada:",
    "{",
    '  "lugar": "string o vacio",',
    '  "total": "number o null",',
    '  "pagador": "franco|fabiola|compartido|null",',
    '  "items": [',
    "    {",
    '      "descripcion": "string",',
    '      "cantidad": "number|null",',
    '      "monto": "number|null",',
    '      "expresionMonto": "string|null",',
    '      "categoria_nombre": "string opcional",',
    '      "subcategoria_nombre": "string opcional"',
    "    }",
    "  ],",
    '  "warnings": ["string"]',
    "}",
    `Categorias disponibles: ${categorias.join(", ") || "sin lista"}.`,
    `Subcategorias disponibles: ${subcategorias.join(", ") || "sin lista"}.`,
  ].join("\n");

  const payload = {
    model: modelo,
    temperature: 0.1,
    max_tokens: 380,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: promptSistema },
      {
        role: "user",
        content: `Texto usuario:\n${message}\n\nDraft parcial (si existe):\n${JSON.stringify(body.draft ?? {}, null, 2)}`,
      },
    ],
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "CasitaApp",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errTxt = await res.text();
    return NextResponse.json({ error: "OpenRouter error", detail: errTxt }, { status: 502 });
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const contenido = json.choices?.[0]?.message?.content ?? "";
  const draftRaw = extraerJsonSeguro(contenido);

  if (!draftRaw) {
    return NextResponse.json({ error: "No se pudo parsear JSON del modelo" }, { status: 502 });
  }

  return NextResponse.json({
    draftPatch: sanitizarPatch(draftRaw),
    model: modelo,
  });
}

