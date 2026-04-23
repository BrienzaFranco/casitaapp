import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ToolName,
  ToolResult,
  ParamsGastosPorCategoria,
  ParamsGastosPorMes,
  ParamsComprasRecientes,
  ParamsPresupuestoStatus,
  ParamsTopGastos,
  ParamsBuscarCompras,
} from "./contracts-chat";
import { mesLocalISO } from "@/lib/utiles";

type Cliente = SupabaseClient;

// ─── Dispatcher ────────────────────────────────────────────────────
export async function ejecutarTool(
  cliente: Cliente,
  tool: ToolName,
  params: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    let data: unknown;
    switch (tool) {
      case "gastos_por_categoria":
        data = await toolGastosPorCategoria(cliente, params as ParamsGastosPorCategoria);
        break;
      case "gastos_por_mes":
        data = await toolGastosPorMes(cliente, params as ParamsGastosPorMes);
        break;
      case "compras_recientes":
        data = await toolComprasRecientes(cliente, params as ParamsComprasRecientes);
        break;
      case "balance_actual":
        data = await toolBalanceActual(cliente);
        break;
      case "presupuesto_status":
        data = await toolPresupuestoStatus(cliente, params as ParamsPresupuestoStatus);
        break;
      case "top_gastos":
        data = await toolTopGastos(cliente, params as ParamsTopGastos);
        break;
      case "buscar_compras":
        data = await toolBuscarCompras(cliente, params as unknown as ParamsBuscarCompras);
        break;
      default:
        return { ok: false, tool, error: `Tool desconocido: ${tool}` };
    }
    return { ok: true, tool, data };
  } catch (e) {
    return { ok: false, tool, error: String(e) };
  }
}

// ─── gastos_por_categoria ──────────────────────────────────────────
async function toolGastosPorCategoria(cliente: Cliente, params: ParamsGastosPorCategoria) {
  const mes = params.mes ?? mesLocalISO();
  const desde = `${mes}-01`;
  const hasta = finDelMes(mes);

  const { data: items } = await cliente
    .from("items")
    .select("monto_resuelto, categoria_id, categorias(nombre)")
    .gte("creado_en", desde)
    .lte("creado_en", hasta);

  const acumulado = new Map<string, { nombre: string; total: number; cantidad: number }>();
  for (const item of items ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = item.categorias as any;
    const nombre = cat?.nombre ?? "Sin categoría";
    const actual = acumulado.get(nombre) ?? { nombre, total: 0, cantidad: 0 };
    actual.total += item.monto_resuelto;
    actual.cantidad += 1;
    acumulado.set(nombre, actual);
  }

  const categorias = [...acumulado.values()].sort((a, b) => b.total - a.total);
  const total = categorias.reduce((acc, c) => acc + c.total, 0);

  // Mes anterior para comparación
  const mesAnt = mesAnterior(mes);
  const desdeAnt = `${mesAnt}-01`;
  const hastaAnt = finDelMes(mesAnt);
  const { data: itemsAnt } = await cliente
    .from("items")
    .select("monto_resuelto")
    .gte("creado_en", desdeAnt)
    .lte("creado_en", hastaAnt);
  const totalAnterior = (itemsAnt ?? []).reduce((acc, i) => acc + i.monto_resuelto, 0);

  return {
    mes,
    total,
    totalAnterior,
    variacion: totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior * 100).toFixed(1) : null,
    categorias: categorias.map((c) => ({
      nombre: c.nombre,
      total: c.total,
      cantidad: c.cantidad,
      porcentaje: total > 0 ? ((c.total / total) * 100).toFixed(1) : "0",
    })),
  };
}

// ─── gastos_por_mes ────────────────────────────────────────────────
async function toolGastosPorMes(cliente: Cliente, params: ParamsGastosPorMes) {
  const año = params.año ?? String(new Date().getFullYear());
  const desde = `${año}-01-01`;
  const hasta = `${año}-12-31`;

  const { data: items } = await cliente
    .from("items")
    .select("monto_resuelto, creado_en")
    .gte("creado_en", desde)
    .lte("creado_en", hasta);

  const porMes = new Map<string, number>();
  for (const item of items ?? []) {
    const mes = item.creado_en.slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + item.monto_resuelto);
  }

  return {
    año,
    meses: [...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, total })),
  };
}

// ─── compras_recientes ─────────────────────────────────────────────
async function toolComprasRecientes(cliente: Cliente, params: ParamsComprasRecientes) {
  const limite = Math.min(params.limite ?? 5, 20);

  const { data: compras } = await cliente
    .from("compras")
    .select("id, fecha, nombre_lugar, pagador_general, estado, creado_en, items(monto_resuelto, descripcion, categorias(nombre))")
    .order("creado_en", { ascending: false })
    .limit(limite);

  return {
    compras: (compras ?? []).map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (c.items ?? []) as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = items.reduce((acc: number, i: any) => acc + (i.monto_resuelto ?? 0), 0);
      return {
        fecha: c.fecha,
        lugar: c.nombre_lugar,
        pagador: c.pagador_general,
        estado: c.estado,
        total,
        cantidadItems: items.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categorias: [...new Set(items.map((i: any) => i.categorias?.nombre ?? "Sin cat"))],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: items.map((i: any) => ({
          descripcion: i.descripcion,
          monto: i.monto_resuelto,
          categoria: i.categorias?.nombre,
        })),
      };
    }),
  };
}

// ─── balance_actual ────────────────────────────────────────────────
async function toolBalanceActual(cliente: Cliente) {
  // Obtener todas las compras confirmadas con items
  const { data: compras } = await cliente
    .from("compras")
    .select("pagador_general, items(monto_resuelto, pago_franco, pago_fabiola)")
    .eq("estado", "confirmada");

  let total = 0;
  let francoPagoReal = 0;
  let fabiolaPagoReal = 0;
  let francoCorresponde = 0;
  let fabiolaCorresponde = 0;

  for (const compra of compras ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (compra.items ?? []) as any[];
    for (const item of items) {
      total += item.monto_resuelto ?? 0;
      francoCorresponde += item.pago_franco ?? 0;
      fabiolaCorresponde += item.pago_fabiola ?? 0;

      if (compra.pagador_general === "franco") {
        francoPagoReal += item.monto_resuelto;
      } else if (compra.pagador_general === "fabiola") {
        fabiolaPagoReal += item.monto_resuelto;
      } else {
        francoPagoReal += item.pago_franco;
        fabiolaPagoReal += item.pago_fabiola;
      }
    }
  }

  const balance = Number((francoPagoReal - francoCorresponde).toFixed(2));

  let deudor: string | null = null;
  let acreedor: string | null = null;
  let montoAbs = 0;

  if (balance > 0.01) {
    deudor = "Fabiola";
    acreedor = "Franco";
    montoAbs = balance;
  } else if (balance < -0.01) {
    deudor = "Franco";
    acreedor = "Fabiola";
    montoAbs = Math.abs(balance);
  }

  // Último corte de settlement
  const { data: ultimoCorte } = await cliente
    .from("settlement_cuts")
    .select("fecha_corte, nota, activo")
    .order("fecha_corte", { ascending: false })
    .limit(1);

  return {
    totalHistorico: total,
    francoPago: francoPagoReal,
    fabiolaPago: fabiolaPagoReal,
    francoCorresponde,
    fabiolaCorresponde,
    balance,
    deudor,
    acreedor,
    montoAdeudado: montoAbs,
    ultimaQuedaAMano: ultimoCorte?.[0] ?? null,
  };
}

// ─── presupuesto_status ────────────────────────────────────────────
async function toolPresupuestoStatus(cliente: Cliente, params: ParamsPresupuestoStatus) {
  const mes = params.mes ?? mesLocalISO();
  const desde = `${mes}-01`;
  const hasta = finDelMes(mes);

  const [{ data: categorias }, { data: items }] = await Promise.all([
    cliente.from("categorias").select("id, nombre, limite_mensual, color"),
    cliente
      .from("items")
      .select("categoria_id, monto_resuelto")
      .gte("creado_en", desde)
      .lte("creado_en", hasta),
  ]);

  const gastoPorCategoria = new Map<string, number>();
  for (const item of items ?? []) {
    if (!item.categoria_id) continue;
    gastoPorCategoria.set(
      item.categoria_id,
      (gastoPorCategoria.get(item.categoria_id) ?? 0) + item.monto_resuelto,
    );
  }

  const resultado = (categorias ?? [])
    .filter((c) => c.limite_mensual != null && c.limite_mensual > 0)
    .map((c) => {
      const gastado = gastoPorCategoria.get(c.id) ?? 0;
      const limite = c.limite_mensual!;
      const porcentaje = ((gastado / limite) * 100).toFixed(1);
      const restante = limite - gastado;
      return {
        nombre: c.nombre,
        color: c.color,
        gastado,
        limite,
        porcentaje,
        restante,
        excedido: gastado > limite,
      };
    })
    .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje));

  return { mes, presupuestos: resultado };
}

// ─── top_gastos ────────────────────────────────────────────────────
async function toolTopGastos(cliente: Cliente, params: ParamsTopGastos) {
  const mes = params.mes ?? mesLocalISO();
  const desde = `${mes}-01`;
  const hasta = finDelMes(mes);
  const limite = Math.min(params.limite ?? 5, 20);

  const { data: compras } = await cliente
    .from("compras")
    .select("id, fecha, nombre_lugar, pagador_general, items(monto_resuelto, descripcion, categorias(nombre))")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .eq("estado", "confirmada");

  const comprasConTotal = (compras ?? []).map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (c.items ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = items.reduce((acc: number, i: any) => acc + (i.monto_resuelto ?? 0), 0);
    return {
      fecha: c.fecha,
      lugar: c.nombre_lugar ?? "Sin lugar",
      pagador: c.pagador_general,
      total,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categorias: [...new Set(items.map((i: any) => i.categorias?.nombre ?? "Sin cat"))],
    };
  });

  comprasConTotal.sort((a, b) => b.total - a.total);

  return {
    mes,
    topGastos: comprasConTotal.slice(0, limite),
  };
}

// ─── buscar_compras ────────────────────────────────────────────────
async function toolBuscarCompras(cliente: Cliente, params: ParamsBuscarCompras) {
  const texto = (params.texto ?? "").trim();
  const limite = Math.min(params.limite ?? 10, 30);

  if (!texto) return { error: "Falta texto de búsqueda", compras: [] };

  // Buscar por lugar
  const { data: porLugar } = await cliente
    .from("compras")
    .select("id, fecha, nombre_lugar, pagador_general, estado, items(monto_resuelto, descripcion, categorias(nombre))")
    .ilike("nombre_lugar", `%${texto}%`)
    .order("fecha", { ascending: false })
    .limit(limite);

  // Buscar por descripción de item
  const { data: porItem } = await cliente
    .from("items")
    .select("descripcion, monto_resuelto, compra_id, compras(id, fecha, nombre_lugar, pagador_general, estado, items(monto_resuelto, descripcion, categorias(nombre)))")
    .ilike("descripcion", `%${texto}%`)
    .limit(limite);

  // Deduplicar por compra_id
  const idsVistos = new Set<string>();
  const compras: Array<{
    fecha: string;
    lugar: string | null;
    pagador: string;
    estado: string;
    total: number;
    categorias: string[];
    coincidencia: string;
  }> = [];

  for (const c of porLugar ?? []) {
    if (idsVistos.has(c.id)) continue;
    idsVistos.add(c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (c.items ?? []) as any[];
    compras.push({
      fecha: c.fecha,
      lugar: c.nombre_lugar,
      pagador: c.pagador_general,
      estado: c.estado,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total: items.reduce((acc: number, i: any) => acc + (i.monto_resuelto ?? 0), 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categorias: [...new Set(items.map((i: any) => i.categorias?.nombre ?? "Sin cat"))],
      coincidencia: "lugar",
    });
  }

  for (const item of porItem ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compra = item.compras as any;
    if (!compra || idsVistos.has(compra.id)) continue;
    idsVistos.add(compra.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (compra.items ?? []) as any[];
    compras.push({
      fecha: compra.fecha,
      lugar: compra.nombre_lugar,
      pagador: compra.pagador_general,
      estado: compra.estado,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total: items.reduce((acc: number, i: any) => acc + (i.monto_resuelto ?? 0), 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categorias: [...new Set(items.map((i: any) => i.categorias?.nombre ?? "Sin cat"))],
      coincidencia: `item: ${item.descripcion}`,
    });
  }

  compras.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return { texto, cantidad: compras.length, compras: compras.slice(0, limite) };
}

// ─── Helpers ───────────────────────────────────────────────────────
function mesAnterior(mes: string): string {
  const [año, m] = mes.split("-").map(Number);
  if (m === 1) return `${año - 1}-12`;
  return `${año}-${String(m - 1).padStart(2, "0")}`;
}

function finDelMes(mes: string): string {
  const [año, m] = mes.split("-").map(Number);
  const ultimoDia = new Date(año, m, 0).getDate();
  return `${mes}-${String(ultimoDia).padStart(2, "0")}`;
}
