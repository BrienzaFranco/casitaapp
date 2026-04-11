"use client";

import type { ChangeEvent } from "react";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BotonInstalarApp } from "@/components/pwa/BotonInstalarApp";
import type { Compra, CompraEditable, DatosImportados, TipoReparto } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";
import { Skeleton } from "@/components/ui/Skeleton";
import { fechaLocalISO } from "@/lib/utiles";
import { ocultarLugar, mostrarLugar } from "@/lib/configuracion";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";

type Tab = "categorias" | "subcategorias" | "etiquetas" | "colores" | "lugares" | "importar" | "instalar";

function normalizarCabecera(cabecera: string) {
  return cabecera
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectarColumna(fila: Record<string, unknown>, candidatos: string[]) {
  const entrada = Object.entries(fila).find(([clave]) => candidatos.includes(normalizarCabecera(clave)));
  return entrada?.[1];
}

function parsearImportacion(datos: Array<Record<string, unknown>>) {
  return datos.map((fila) => {
    const monto = Number(detectarColumna(fila, ["monto", "monto_resuelto", "importe"]) ?? 0);
    const expresion = String(detectarColumna(fila, ["expresion_monto", "expresion", "monto"]) ?? monto);
    const tipo = String(detectarColumna(fila, ["tipo_reparto", "reparto"]) ?? "50/50").toLowerCase();
    const tipoReparto: TipoReparto =
      tipo === "solo_franco" || tipo === "solo_fabiola" || tipo === "personalizado" || tipo === "50/50"
        ? (tipo as TipoReparto)
        : "50/50";

    return {
      fecha: String(detectarColumna(fila, ["fecha"]) ?? fechaLocalISO()),
      nombre_lugar: String(detectarColumna(fila, ["lugar", "nombre_lugar", "comercio"]) ?? ""),
      categoria: String(detectarColumna(fila, ["categoria"]) ?? ""),
      subcategoria: String(detectarColumna(fila, ["subcategoria"]) ?? ""),
      descripcion: String(detectarColumna(fila, ["descripcion", "detalle"]) ?? ""),
      expresion_monto: expresion,
      monto,
      tipo_reparto: tipoReparto,
      pago_franco: Number(detectarColumna(fila, ["pago_franco", "franco"]) ?? monto / 2),
      pago_fabiola: Number(detectarColumna(fila, ["pago_fabiola", "fabiola"]) ?? monto / 2),
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

function LugaresManager({ compras }: { compras: Compra[] }) {
  const config = usarConfiguracion();
  const nombreUsuario = config.nombreUsuario;

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
    await ocultarLugar(lugar, nombreUsuario);
    // Refresh local state
    const nuevos = [...config.lugaresOcultos, lugar];
    config.setLugaresOcultos(nuevos);
    toast.success(`"${lugar}" oculto`);
  }

  async function mostrar(lugar: string) {
    await mostrarLugar(lugar, nombreUsuario);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const config = usarConfiguracion();
  const [tab, setTab] = useState<Tab>("categorias");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: "", color: "#6366f1", limite_mensual: "" });
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState({ categoria_id: "", nombre: "", limite_mensual: "" });
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState({ nombre: "", color: "#f59e0b" });
  const [datosImportados, setDatosImportados] = useState<DatosImportados[]>([]);

  const previewImportacion = datosImportados.slice(0, 20);
  const subcategoriasFiltradas = categorias.subcategorias.filter((subcategoria) =>
    filtroCategoria ? subcategoria.categoria_id === filtroCategoria : true,
  );

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
      <div className="space-y-1">
        <h2 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">Configuracion</h2>
        <p className="font-body text-sm text-on-surface-variant">Categorias, subcategorias, etiquetas e importacion.</p>
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
                    type="color" value={nuevaCategoria.color}
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
                    type="color" value={nuevaEtiqueta.color}
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
                  <input type="color" className="h-6 w-6 cursor-pointer rounded bg-transparent border-none p-0 outline-none"
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

        {tab === "lugares" && (
          <section className="space-y-4 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Lugares frecuentes
            </p>
            <p className="font-body text-xs text-on-surface-variant">
              Tocá la estrella para marcar favoritos. Los mas usados aparecen primero.
            </p>
            <LugaresManager compras={compras.compras} />
          </section>
        )}

        {tab === "importar" && (
          <section className="space-y-4 p-4">
            <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-lg text-center transition-colors duration-150 hover:bg-surface-container-low">
              <Upload className="h-5 w-5 text-secondary" />
              <span className="font-headline text-sm font-semibold text-on-surface">Seleccionar .xlsx</span>
              <span className="font-body text-xs text-on-surface-variant">
                Se parsea en cliente y muestra preview antes de confirmar.
              </span>
              <input type="file" accept=".xlsx" onChange={(event) => void importarExcel(event)} className="hidden" />
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
