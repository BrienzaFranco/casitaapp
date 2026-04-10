"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { CompraEditable, DatosImportados, TipoReparto } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";

type Tab = "categorias" | "subcategorias" | "etiquetas" | "importar";

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
      fecha: String(detectarColumna(fila, ["fecha"]) ?? new Date().toISOString().slice(0, 10)),
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
    const primeraHoja = libro.Sheets[libro.SheetNames[0]];
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
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-950">Configuracion</h2>
        <p className="text-sm text-gray-500">Categorias, subcategorias, etiquetas e importacion.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-[28px] border border-gray-100 bg-white p-2 shadow-sm">
        {[
          ["categorias", "Categorias"],
          ["subcategorias", "Subcategorias"],
          ["etiquetas", "Etiquetas"],
          ["importar", "Importar Excel"],
        ].map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setTab(valor as Tab)}
            className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
              tab === valor ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {tab === "categorias" ? (
        <section className="space-y-4 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3">
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
              onChange={(event) => setNuevaCategoria((anterior) => ({ ...anterior, limite_mensual: event.target.value }))}
            />
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

          <div className="space-y-3">
            {categorias.categorias.map((categoria) => (
              <div key={categoria.id} className="rounded-2xl bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoria.color }} />
                  <input
                    className="flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none"
                    defaultValue={categoria.nombre}
                    onBlur={(event) => void categorias.actualizarCategoria(categoria.id, { nombre: event.target.value })}
                  />
                  <input
                    className="w-24 bg-transparent text-right text-sm text-gray-500 outline-none"
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
                    className="text-sm font-semibold text-red-500"
                    onClick={() =>
                      void categorias.eliminarCategoria(categoria.id).catch(() => {
                        toast.error("No se puede eliminar si tiene items asociados");
                      })
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "subcategorias" ? (
        <section className="space-y-4 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
          <Select
            etiqueta="Filtrar por categoria"
            value={filtroCategoria}
            onChange={(event) => setFiltroCategoria(event.target.value)}
            placeholder="Todas"
            opciones={categorias.categorias.map((categoria) => ({ etiqueta: categoria.nombre, valor: categoria.id }))}
          />

          <div className="grid grid-cols-1 gap-3">
            <Select
              etiqueta="Categoria"
              value={nuevaSubcategoria.categoria_id}
              onChange={(event) => setNuevaSubcategoria((anterior) => ({ ...anterior, categoria_id: event.target.value }))}
              opciones={categorias.categorias.map((categoria) => ({ etiqueta: categoria.nombre, valor: categoria.id }))}
            />
            <Input
              etiqueta="Nombre"
              value={nuevaSubcategoria.nombre}
              onChange={(event) => setNuevaSubcategoria((anterior) => ({ ...anterior, nombre: event.target.value }))}
            />
            <Input
              etiqueta="Limite mensual"
              type="number"
              value={nuevaSubcategoria.limite_mensual}
              onChange={(event) => setNuevaSubcategoria((anterior) => ({ ...anterior, limite_mensual: event.target.value }))}
            />
            <Boton
              anchoCompleto
              onClick={async () => {
                await categorias.crearSubcategoria({
                  categoria_id: nuevaSubcategoria.categoria_id,
                  nombre: nuevaSubcategoria.nombre,
                  limite_mensual: nuevaSubcategoria.limite_mensual ? Number(nuevaSubcategoria.limite_mensual) : null,
                });
                setNuevaSubcategoria({ categoria_id: "", nombre: "", limite_mensual: "" });
                toast.success("Subcategoria creada");
              }}
            >
              Agregar subcategoria
            </Boton>
          </div>

          <div className="space-y-3">
            {subcategoriasFiltradas.map((subcategoria) => (
              <div key={subcategoria.id} className="rounded-2xl bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <input
                    className="flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none"
                    defaultValue={subcategoria.nombre}
                    onBlur={(event) => void categorias.actualizarSubcategoria(subcategoria.id, { nombre: event.target.value })}
                  />
                  <input
                    className="w-24 bg-transparent text-right text-sm text-gray-500 outline-none"
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
                    className="text-sm font-semibold text-red-500"
                    onClick={() =>
                      void categorias.eliminarSubcategoria(subcategoria.id).catch(() => {
                        toast.error("No se puede eliminar si tiene items asociados");
                      })
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "etiquetas" ? (
        <section className="space-y-4 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3">
            <Input
              etiqueta="Nombre"
              value={nuevaEtiqueta.nombre}
              onChange={(event) => setNuevaEtiqueta((anterior) => ({ ...anterior, nombre: event.target.value }))}
            />
            <Input
              etiqueta="Color"
              type="color"
              value={nuevaEtiqueta.color}
              onChange={(event) => setNuevaEtiqueta((anterior) => ({ ...anterior, color: event.target.value }))}
            />
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

          <div className="space-y-3">
            {categorias.etiquetas.map((etiqueta) => (
              <div key={etiqueta.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                <Badge color={etiqueta.color}>{etiqueta.nombre}</Badge>
                <input
                  className="flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none"
                  defaultValue={etiqueta.nombre}
                  onBlur={(event) => void categorias.actualizarEtiqueta(etiqueta.id, { nombre: event.target.value })}
                />
                <input
                  type="color"
                  defaultValue={etiqueta.color}
                  onBlur={(event) => void categorias.actualizarEtiqueta(etiqueta.id, { color: event.target.value })}
                />
                <button
                  type="button"
                  className="text-sm font-semibold text-red-500"
                  onClick={() =>
                    void categorias.eliminarEtiqueta(etiqueta.id).catch(() => {
                      toast.error("No se puede eliminar si esta usada");
                    })
                  }
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "importar" ? (
        <section className="space-y-4 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center">
            <Upload className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">Seleccionar .xlsx</span>
            <span className="px-6 text-sm text-gray-500">Se parsea en cliente y muestra preview antes de confirmar.</span>
            <input type="file" accept=".xlsx" onChange={(event) => void importarExcel(event)} className="hidden" />
          </label>

          {previewImportacion.length ? (
            <>
              <div className="space-y-3">
                {previewImportacion.map((fila, indice) => (
                  <div key={`${fila.fecha}-${indice}`} className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {fila.fecha} · {fila.nombre_lugar || "Sin lugar"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {fila.categoria} / {fila.subcategoria} · {fila.descripcion} · {fila.expresion_monto}
                    </p>
                  </div>
                ))}
              </div>
              <Boton anchoCompleto onClick={() => void confirmarImportacion()}>
                Confirmar importacion
              </Boton>
            </>
          ) : (
            <p className="text-sm text-gray-500">Sube un archivo para ver la preview del mapeo.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
