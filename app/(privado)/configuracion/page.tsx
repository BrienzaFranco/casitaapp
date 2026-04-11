"use client";

import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BotonInstalarApp } from "@/components/pwa/BotonInstalarApp";
import type { Compra, CompraEditable, DatosImportados, TipoReparto } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SelectorColor } from "@/components/ui/SelectorColor";
import { formatearPeso } from "@/lib/formatear";
import { fechaLocalISO, normalizarTexto } from "@/lib/utiles";
import { guardarColor, ocultarLugar, mostrarLugar } from "@/lib/configuracion";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { usarBalance } from "@/hooks/usarBalance";

type Tab = "categorias" | "subcategorias" | "etiquetas" | "colores" | "lugares" | "importar" | "instalar";

function normalizarCabecera(cabecera: string) {
  return cabecera
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Parsea precio en formato argentino: $500.000,00 → 500000
 */
function parsearPrecioArgentino(str: string): number {
  const limpio = str.replace(/[$\s]/g, "").trim();
  // Formato: 500.000,00 → 500000.00
  const conPunto = limpio.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(conPunto);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Parsea fecha DD/MM/YYYY → YYYY-MM-DD
 */
function parsearFecha(str: string): string {
  const partes = str.trim().split("/");
  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return str.trim();
}

function detectarColumna(fila: Record<string, unknown>, candidatos: string[]) {
  const entrada = Object.entries(fila).find(([clave]) => candidatos.includes(normalizarCabecera(clave)));
  return entrada?.[1];
}

function parsearImportacion(datos: Array<Record<string, unknown>>) {
  return datos.map((fila) => {
    // Detectar precio/monto
    const precioRaw = detectarColumna(fila, ["precio", "monto", "monto_resuelto", "importe"]);
    const monto = typeof precioRaw === "number" ? precioRaw : parsearPrecioArgentino(String(precioRaw ?? 0));
    const expresion = String(detectarColumna(fila, ["expresion_monto", "expresion"]) ?? precioRaw ?? monto);

    // Detectar tipo de reparto (compartido column)
    const compartido = String(detectarColumna(fila, ["compartido", "tipo_reparto", "reparto", "pagador", "tipo"])).toLowerCase();
    let tipoReparto: TipoReparto = "50/50";
    if (compartido.includes("franco") || compartido.includes("fran")) tipoReparto = "solo_franco";
    else if (compartido.includes("fabiola") || compartido.includes("fabi")) tipoReparto = "solo_fabiola";
    else if (compartido.includes("personalizado") || compartido.includes("custom")) tipoReparto = "personalizado";

    // Detectar quien pago
    const quienPagoRaw = String(detectarColumna(fila, ["quien_pago", "pagador", "pago"])).toLowerCase();
    let pagoFranco = monto / 2, pagoFabiola = monto / 2;
    if (quienPagoRaw.includes("franco") || quienPagoRaw.includes("fran")) { pagoFranco = monto; pagoFabiola = 0; }
    else if (quienPagoRaw.includes("fabiola") || quienPagoRaw.includes("fabi")) { pagoFranco = 0; pagoFabiola = monto; }

    return {
      fecha: String(detectarColumna(fila, ["fecha"]) ?? fechaLocalISO()),
      nombre_lugar: String(detectarColumna(fila, ["lugar", "nombre_lugar", "comercio"]) ?? ""),
      categoria: String(detectarColumna(fila, ["categoria"]) ?? ""),
      subcategoria: String(detectarColumna(fila, ["subcategoria"]) ?? ""),
      descripcion: String(detectarColumna(fila, ["descripcion", "detalle", "item"]) ?? ""),
      expresion_monto: expresion,
      monto,
      tipo_reparto: tipoReparto,
      pago_franco: pagoFranco,
      pago_fabiola: pagoFabiola,
      etiquetas: String(detectarColumna(fila, ["etiquetas", "tags"]) ?? "")
        .split(",")
        .map((valor) => valor.trim())
        .filter(Boolean),
    } satisfies DatosImportados;
  });
}

const TABS: { valor: Tab; etiqueta: string }[] = [
  { valor: "categorias", etiqueta: "Categorias" },
  { valor: "subcategorias", etiqueta: "Subcategorias" },
  { valor: "etiquetas", etiqueta: "Etiquetas" },
  { valor: "colores", etiqueta: "Colores" },
  { valor: "lugares", etiqueta: "Lugares" },
  { valor: "importar", etiqueta: "Importar" },
  { valor: "instalar", etiqueta: "Instalar" },
];

function LugaresManager({ compras, nombres }: { compras: Compra[]; nombres: { franco: string; fabiola: string } }) {
  const config = usarConfiguracion();

  const lugaresConteo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of compras) {
      if (c.nombre_lugar && !config.lugaresOcultos.includes(c.nombre_lugar)) {
        mapa.set(c.nombre_lugar, (mapa.get(c.nombre_lugar) ?? 0) + 1);
      }
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [compras, config.lugaresOcultos]);

  async function ocultar(lugar: string) {
    await ocultarLugar(lugar, nombres.franco);
    // Refresh local state
    const nuevos = [...config.lugaresOcultos, lugar];
    config.setLugaresOcultos(nuevos);
    toast.success(`"${lugar}" oculto`);
  }

  async function mostrar(lugar: string) {
    await mostrarLugar(lugar, nombres.franco);
    const nuevos = config.lugaresOcultos.filter(l => l !== lugar);
    config.setLugaresOcultos(nuevos);
  }

  return (
    <div className="space-y-0.5">
      {lugaresConteo.length > 0 ? lugaresConteo.map(([lugar, cantidad]) => (
        <div key={lugar} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low transition-colors">
          <span className="flex-1 font-headline text-sm text-on-surface">{lugar}</span>
          <span className="font-label text-xs tabular-nums text-on-surface-variant">{cantidad} {cantidad === 1 ? "compra" : "compras"}</span>
          <button
            type="button"
            onClick={() => ocultar(lugar)}
            className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant/40 hover:text-error hover:bg-error-container/30 transition-colors"
            title="Ocultar lugar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )) : (
        <p className="font-body text-sm text-on-surface-variant px-3 py-4">No hay lugares registrados todavia.</p>
      )}

      {/* Lugares ocultos */}
      {config.lugaresOcultos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-outline-variant/10">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-3">Ocultos</p>
          {config.lugaresOcultos.map(lugar => (
            <div key={`oculto-${lugar}`} className="flex items-center gap-3 px-3 py-2 opacity-60">
              <span className="flex-1 font-headline text-sm text-on-surface-variant line-through">{lugar}</span>
              <button
                type="button"
                onClick={() => mostrar(lugar)}
                className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                title="Mostrar lugar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PaginaConfiguracion() {
  const categorias = usarCategorias();
  const compras = usarCompras();
  const balance = usarBalance();
  const config = usarConfiguracion();
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", modoOscuro);
  }, [modoOscuro]);

  const [tab, setTab] = useState<Tab>("categorias");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: "", color: "#6366f1", limite_mensual: "" });
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState({ categoria_id: "", nombre: "", limite_mensual: "" });
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState({ nombre: "", color: "#f59e0b" });
  const [datosImportados, setDatosImportados] = useState<DatosImportados[]>([]);
  const [modoImportacion, setModoImportacion] = useState<"excel" | "csv">("excel");
  const [csvRaw, setCsvRaw] = useState("");
  const [csvParsed, setCsvParsed] = useState<CompraEditable[]>([]);

  const previewImportacion = datosImportados.slice(0, 20);
  const subcategoriasFiltradas = categorias.subcategorias.filter((subcategoria) =>
    filtroCategoria ? subcategoria.categoria_id === filtroCategoria : true,
  );

  async function parsearCSV(texto: string) {
    const lineas = texto.trim().split("\n");
    if (lineas.length < 2) {
      toast.error("El CSV debe tener al menos encabezado y una fila de datos");
      return;
    }

    // Detectar separador
    const header = lineas[0];
    const separador = header.includes("\t") ? "\t" : ",";
    const columnas = header.split(separador).map(c => c.trim().toLowerCase());

    // Encontrar indices de columnas
    const idxFecha = columnas.findIndex(c => ["fecha", "date"].includes(c));
    const idxCat = columnas.findIndex(c => ["categoria", "category"].includes(c));
    const idxSubcat = columnas.findIndex(c => ["subcategoria", "subcategoria", "subcategory"].includes(c));
    const idxItem = columnas.findIndex(c => ["item", "detalle", "descripcion", "description"].includes(c));
    const idxPrecio = columnas.findIndex(c => ["precio", "monto", "importe", "price", "amount"].includes(c));
    const idxCompartido = columnas.findIndex(c => ["compartido", "pago", "pagador", "shared"].includes(c));

    if (idxPrecio < 0) {
      toast.error("No se encontro columna de precio. Columnas detectadas: " + columnas.join(", "));
      return;
    }

    const comprasMapa = new Map<string, CompraEditable>();
    const categoriasCreadas = new Map<string, string>();
    const subcategoriasCreadas = new Map<string, string>();

    for (let i = 1; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      if (!linea) continue;

      // Parsear campos respetando comillas
      const campos: string[] = [];
      let campo = "";
      let entreComillas = false;
      for (const char of linea) {
        if (char === '"') { entreComillas = !entreComillas; continue; }
        if (char === separador && !entreComillas) { campos.push(campo.trim()); campo = ""; continue; }
        campo += char;
      }
      campos.push(campo.trim());

      const fecha = idxFecha >= 0 ? parsearFecha(campos[idxFecha]) : new Date().toISOString().slice(0, 10);
      const catNombre = idxCat >= 0 ? campos[idxCat] : "Otros";
      const subcatNombre = idxSubcat >= 0 ? campos[idxSubcat] : "";
      const item = idxItem >= 0 ? campos[idxItem] : "";
      const precioRaw = idxPrecio >= 0 ? campos[idxPrecio] : "0";
      const monto = parsearPrecioArgentino(precioRaw);
      const compartido = idxCompartido >= 0 ? campos[idxCompartido].toLowerCase() : "compartido";

      if (monto <= 0) continue;

      // Determinar tipo de reparto
      let tipoReparto: "50/50" | "solo_franco" | "solo_fabiola" = "50/50";
      let pagadorGeneral: "franco" | "fabiola" | "compartido" = "compartido";
      if (compartido.includes("franco")) {
        tipoReparto = "solo_franco";
        pagadorGeneral = "franco";
      } else if (compartido.includes("fabiola") || compartido.includes("fabi")) {
        tipoReparto = "solo_fabiola";
        pagadorGeneral = "fabiola";
      }

      // Crear categoria si no existe
      let catId = categorias.categorias.find(c => normalizarTexto(c.nombre) === normalizarTexto(catNombre))?.id;
      if (!catId) {
        const cacheKey = normalizarTexto(catNombre);
        catId = categoriasCreadas.get(cacheKey);
        if (!catId) {
          try {
            const nueva = await categorias.crearCategoria({ nombre: catNombre, color: "#6b7280", limite_mensual: null });
            catId = nueva.id;
            categoriasCreadas.set(cacheKey, catId);
          } catch { catId = ""; }
        }
      }

      // Crear subcategoria si no existe
      let subcatId = "";
      if (subcatNombre && catId) {
        subcatId = categorias.subcategorias.find(s => s.categoria_id === catId && normalizarTexto(s.nombre) === normalizarTexto(subcatNombre))?.id ?? "";
        if (!subcatId) {
          const subKey = `${catId}-${normalizarTexto(subcatNombre)}`;
          subcatId = subcategoriasCreadas.get(subKey) ?? "";
          if (!subcatId) {
            try {
              const nueva = await categorias.crearSubcategoria({ categoria_id: catId, nombre: subcatNombre, limite_mensual: null });
              subcatId = nueva.id;
              subcategoriasCreadas.set(subKey, subcatId);
            } catch { subcatId = ""; }
          }
        }
      }

      // Agrupar por fecha (como una compra por dia sin lugar)
      const clave = fecha;
      const compraExistente = comprasMapa.get(clave);

      const repartoPago = tipoReparto === "solo_franco"
        ? { pago_franco: monto, pago_fabiola: 0 }
        : tipoReparto === "solo_fabiola"
          ? { pago_franco: 0, pago_fabiola: monto }
          : { pago_franco: monto / 2, pago_fabiola: monto / 2 };

      if (compraExistente) {
        compraExistente.items.push({
          descripcion: item || `${catNombre}${subcatNombre ? ` - ${subcatNombre}` : ""}`,
          categoria_id: catId, subcategoria_id: subcatId,
          expresion_monto: String(monto), monto_resuelto: monto,
          tipo_reparto: tipoReparto, ...repartoPago, etiquetas_ids: [],
        });
        // Actualizar pagador si es consistente
        if (compraExistente.pagador_general !== pagadorGeneral) {
          compraExistente.pagador_general = "compartido";
        }
      } else {
        comprasMapa.set(clave, {
          id: undefined, fecha, nombre_lugar: "",
          notas: "Importado desde CSV historico", registrado_por: "Importacion",
          pagador_general: pagadorGeneral, estado: "confirmada", etiquetas_compra_ids: [],
          items: [{
            descripcion: item || `${catNombre}${subcatNombre ? ` - ${subcatNombre}` : ""}`,
            categoria_id: catId, subcategoria_id: subcatId,
            expresion_monto: String(monto), monto_resuelto: monto,
            tipo_reparto: tipoReparto, ...repartoPago, etiquetas_ids: [],
          }],
        });
      }
    }

    const resultado = [...comprasMapa.values()];
    setCsvParsed(resultado);
    toast.success(`${resultado.length} compras detectadas en el CSV`);
  }

  async function confirmarImportacionCSV() {
    if (!csvParsed.length) return;
    for (const compra of csvParsed) {
      await compras.guardarCompra(compra);
    }
    toast.success(`${csvParsed.length} compras importadas`);
    setCsvParsed([]);
    setCsvRaw("");
    await categorias.recargar();
  }

  async function importarExcel(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    const buffer = await archivo.arrayBuffer();
    const libro = XLSX.read(buffer);
    const primeraHoja = libro.SheetNames[0] ? libro.Sheets[libro.SheetNames[0]] : null;
    if (!primeraHoja) return;
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(primeraHoja);
    setDatosImportados(parsearImportacion(filas));
  }

  async function confirmarImportacion() {
    if (!datosImportados.length) return;
    const comprasAgrupadas = new Map<string, CompraEditable>();
    for (const fila of datosImportados) {
      const categoria = categorias.categorias.find((item) => item.nombre === fila.categoria);
      const subcategoria = categorias.subcategorias.find((item) => item.nombre === fila.subcategoria);
      const etiquetas = categorias.etiquetas
        .filter((item) => fila.etiquetas.includes(item.nombre))
        .map((item) => item.id);
      const clave = `${fila.fecha}-${fila.nombre_lugar || "sin-lugar"}`;
      const compra = comprasAgrupadas.get(clave) ?? {
        fecha: fila.fecha, nombre_lugar: fila.nombre_lugar, notas: "Importado desde Excel",
        registrado_por: "Importacion", pagador_general: "compartido", estado: "confirmada",
        etiquetas_compra_ids: [], items: [],
      };
      compra.items.push({
        descripcion: fila.descripcion, categoria_id: categoria?.id ?? "", subcategoria_id: subcategoria?.id ?? "",
        expresion_monto: fila.expresion_monto, monto_resuelto: fila.monto, tipo_reparto: fila.tipo_reparto,
        pago_franco: fila.pago_franco, pago_fabiola: fila.pago_fabiola, etiquetas_ids: etiquetas,
      });
      comprasAgrupadas.set(clave, compra);
    }
    for (const compra of comprasAgrupadas.values()) {
      await compras.guardarCompra(compra);
    }
    toast.success("Importacion terminada");
    setDatosImportados([]);
  }

  if (categorias.cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">Configuracion</h2>
          <p className="font-body text-sm text-on-surface-variant">Categorias, colores, importacion.</p>
        </div>
        <button type="button" onClick={() => setModoOscuro(!modoOscuro)}
          className="h-8 px-3 rounded-full bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-highest transition-colors">
          {modoOscuro ? "☀️ Claro" : "🌙 Oscuro"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide border-b border-outline-variant/15 -mx-4 px-4">
        {TABS.map(({ valor, etiqueta }) => (
          <button key={valor} type="button" onClick={() => setTab(valor)}
            className={`text-xs font-medium pb-1 whitespace-nowrap border-b-2 transition-colors ${tab === valor ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
            {etiqueta}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-lg border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
        {tab === "categorias" && (
          <section className="space-y-4 p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Nombre</label>
                  <input className="w-full bg-transparent border-none p-0 text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                    value={nuevaCategoria.nombre}
                    onChange={(event) => setNuevaCategoria((anterior) => ({ ...anterior, nombre: event.target.value }))}
                    placeholder="Nombre de la categoria" />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Color</label>
                  <input className="h-8 w-full cursor-pointer rounded bg-transparent border-none p-0 outline-none"
                    type="color" name="categoria-color" value={nuevaCategoria.color}
                    onChange={(event) => setNuevaCategoria((anterior) => ({ ...anterior, color: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Limite mensual</label>
                  <input className="w-full bg-transparent border-none p-0 text-sm text-on-surface tabular-nums outline-none placeholder:text-on-surface-variant"
                    type="number" value={nuevaCategoria.limite_mensual}
                    onChange={(event) => setNuevaCategoria((anterior) => ({ ...anterior, limite_mensual: event.target.value }))}
                    placeholder="Sin limite" />
                </div>
              </div>
              <Boton anchoCompleto onClick={async () => {
                await categorias.crearCategoria({
                  nombre: nuevaCategoria.nombre, color: nuevaCategoria.color,
                  limite_mensual: nuevaCategoria.limite_mensual ? Number(nuevaCategoria.limite_mensual) : null,
                });
                setNuevaCategoria({ nombre: "", color: "#6366f1", limite_mensual: "" });
                toast.success("Categoria creada");
              }}>
                Agregar nueva categoria
              </Boton>
            </div>

            <div className="space-y-0.5">
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1">
                Categorias existentes
              </p>
              {categorias.categorias.map((categoria) => (
                <div key={categoria.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low transition-colors">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: categoria.color }} />
                  <input className="flex-1 bg-transparent border-none p-0 text-sm font-semibold text-on-surface outline-none"
                    defaultValue={categoria.nombre}
                    onBlur={(event) => void categorias.actualizarCategoria(categoria.id, { nombre: event.target.value })} />
                  <input className="tabular-nums w-24 bg-transparent border-none p-0 text-right text-sm text-on-surface-variant outline-none"
                    defaultValue={String(categoria.limite_mensual ?? "")}
                    onBlur={(event) => void categorias.actualizarCategoria(categoria.id, {
                      limite_mensual: event.target.value ? Number(event.target.value) : null,
                    })}
                    placeholder="Sin limite" />
                  <button type="button" className="w-8 h-8 flex items-center justify-center rounded text-error hover:bg-error-container"
                    onClick={() => void categorias.eliminarCategoria(categoria.id).catch(() => {
                      toast.error("No se puede eliminar si tiene items asociados");
                    })}
                    title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "subcategorias" && (
          <section className="space-y-4 p-4">
            <div className="space-y-1">
              <label className="font-label text-[10px] uppercase tracking-wider text-outline">Filtrar por categoria</label>
              <select className="w-full bg-transparent border border-outline-variant/30 rounded px-3 py-2 text-sm text-on-surface outline-none"
                value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)}>
                <option value="">Todas</option>
                {categorias.categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Categoria</label>
                  <select className="w-full bg-transparent border border-outline-variant/30 rounded px-3 py-2 text-sm text-on-surface outline-none"
                    value={nuevaSubcategoria.categoria_id}
                    onChange={(event) => setNuevaSubcategoria((anterior) => ({ ...anterior, categoria_id: event.target.value }))}>
                    <option value="">Seleccionar</option>
                    {categorias.categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Nombre</label>
                  <input className="w-full bg-transparent border-none p-0 text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                    value={nuevaSubcategoria.nombre}
                    onChange={(event) => setNuevaSubcategoria((anterior) => ({ ...anterior, nombre: event.target.value }))}
                    placeholder="Nombre de la subcategoria" />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Limite mensual</label>
                  <input className="w-full bg-transparent border-none p-0 text-sm text-on-surface tabular-nums outline-none placeholder:text-on-surface-variant"
                    type="number" value={nuevaSubcategoria.limite_mensual}
                    onChange={(event) => setNuevaSubcategoria((anterior) => ({ ...anterior, limite_mensual: event.target.value }))}
                    placeholder="Sin limite" />
                </div>
              </div>
              <Boton anchoCompleto onClick={async () => {
                await categorias.crearSubcategoria({
                  categoria_id: nuevaSubcategoria.categoria_id, nombre: nuevaSubcategoria.nombre,
                  limite_mensual: nuevaSubcategoria.limite_mensual ? Number(nuevaSubcategoria.limite_mensual) : null,
                });
                setNuevaSubcategoria({ categoria_id: "", nombre: "", limite_mensual: "" });
                toast.success("Subcategoria creada");
              }}>
                Agregar subcategoria
              </Boton>
            </div>

            <div className="space-y-0.5">
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1">
                Subcategorias existentes
              </p>
              {subcategoriasFiltradas.map((subcategoria) => (
                <div key={subcategoria.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low transition-colors">
                  <input className="flex-1 bg-transparent border-none p-0 text-sm font-semibold text-on-surface outline-none"
                    defaultValue={subcategoria.nombre}
                    onBlur={(event) => void categorias.actualizarSubcategoria(subcategoria.id, { nombre: event.target.value })} />
                  <input className="tabular-nums w-24 bg-transparent border-none p-0 text-right text-sm text-on-surface-variant outline-none"
                    defaultValue={String(subcategoria.limite_mensual ?? "")}
                    onBlur={(event) => void categorias.actualizarSubcategoria(subcategoria.id, {
                      limite_mensual: event.target.value ? Number(event.target.value) : null,
                    })}
                    placeholder="Sin limite" />
                  <button type="button" className="w-8 h-8 flex items-center justify-center rounded text-error hover:bg-error-container"
                    onClick={() => void categorias.eliminarSubcategoria(subcategoria.id).catch(() => {
                      toast.error("No se puede eliminar si tiene items asociados");
                    })}
                    title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "etiquetas" && (
          <section className="space-y-4 p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Nombre</label>
                  <input className="w-full bg-transparent border-none p-0 text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                    value={nuevaEtiqueta.nombre}
                    onChange={(event) => setNuevaEtiqueta((anterior) => ({ ...anterior, nombre: event.target.value }))}
                    placeholder="Nombre de la etiqueta" />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-wider text-outline">Color</label>
                  <input className="h-8 w-full cursor-pointer rounded bg-transparent border-none p-0 outline-none"
                    type="color" name="etiqueta-color" value={nuevaEtiqueta.color}
                    onChange={(event) => setNuevaEtiqueta((anterior) => ({ ...anterior, color: event.target.value }))} />
                </div>
              </div>
              <Boton anchoCompleto onClick={async () => {
                await categorias.crearEtiqueta(nuevaEtiqueta);
                setNuevaEtiqueta({ nombre: "", color: "#f59e0b" });
                toast.success("Etiqueta creada");
              }}>
                Agregar etiqueta
              </Boton>
            </div>

            <div className="space-y-0.5">
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1">
                Etiquetas existentes
              </p>
              {categorias.etiquetas.map((etiqueta) => (
                <div key={etiqueta.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low transition-colors">
                  <Badge color={etiqueta.color}>{etiqueta.nombre}</Badge>
                  <input className="flex-1 bg-transparent border-none p-0 text-sm font-semibold text-on-surface outline-none"
                    defaultValue={etiqueta.nombre}
                    onBlur={(event) => void categorias.actualizarEtiqueta(etiqueta.id, { nombre: event.target.value })} />
                  <input type="color" name={`etiqueta-color-${etiqueta.id}`} className="h-6 w-6 cursor-pointer rounded bg-transparent border-none p-0 outline-none"
                    defaultValue={etiqueta.color}
                    onBlur={(event) => void categorias.actualizarEtiqueta(etiqueta.id, { color: event.target.value })} />
                  <button type="button" className="w-8 h-8 flex items-center justify-center rounded text-error hover:bg-error-container"
                    onClick={() => void categorias.eliminarEtiqueta(etiqueta.id).catch(() => {
                      toast.error("No se puede eliminar si esta usada");
                    })}
                    title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "colores" && (
          <section className="space-y-4 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Colores de cada persona
            </p>
            <p className="font-body text-xs text-on-surface-variant">
              Estos colores se usan en el reparto, graficos y toda la app. Se comparten entre todos los dispositivos.
            </p>

            {(["franco", "fabiola"] as const).map((persona) => {
              const color = config.colores[persona];
              const label = persona === "franco" ? balance.nombres.franco : balance.nombres.fabiola;
              return (
                <div key={persona} className="space-y-2 p-3 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 0 2px var(--color-surface-container-low, #1e1d1b), 0 0 0 3px ${color}` }} />
                    <span className="font-headline text-sm font-semibold text-on-surface flex-1">{label}</span>
                  </div>
                  <SelectorColor
                    color={color}
                    onChange={async (nuevoColor) => {
                      config.setColores({ ...config.colores, [persona]: nuevoColor });
                      await guardarColor(persona, nuevoColor, config.nombreUsuario);
                    }}
                  />
                </div>
              );
            })}
          </section>
        )}

        {tab === "lugares" && (
          <section className="space-y-4 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Lugares frecuentes
            </p>
            <p className="font-body text-xs text-on-surface-variant">
              Tocá la estrella para marcar favoritos. Los mas usados aparecen primero.
            </p>
            <LugaresManager compras={compras.compras} nombres={balance.nombres} />
          </section>
        )}

        {tab === "importar" && (
          <section className="space-y-4 p-4">
            {/* Selector de modo */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setModoImportacion("csv")}
                className={`flex-1 h-9 rounded-lg font-label text-xs font-bold uppercase tracking-wider transition-colors ${modoImportacion === "csv" ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                CSV
              </button>
              <button type="button" onClick={() => setModoImportacion("excel")}
                className={`flex-1 h-9 rounded-lg font-label text-xs font-bold uppercase tracking-wider transition-colors ${modoImportacion === "excel" ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                Excel (.xlsx)
              </button>
            </div>

            {modoImportacion === "csv" ? (
              <>
                {/* Importacion CSV - pegar o archivo */}
                <div className="space-y-3">
                  <div>
                    <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Pega tu CSV o subí archivo</p>
                    <textarea
                      value={csvRaw}
                      onChange={e => setCsvRaw(e.target.value)}
                      placeholder={`Fecha,Categoria,Subcategoria,Item,Tipo,Precio,Compartido\n1/11/2025,Casa,Alquiler,Alquiler sin expensas,Egreso,$500.000,00,Compartido`}
                      className="w-full min-h-[120px] rounded-lg bg-surface-container-low border border-outline-variant/30 px-3 py-2 font-mono text-xs text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-secondary resize-y"
                    />
                    <label className="mt-2 flex items-center gap-2 h-9 px-3 rounded bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface cursor-pointer hover:bg-surface-container-highest transition-colors">
                      <Upload className="h-4 w-4" /> Subir archivo CSV
                      <input type="file" name="csv-file" accept=".csv,.txt" onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        setCsvRaw(text);
                      }} className="hidden" />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => parsearCSV(csvRaw)} disabled={!csvRaw.trim()}
                      className="flex-1 h-9 rounded bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface disabled:opacity-40 hover:bg-surface-container-highest transition-colors">
                      Previsualizar
                    </button>
                    {csvParsed.length > 0 && (
                      <button type="button" onClick={() => confirmarImportacionCSV()}
                        className="flex-1 h-9 rounded bg-secondary font-label text-[10px] font-bold uppercase tracking-wider text-on-secondary hover:bg-secondary/90 transition-colors">
                        Importar ({csvParsed.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview CSV */}
                {csvParsed.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1">
                      {csvParsed.length} compras detectadas
                    </p>
                    {csvParsed.slice(0, 10).map((c, i) => (
                      <div key={i} className="py-2 px-3 bg-surface-container-low rounded-lg">
                        <p className="font-label text-xs tabular-nums text-on-surface">{c.fecha} · {c.items.length} item(s)</p>
                        <p className="font-label text-[10px] text-on-surface-variant">
                          Pago: {c.pagador_general === "franco" ? "Franco" : c.pagador_general === "fabiola" ? "Fabiola" : "Ambos"}
                          {" · "}Total: {formatearPeso(c.items.reduce((a, it) => a + it.monto_resuelto, 0))}
                        </p>
                      </div>
                    ))}
                    {csvParsed.length > 10 && (
                      <p className="font-label text-[10px] text-on-surface-variant px-3">... y {csvParsed.length - 10} mas</p>
                    )}
                  </div>
                )}

                {csvParsed.length === 0 && csvRaw.length > 0 && (
                  <p className="font-body text-center text-sm text-on-surface-variant">
                    Toca &ldquo;Previsualizar&rdquo; para analizar el CSV.
                  </p>
                )}
                {csvParsed.length === 0 && !csvRaw && (
                  <p className="font-body text-center text-sm text-on-surface-variant">
                    Formato: Fecha,Categoria,Subcategoria,Item,Tipo,Precio,Compartido
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Importacion Excel - mismo formato */}
                <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-lg text-center transition-colors duration-150 hover:bg-surface-container-low">
                  <Upload className="h-5 w-5 text-secondary" />
                  <span className="font-headline text-sm font-semibold text-on-surface">Seleccionar .xlsx</span>
                  <span className="font-body text-xs text-on-surface-variant">
                    Mismas columnas: Fecha, Categoria, Subcategoria, Item, Tipo, Precio, Compartido
                  </span>
                  <input type="file" name="excel-file" accept=".xlsx" onChange={(event) => void importarExcel(event)} className="hidden" />
                </label>

                {previewImportacion.length ? (
                  <>
                    <div className="space-y-1">
                      <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1">
                        Vista previa ({previewImportacion.length} registros)
                      </p>
                      {previewImportacion.map((fila, indice) => (
                        <div key={`${fila.fecha}-${indice}`}
                          className="py-2 px-3 bg-surface-container-low rounded-lg transition-all duration-150">
                          <p className="tabular-nums font-headline text-sm font-semibold text-on-surface">
                            {fila.fecha}{" "}
                            <span className="text-on-surface-variant/60">·</span>{" "}
                            {fila.nombre_lugar || "Sin lugar"}
                          </p>
                          <p className="font-body text-xs text-on-surface-variant">
                            {fila.categoria} / {fila.subcategoria} · {fila.descripcion} · {fila.expresion_monto}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Boton variante="secundario" anchoCompleto onClick={() => void confirmarImportacion()}>
                      Confirmar importacion
                    </Boton>
                  </>
                ) : (
                  <p className="font-body text-center text-sm text-on-surface-variant">
                    Sube un archivo para ver la preview del mapeo.
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {tab === "instalar" && (
          <section className="space-y-4 p-4">
            <div className="flex items-start gap-4 py-2 px-3 bg-surface-container-low rounded-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                <Download className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-headline text-base font-semibold text-on-surface">Instalar CasitaApp</h3>
                <p className="font-body text-sm text-on-surface-variant">
                  La instalacion quedo dentro de Configuracion para que no interrumpa al entrar. Desde aca podes
                  instalarla cuando quieras en celular o escritorio.
                </p>
              </div>
            </div>
            <BotonInstalarApp />
          </section>
        )}
      </div>
    </section>
  );
}
