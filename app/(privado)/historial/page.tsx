"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ListaCompras } from "@/components/compras/ListaCompras";
import { GraficoTendenciaDiaria } from "@/components/historial/GraficoTendenciaDiaria";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { calcularSerieGastoDiario, deducirNombresParticipantes, filtrarComprasHistorial } from "@/lib/calculos";
import { combinarClases } from "@/lib/utiles";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarUsuario } from "@/hooks/usarUsuario";

function generarUltimosMeses(cantidad: number) {
  const meses: Array<{ valor: string; etiqueta: string }> = [];
  const hoy = new Date();

  for (let i = 0; i < cantidad; i += 1) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      valor: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`,
      etiqueta: fecha.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
    });
  }

  return meses;
}

export default function PaginaHistorial() {
  const compras = usarCompras();
  const categorias = usarCategorias();
  const usuario = usarUsuario();
  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const [mes, setMes] = useState("");
  const [filtroPersona, setFiltroPersona] = useState<"franco" | "fabiola" | null>(null);
  const [categoriaId, setCategoriaId] = useState("");
  const [etiquetaId, setEtiquetaId] = useState("");
  const [compraAEliminar, setCompraAEliminar] = useState<string | null>(null);
  const ultimosMeses = generarUltimosMeses(6);

  const filtradas = filtrarComprasHistorial(compras.compras, {
    mes,
    categoria_id: categoriaId,
    etiqueta_id: etiquetaId,
    persona: filtroPersona,
  });
  const serieTendencia = useMemo(() => calcularSerieGastoDiario(filtradas), [filtradas]);
  const hayFiltrosActivos = Boolean(mes || categoriaId || etiquetaId || filtroPersona);
  const modoVacio = !compras.compras.length && !hayFiltrosActivos ? "onboarding" : "filtros";

  async function eliminarCompra() {
    if (!compraAEliminar) {
      return;
    }

    await compras.eliminarCompra(compraAEliminar);
    toast.success("Compra eliminada");
    setCompraAEliminar(null);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-950">Historial</h2>
        <p className="text-sm text-gray-500">Filtra por mes, categoria o etiqueta y expandi cada compra.</p>
      </div>

      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiltroPersona(null)}
              className={combinarClases(
                "h-9 rounded-full px-4 text-sm font-medium transition",
                filtroPersona === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroPersona("franco")}
              className={combinarClases(
                "h-9 rounded-full px-4 text-sm font-medium transition",
                filtroPersona === "franco"
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
              )}
            >
              Solo Franco
            </button>
            <button
              type="button"
              onClick={() => setFiltroPersona("fabiola")}
              className={combinarClases(
                "h-9 rounded-full px-4 text-sm font-medium transition",
                filtroPersona === "fabiola"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
              )}
            >
              Solo Fabiola
            </button>
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
            <button
              type="button"
              onClick={() => setMes("")}
              className={combinarClases(
                "h-9 flex-shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition",
                mes === "" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              Todos
            </button>
            {ultimosMeses.map((mesItem) => (
              <button
                key={mesItem.valor}
                type="button"
                onClick={() => setMes(mesItem.valor)}
                className={combinarClases(
                  "h-9 flex-shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition",
                  mes === mesItem.valor ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {mesItem.etiqueta}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
          <Select
            etiqueta="Categoria"
            value={categoriaId}
            onChange={(event) => setCategoriaId(event.target.value)}
            placeholder="Todas"
            opciones={categorias.categorias.map((categoria) => ({ etiqueta: categoria.nombre, valor: categoria.id }))}
          />
          <Select
            etiqueta="Etiqueta"
            value={etiquetaId}
            onChange={(event) => setEtiquetaId(event.target.value)}
            placeholder="Todas"
            opciones={categorias.etiquetas.map((etiqueta) => ({ etiqueta: etiqueta.nombre, valor: etiqueta.id }))}
          />
          </div>
        </div>
      </section>

      {!compras.cargando && filtradas.length ? <GraficoTendenciaDiaria registros={serieTendencia} /> : null}

      <ListaCompras
        compras={filtradas}
        cargando={compras.cargando}
        nombres={nombres}
        onEliminar={setCompraAEliminar}
        modoVacio={modoVacio}
      />

      <Modal
        abierto={Boolean(compraAEliminar)}
        titulo="Eliminar compra"
        descripcion="Esta accion elimina la compra y todos sus items."
        confirmacion="Eliminar"
        onCancelar={() => setCompraAEliminar(null)}
        onConfirmar={() => void eliminarCompra()}
      />
    </section>
  );
}
