import { NextResponse } from "next/server";
import type { PagadorCompra } from "@/types";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";
import { parseMontoFlexible } from "@/lib/ai/montos";
import type {
  RegistroIaCorrectionField,
  RegistroIaCorrectionOp,
  RegistroIaIntent,
  RegistroIaResolution,
} from "@/lib/ai/contracts";

const MODELO_DEFAULT = "minimax/minimax-m2.7";

interface CuerpoEntrada {
  message?: string;
  draft?: unknown;
  context?: {
    categorias?: Array<{ id: string; nombre: string }>;
    subcategorias?: Array<{ id: string; categoria_id: string; nombre: string }>;
  };
}

interface ItemIaRaw {
  id?: string;
  descripcion?: string;
  cantidad?: number | string | null;
  monto?: number | string | null;
  expresionMonto?: string | null;
  categoria_id?: string;
  subcategoria_id?: string;
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

interface OperationRaw {
  type?: string;
  targetType?: string;
  field?: string;
  targetItemId?: string;
  targetMatcher?: string;
  from?: string;
  to?: unknown;
}

interface ResolutionOptionRaw {
  id?: string;
  label?: string;
  targetItemId?: string;
}

interface ResolutionRaw {
  reason?: string;
  field?: string;
  options?: ResolutionOptionRaw[];
}

interface RespuestaIaRaw {
  intent?: string;
  answer?: string;
  draftPatch?: DraftPatchRaw;
  operations?: OperationRaw[];
  resolution?: ResolutionRaw;
  warnings?: string[];
  lugar?: string;
  total?: number | string | null;
  pagador?: PagadorCompra | null;
  items?: ItemIaRaw[];
}

const FIELDS: RegistroIaCorrectionField[] = [
  "lugar",
  "pagador",
  "total",
  "descripcion",
  "monto",
  "cantidad",
  "categoria_id",
  "subcategoria_id",
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extraerJsonSeguro(texto: string): RespuestaIaRaw | null {
  try {
    return JSON.parse(texto) as RespuestaIaRaw;
  } catch {
    const start = texto.indexOf("{");
    const end = texto.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(texto.slice(start, end + 1)) as RespuestaIaRaw;
    } catch {
      return null;
    }
  }
}

function parsearNumeroSeguro(v: unknown): number | null {
  return parseMontoFlexible(v);
}

function sanitizarPagador(v: unknown): PagadorCompra | null {
  return v === "franco" || v === "fabiola" || v === "compartido" ? v : null;
}

function resolverCategoriaId(
  item: ItemIaRaw,
  categorias: Array<{ id: string; nombre: string }>,
): string {
  if (item.categoria_id && categorias.some((c) => c.id === item.categoria_id)) {
    return item.categoria_id;
  }
  if (!item.categoria_nombre) return "";
  const nombre = normalizar(item.categoria_nombre);
  const cat = categorias.find((c) => normalizar(c.nombre) === nombre)
    ?? categorias.find((c) => normalizar(c.nombre).includes(nombre));
  return cat?.id ?? "";
}

function resolverSubcategoriaId(
  item: ItemIaRaw,
  categoriaId: string,
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>,
): string {
  if (item.subcategoria_id && subcategorias.some((s) => s.id === item.subcategoria_id)) {
    return item.subcategoria_id;
  }
  if (!item.subcategoria_nombre) return "";
  const nombre = normalizar(item.subcategoria_nombre);
  const candidatas = categoriaId
    ? subcategorias.filter((s) => s.categoria_id === categoriaId)
    : subcategorias;
  const sub = candidatas.find((s) => normalizar(s.nombre) === nombre)
    ?? candidatas.find((s) => normalizar(s.nombre).includes(nombre));
  return sub?.id ?? "";
}

function sanitizarPatch(
  raw: DraftPatchRaw,
  categorias: Array<{ id: string; nombre: string }>,
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>,
) {
  const warnings: string[] = [];
  const items = (raw.items ?? [])
    .map((item) => {
      const descripcion = String(item.descripcion ?? "").trim();
      if (!descripcion) return null;
      const cantidad = parsearNumeroSeguro(item.cantidad);
      const monto = parsearNumeroSeguro(item.monto);
      const categoriaId = resolverCategoriaId(item, categorias);
      const subcategoriaId = resolverSubcategoriaId(item, categoriaId, subcategorias);

      if (!categoriaId) warnings.push(`No se pudo asignar categoria para ${descripcion}`);
      if (item.subcategoria_nombre && !subcategoriaId) {
        warnings.push(`No se pudo asignar subcategoria para ${descripcion}`);
      }

      return {
        id: item.id ? String(item.id) : `ia-${Math.random().toString(16).slice(2, 10)}`,
        descripcion,
        cantidad: cantidad != null ? Math.max(1, Math.round(cantidad)) : null,
        expresionMonto: item.expresionMonto ? String(item.expresionMonto).trim() : null,
        monto,
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
        fuente: "ia" as const,
      };
    })
    .filter(Boolean);

  const total = parsearNumeroSeguro(raw.total);
  const pagador = sanitizarPagador(raw.pagador);

  return {
    draftPatch: {
      lugar: raw.lugar ? String(raw.lugar).trim() : "",
      total,
      pagador,
      items,
      warnings: [...(raw.warnings ?? []).map((w) => String(w)), ...warnings],
      fuente: "ia" as const,
    },
  };
}

function sanitizarOperation(
  raw: OperationRaw,
  categorias: Array<{ id: string; nombre: string }>,
  subcategorias: Array<{ id: string; categoria_id: string; nombre: string }>,
): RegistroIaCorrectionOp | null {
  if (raw.type !== "replace_field") return null;
  if (raw.targetType !== "draft" && raw.targetType !== "item") return null;
  if (!FIELDS.includes(raw.field as RegistroIaCorrectionField)) return null;

  const field = raw.field as RegistroIaCorrectionField;
  let to: string | number | null = null;

  if (field === "total" || field === "monto" || field === "cantidad") {
    const num = parsearNumeroSeguro(raw.to);
    if (num == null) return null;
    to = field === "cantidad" ? Math.max(1, Math.round(num)) : num;
  } else if (field === "pagador") {
    const pagador = sanitizarPagador(raw.to);
    if (!pagador) return null;
    to = pagador;
  } else if (field === "categoria_id") {
    const v = String(raw.to ?? "").trim();
    if (!categorias.some((c) => c.id === v)) return null;
    to = v;
  } else if (field === "subcategoria_id") {
    const v = String(raw.to ?? "").trim();
    if (!subcategorias.some((s) => s.id === v)) return null;
    to = v;
  } else {
    to = raw.to == null ? null : String(raw.to).trim();
    if (to === "") to = null;
  }

  return {
    type: "replace_field",
    targetType: raw.targetType,
    field,
    targetItemId: raw.targetItemId ? String(raw.targetItemId) : undefined,
    targetMatcher: raw.targetMatcher ? String(raw.targetMatcher) : undefined,
    from: raw.from ? String(raw.from) : undefined,
    to,
  };
}

function sanitizarResolution(raw: ResolutionRaw | undefined): RegistroIaResolution | null {
  if (!raw?.reason || !raw?.field || !FIELDS.includes(raw.field as RegistroIaCorrectionField)) return null;
  const options = (raw.options ?? [])
    .map((opt) => ({
      id: String(opt.id ?? ""),
      label: String(opt.label ?? "").trim(),
      targetItemId: opt.targetItemId ? String(opt.targetItemId) : undefined,
    }))
    .filter((opt) => opt.id && opt.label);
  if (!options.length) return null;
  return {
    reason: String(raw.reason),
    field: raw.field as RegistroIaCorrectionField,
    options,
  };
}

function inferirIntent(
  rawIntent: string | undefined,
  answer: string,
  operationsCount: number,
): RegistroIaIntent {
  if (rawIntent === "crear_o_actualizar" || rawIntent === "corregir" || rawIntent === "pregunta") {
    return rawIntent;
  }
  if (operationsCount > 0) return "corregir";
  if (answer) return "pregunta";
  return "crear_o_actualizar";
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
  const subcategorias = body.context?.subcategorias?.slice(0, 140) ?? [];

  const promptSistema = [
    "Sos un agente de registro de gastos para una app domestica.",
    "Respondes SOLO con JSON valido (sin markdown).",
    "Tu salida decide estructura final del draft.",
    "Si el usuario pide correccion, devolve intent=corregir y operations.",
    "Si es consulta sin cambios, devolve intent=pregunta y answer.",
    "Si es carga/actualizacion, devolve intent=crear_o_actualizar y draftPatch.",
    "No inventes categorias/subcategorias fuera del catalogo (usar IDs existentes).",
    "Si la correccion es ambigua, no edites: devolve resolution con opciones.",
    "Formato JSON:",
    "{",
    '  "intent": "crear_o_actualizar|corregir|pregunta",',
    '  "answer": "string opcional",',
    '  "draftPatch": {',
    '    "lugar": "string|vacio",',
    '    "total": "number|null",',
    '    "pagador": "franco|fabiola|compartido|null",',
    '    "items": [',
    "      {",
    '        "id": "string opcional",',
    '        "descripcion": "string",',
    '        "cantidad": "number|null",',
    '        "monto": "number|null",',
    '        "expresionMonto": "string|null",',
    '        "categoria_id": "id existente opcional",',
    '        "subcategoria_id": "id existente opcional",',
    '        "categoria_nombre": "fallback opcional",',
    '        "subcategoria_nombre": "fallback opcional"',
    "      }",
    "    ],",
    '    "warnings": ["string"]',
    "  },",
    '  "operations": [',
    "    {",
    '      "type": "replace_field",',
    '      "targetType": "draft|item",',
    '      "field": "lugar|pagador|total|descripcion|monto|cantidad|categoria_id|subcategoria_id",',
    '      "targetItemId": "string opcional",',
    '      "targetMatcher": "string opcional",',
    '      "from": "string opcional",',
    '      "to": "string|number|null"',
    "    }",
    "  ],",
    '  "resolution": {',
    '    "reason": "string",',
    '    "field": "descripcion|monto|cantidad|categoria_id|subcategoria_id",',
    '    "options": [{"id":"string","label":"string","targetItemId":"string opcional"}]',
    "  },",
    '  "warnings": ["string"]',
    "}",
    `Categorias disponibles (id:nombre): ${categorias.map((c) => `${c.id}:${c.nombre}`).join(", ") || "sin lista"}.`,
    `Subcategorias disponibles (id:categoria_id:nombre): ${subcategorias.map((s) => `${s.id}:${s.categoria_id}:${s.nombre}`).join(", ") || "sin lista"}.`,
  ].join("\n");

  const payload = {
    model: modelo,
    temperature: 0.1,
    max_tokens: 520,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: promptSistema },
      {
        role: "user",
        content: `Mensaje usuario:\n${message}\n\nDraft actual:\n${JSON.stringify(body.draft ?? {}, null, 2)}`,
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
  const raw = extraerJsonSeguro(contenido);

  if (!raw) {
    return NextResponse.json({ error: "No se pudo parsear JSON del modelo" }, { status: 502 });
  }

  const draftRaw: DraftPatchRaw | undefined = raw.draftPatch
    ?? (raw.lugar !== undefined || raw.total !== undefined || raw.pagador !== undefined || raw.items !== undefined
      ? { lugar: raw.lugar, total: raw.total, pagador: raw.pagador, items: raw.items, warnings: raw.warnings }
      : undefined);

  const draftSanitizado = draftRaw
    ? sanitizarPatch(draftRaw, categorias, subcategorias)
    : { draftPatch: undefined };

  const operations = (raw.operations ?? [])
    .map((op) => sanitizarOperation(op, categorias, subcategorias))
    .filter((op): op is RegistroIaCorrectionOp => Boolean(op));

  const answer = raw.answer ? String(raw.answer).trim() : "";
  const intent = inferirIntent(raw.intent, answer, operations.length);
  const resolution = sanitizarResolution(raw.resolution);
  const warnings = [
    ...(draftSanitizado.draftPatch?.warnings ?? []),
    ...((raw.warnings ?? []).map((w) => String(w))),
  ];

  return NextResponse.json({
    intent,
    answer,
    draftPatch: draftSanitizado.draftPatch,
    operations,
    resolution,
    warnings,
    model: modelo,
  });
}

