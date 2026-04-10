"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BotonInstalarApp } from "@/components/pwa/BotonInstalarApp";
import type { CompraEditable, DatosImportados, TipoReparto } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { fechaLocalISO } from "@/lib/utiles";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";

type Tab = "categorias" | "subcategorias" | "etiquetas" | "importar" | "instalar";

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
  { valor: "importar", etiqueta: "Importar Excel" },
  { valor: "instalar", etiqueta: "Instalar app" },
];

export default function PaginaConfiguracion() {
  const categorias = usarCategorias();
  const compras = usarCompras();
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
    if (!archivo) {
      return;
    }

    const buffer = await archivo.arrayBuffer();
    const libro = XLSX.read(buffer);
    const primeraHoja = libro.SheetNames[0] ? libro.Sheets[libro.SheetNames[0]] : null;
    if (!primeraHoja) return;
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(primeraHoja);
    setDatosImportados(parsearImportacion(filas));
  }

  async function confirmarImportacion() {
    if (!datosImportados.length) {
      return;
    }

    const comprasAgrupadas = new Map<string, CompraEditable>();

    for (const fila of datosImportados) {
      const categoria = categorias.categorias.find((item) => item.nombre === fila.categoria);
      const subcategoria = categorias.subcategorias.find((item) => item.nombre === fila.subcategoria);
      const etiquetas = categorias.etiquetas
        .filter((item) => fila.etiquetas.includes(item.nombre))
        .map((item) => item.id);
      const clave = `${fila.fecha}-${fila.nombre_lugar || "sin-lugar"}`;
      const compra = comprasAgrupadas.get(clave) ?? {
        fecha: fila.fecha,
        nombre_lugar: fila.nombre_lugar,
        notas: "Importado desde Excel",
        registrado_por: "Importacion",
        pagador_general: "compartido",
        estado: "confirmada",
        etiquetas_compra_ids: [],
        items: [],
      };

      compra.items.push({
        descripcion: fila.descripcion,
        categoria_id: categoria?.id ?? "",
        subcategoria_id: subcategoria?.id ?? "",
        expresion_monto: fila.expresion_monto,
        monto_resuelto: fila.monto,
        tipo_reparto: fila.tipo_reparto,
        pago_franco: fila.pago_franco,
        pago_fabiola: fila.pago_fabiola,
        etiquetas_ids: etiquetas,
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
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-56 w-full rounded-[28px]" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-headline text-2xl font-bold text-on-surface">Configuracion</h2>
        <p className="font-body text-sm text-on-surface-variant">Categorias, subcategorias, etiquetas e importacion.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-full bg-surface-container-high p-1 scrollbar-hide">
        {TABS.map(({ valor, etiqueta }) => (
          <button
            key={valor}
            type="button"
            onClick={() => setTab(valor)}
            className={`rounded-full px-4 py-2 text-xs font-semibold font-headline transition-all duration-150 whitespace-nowrap ${
              tab === valor
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-[28px] bg-surface-container-lowest p-4 shadow-card">
        {tab === "categorias" && (
          <section className="space-y-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  etiqueta="Nombre"
                  value={nuevaCategoria.nombre}
                  onChange={(event) => setNuevaCategoria((anterior) => ({ ...anterior, nombre: event.target.value }))}
                />
                <Input
                  etiqueta="Color"
                  type="color"
                  value={nuevaCategoria.color}
                  onChange={(event) => setNuevaCategoria((anterior) => ({ ...anterior, color: event.target.value }))}
                />
                <Input
                  etiqueta="Limite mensual"
                  type="number"
                  value={nuevaCategoria.limite_mensual}
                  onChange={(event) =>
                    setNuevaCategoria((anterior) => ({ ...anterior, limite_mensual: event.target.value }))
                  }
                />
              </div>
              <Boton
                anchoCompleto
                onClick={async () => {
                  await categorias.crearCategoria({
                    nombre: nuevaCategoria.nombre,
                    color: nuevaCategoria.color,
                    limite_mensual: nuevaCategoria.limite_mensual ? Number(nuevaCategoria.limite_mensual) : null,
                  });
                  setNuevaCategoria({ nombre: "", color: "#6366f1", limite_mensual: "" });
                  toast.success("Categoria creada");
                }}
              >
                Agregar nueva categoria
              </Boton>
            </div>

            {/* List */}
            <div className="space-y-2">
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Categorias existentes
              </p>
              {categorias.categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="group flex items-center gap-3 rounded-2xl bg-surface-container-low p-3 transition-all duration-150"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: categoria.color }}
                  />
                  <input
                    className="flex-1 bg-transparent font-body text-sm font-semibold text-on-surface outline-none transition-colors duration-150 focus:text-primary"
                    defaultValue={categoria.nombre}
                    onBlur={(event) =>
                      void categorias.actualizarCategoria(categoria.id, { nombre: event.target.value })
                    }
                  />
                  <input
                    className="tabular-nums w-24 bg-transparent text-right font-body text-sm text-on-surface-variant outline-none transition-colors duration-150 focus:text-primary"
                    defaultValue={String(categoria.limite_mensual ?? "")}
                    onBlur={(event) =>
                      void categorias.actualizarCategoria(categoria.id, {
                        limite_mensual: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    placeholder="Sin limite"
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-2 text-error transition-colors duration-150 hover:bg-error-container"
                    onClick={() =>
                      void categorias.eliminarCategoria(categoria.id).catch(() => {
                        toast.error("No se puede eliminar si tiene items asociados");
                      })
                    }
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "subcategorias" && (
          <section className="space-y-6">
            <Select
              etiqueta="Filtrar por categoria"
              value={filtroCategoria}
              onChange={(event) => setFiltroCategoria(event.target.value)}
              placeholder="Todas"
              opciones={categorias.categorias.map((categoria) => ({
                etiqueta: categoria.nombre,
                valor: categoria.id,
              }))}
            />

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Select
                  etiqueta="Categoria"
                  value={nuevaSubcategoria.categoria_id}
                  onChange={(event) =>
                    setNuevaSubcategoria((anterior) => ({ ...anterior, categoria_id: event.target.value }))
                  }
                  opciones={categorias.categorias.map((categoria) => ({
                    etiqueta: categoria.nombre,
                    valor: categoria.id,
                  }))}
                />
                <Input
                  etiqueta="Nombre"
                  value={nuevaSubcategoria.nombre}
                  onChange={(event) =>
                    setNuevaSubcategoria((anterior) => ({ ...anterior, nombre: event.target.value }))
                  }
                />
                <Input
                  etiqueta="Limite mensual"
                  type="number"
                  value={nuevaSubcategoria.limite_mensual}
                  onChange={(event) =>
                    setNuevaSubcategoria((anterior) => ({ ...anterior, limite_mensual: event.target.value }))
                  }
                />
              </div>
              <Boton
                anchoCompleto
                onClick={async () => {
                  await categorias.crearSubcategoria({
                    categoria_id: nuevaSubcategoria.categoria_id,
                    nombre: nuevaSubcategoria.nombre,
                    limite_mensual: nuevaSubcategoria.limite_mensual
                      ? Number(nuevaSubcategoria.limite_mensual)
                      : null,
                  });
                  setNuevaSubcategoria({ categoria_id: "", nombre: "", limite_mensual: "" });
                  toast.success("Subcategoria creada");
                }}
              >
                Agregar subcategoria
              </Boton>
            </div>

            {/* List */}
            <div className="space-y-2">
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Subcategorias existentes
              </p>
              {subcategoriasFiltradas.map((subcategoria) => (
                <div
                  key={subcategoria.id}
                  className="group flex items-center gap-3 rounded-2xl bg-surface-container-low p-3 transition-all duration-150"
                >
                  <input
                    className="flex-1 bg-transparent font-body text-sm font-semibold text-on-surface outline-none transition-colors duration-150 focus:text-primary"
                    defaultValue={subcategoria.nombre}
                    onBlur={(event) =>
                      void categorias.actualizarSubcategoria(subcategoria.id, { nombre: event.target.value })
                    }
                  />
                  <input
                    className="tabular-nums w-24 bg-transparent text-right font-body text-sm text-on-surface-variant outline-none transition-colors duration-150 focus:text-primary"
                    defaultValue={String(subcategoria.limite_mensual ?? "")}
                    onBlur={(event) =>
                      void categorias.actualizarSubcategoria(subcategoria.id, {
                        limite_mensual: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    placeholder="Sin limite"
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-2 text-error transition-colors duration-150 hover:bg-error-container"
                    onClick={() =>
                      void categorias.eliminarSubcategoria(subcategoria.id).catch(() => {
                        toast.error("No se puede eliminar si tiene items asociados");
                      })
                    }
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "etiquetas" && (
          <section className="space-y-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  etiqueta="Nombre"
                  value={nuevaEtiqueta.nombre}
                  onChange={(event) =>
                    setNuevaEtiqueta((anterior) => ({ ...anterior, nombre: event.target.value }))
                  }
                />
                <Input
                  etiqueta="Color"
                  type="color"
                  value={nuevaEtiqueta.color}
                  onChange={(event) =>
                    setNuevaEtiqueta((anterior) => ({ ...anterior, color: event.target.value }))
                  }
                />
              </div>
              <Boton
                anchoCompleto
                onClick={async () => {
                  await categorias.crearEtiqueta(nuevaEtiqueta);
                  setNuevaEtiqueta({ nombre: "", color: "#f59e0b" });
                  toast.success("Etiqueta creada");
                }}
              >
                Agregar etiqueta
              </Boton>
            </div>

            {/* List */}
            <div className="space-y-2">
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Etiquetas existentes
              </p>
              {categorias.etiquetas.map((etiqueta) => (
                <div
                  key={etiqueta.id}
                  className="group flex items-center gap-3 rounded-2xl bg-surface-container-low p-3 transition-all duration-150"
                >
                  <Badge color={etiqueta.color}>{etiqueta.nombre}</Badge>
                  <input
                    className="flex-1 bg-transparent font-body text-sm font-semibold text-on-surface outline-none transition-colors duration-150 focus:text-primary"
                    defaultValue={etiqueta.nombre}
                    onBlur={(event) =>
                      void categorias.actualizarEtiqueta(etiqueta.id, { nombre: event.target.value })
                    }
                  />
                  <input
                    type="color"
                    className="h-8 w-8 cursor-pointer rounded-full bg-transparent outline-none"
                    defaultValue={etiqueta.color}
                    onBlur={(event) =>
                      void categorias.actualizarEtiqueta(etiqueta.id, { color: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-2 text-error transition-colors duration-150 hover:bg-error-container"
                    onClick={() =>
                      void categorias.eliminarEtiqueta(etiqueta.id).catch(() => {
                        toast.error("No se puede eliminar si esta usada");
                      })
                    }
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "importar" && (
          <section className="space-y-6">
            {/* Upload area */}
            <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] bg-surface-container-low text-center transition-colors duration-150 hover:bg-surface-container">
              <Upload className="h-6 w-6 text-secondary" />
              <span className="font-headline text-sm font-semibold text-on-surface">Seleccionar .xlsx</span>
              <span className="font-body text-xs text-on-surface-variant">
                Se parsea en cliente y muestra preview antes de confirmar.
              </span>
              <input type="file" accept=".xlsx" onChange={(event) => void importarExcel(event)} className="hidden" />
            </label>

            {previewImportacion.length ? (
              <>
                {/* Preview list */}
                <div className="space-y-2">
                  <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Vista previa ({previewImportacion.length} registros)
                  </p>
                  {previewImportacion.map((fila, indice) => (
                    <div
                      key={`${fila.fecha}-${indice}`}
                      className="rounded-2xl bg-surface-container-low p-3 transition-all duration-150"
                    >
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
                <Boton
                  variante="secundario"
                  anchoCompleto
                  onClick={() => void confirmarImportacion()}
                >
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
          <section className="space-y-6">
            <div className="flex items-start gap-4 rounded-[20px] bg-surface-container-low p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
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
