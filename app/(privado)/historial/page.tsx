"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ListaCompras } from "@/components/compras/ListaCompras";
import { GraficoTendenciaDiaria } from "@/components/historial/GraficoTendenciaDiaria";
import { HojaCompras } from "@/components/historial/HojaCompras";
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
  const [etiquetaCompraId, setEtiquetaCompraId] = useState("");
  const [compraAEliminar, setCompraAEliminar] = useState<string | null>(null);
  const [vista, setVista] = useState<"hoja" | "tarjetas">("tarjetas");
  const ultimosMeses = generarUltimosMeses(6);

  const filtradas = filtrarComprasHistorial(compras.compras, {
    mes, categoria_id: categoriaId, etiqueta_id: etiquetaId,
    etiqueta_compra_id: etiquetaCompraId, persona: filtroPersona,
  });
  const serieTendencia = useMemo(() => calcularSerieGastoDiario(filtradas), [filtradas]);
  const hayFiltrosActivos = Boolean(mes || categoriaId || etiquetaId || etiquetaCompraId || filtroPersona);
  const modoVacio = !compras.compras.length && !hayFiltrosActivos ? "onboarding" : "filtros";

  async function eliminarCompra() {
    if (!compraAEliminar) return;
    await compras.eliminarCompra(compraAEliminar);
    toast.success("Compra eliminada");
    setCompraAEliminar(null);
  }

  return (
    <section className="space-y-4">
      {/* Filters - compact ledger style */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3">
        <div className="space-y-3">
          {/* Person filter - text links */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-label text-[9px] uppercase tracking-wider text-outline shrink-0">Quien</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltroPersona(null)}
                className={combinarClases(
                  "font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors",
                  filtroPersona === null
                    ? "text-secondary border-secondary"
                    : "text-on-surface-variant border-transparent hover:text-on-surface",
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroPersona("franco")}
                className={combinarClases(
                  "font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors",
                  filtroPersona === "franco"
                    ? "text-secondary border-secondary"
                    : "text-on-surface-variant border-transparent hover:text-on-surface",
                )}
              >
                {nombres.franco}
              </button>
              <button
                type="button"
                onClick={() => setFiltroPersona("fabiola")}
                className={combinarClases(
                  "font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors",
                  filtroPersona === "fabiola"
                    ? "text-secondary border-secondary"
                    : "text-on-surface-variant border-transparent hover:text-on-surface",
                )}
              >
                {nombres.fabiola}
              </button>
            </div>
          </div>

          {/* Month filter - scrollable text */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-label text-[9px] uppercase tracking-wider text-outline shrink-0">Mes</span>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                type="button"
                onClick={() => setMes("")}
                className={combinarClases(
                  "font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 shrink-0 transition-colors",
                  mes === "" ? "text-secondary border-secondary" : "text-on-surface-variant border-transparent",
                )}
              >
                Todos
              </button>
              {ultimosMeses.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() => setMes(m.valor)}
                  className={combinarClases(
                    "font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 shrink-0 transition-colors",
                    mes === m.valor ? "text-secondary border-secondary" : "text-on-surface-variant border-transparent",
                  )}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* View toggle + Category/Etiqueta selects */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVista("tarjetas")}
                className={combinarClases(
                  "font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors",
                  vista === "tarjetas" ? "text-secondary border-secondary" : "text-on-surface-variant border-transparent",
                )}
              >
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setVista("hoja")}
                className={combinarClases(
                  "font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors",
                  vista === "hoja" ? "text-secondary border-secondary" : "text-on-surface-variant border-transparent",
                )}
              >
                Hoja
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              etiqueta="Categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              placeholder="Todas"
              opciones={categorias.categorias.map((c) => ({ etiqueta: c.nombre, valor: c.id }))}
            />
            <Select
              etiqueta="Etiqueta"
              value={etiquetaId}
              onChange={(e) => setEtiquetaId(e.target.value)}
              placeholder="Todas"
              opciones={categorias.etiquetas.map((e) => ({ etiqueta: e.nombre, valor: e.id }))}
            />
            <Select
              etiqueta="Tag compra"
              value={etiquetaCompraId}
              onChange={(e) => setEtiquetaCompraId(e.target.value)}
              placeholder="Todos"
              opciones={categorias.etiquetas.map((e) => ({ etiqueta: e.nombre, valor: e.id }))}
            />
          </div>
        </div>
      </div>

      {!compras.cargando && filtradas.length ? <GraficoTendenciaDiaria registros={serieTendencia} /> : null}

      {vista === "hoja" && !compras.cargando && filtradas.length ? (
        <HojaCompras compras={filtradas} />
      ) : (
        <ListaCompras
          compras={filtradas}
          cargando={compras.cargando}
          nombres={nombres}
          onEliminar={setCompraAEliminar}
          modoVacio={modoVacio}
        />
      )}

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
