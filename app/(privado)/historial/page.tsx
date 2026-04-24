"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ListaCompras } from "@/components/compras/ListaCompras";
import { GraficoTendenciaDiaria } from "@/components/historial/GraficoTendenciaDiaria";
import { HojaCompras } from "@/components/historial/HojaCompras";
import { Modal } from "@/components/ui/Modal";
import { calcularSerieGastoDiario, deducirNombresParticipantes } from "@/lib/calculos";
import { combinarClases } from "@/lib/utiles";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarUsuario } from "@/hooks/usarUsuario";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import {
  FiltroGlobal,
  type FiltroActivo,
  filtrarCompras,
} from "@/components/dashboard/FiltroGlobal";
import {
  SelectorPeriodo,
  type PeriodoActivo,
  filtrarPorPeriodo,
} from "@/components/dashboard/SelectorPeriodo";
import { formatearMesLabel } from "@/lib/formatear";

const CATEGORIAS_FIJAS = ["alquiler", "expensas"];

export default function PaginaHistorial() {
  const comprasHook = usarCompras();
  const categorias = usarCategorias();
  const usuario = usarUsuario();
  const config = usarConfiguracion();
  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const [vista, setVista] = useState<"hoja" | "tarjetas">("tarjetas");
  const [compraAEliminar, setCompraAEliminar] = useState<string | null>(null);
  const [incluirFijos, setIncluirFijos] = useState(false);

  const [filtro, setFiltro] = useState<FiltroActivo>({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
  const [periodo, setPeriodo] = useState<PeriodoActivo>({ tipo: "este-mes", label: "Este mes" });

  const comprasFiltradasPorPeriodo = useMemo(() => {
    return filtrarPorPeriodo(comprasHook.compras, {
      tipo: periodo.tipo,
      desde: periodo.desde,
      hasta: periodo.hasta,
    });
  }, [comprasHook.compras, periodo]);

  const filtradas = useMemo(() => {
    return filtrarCompras(comprasFiltradasPorPeriodo, filtro);
  }, [comprasFiltradasPorPeriodo, filtro]);

  const nombreCategoriaPorId = useMemo(() => {
    return new Map(categorias.categorias.map((cat) => [cat.id, cat.nombre.toLowerCase()]));
  }, [categorias.categorias]);

  const comprasTendencia = useMemo(() => {
    if (incluirFijos) return filtradas;

    return filtradas
      .map((compra) => {
        const items = compra.items.filter((item) => {
          const nombreCat = (
            item.categoria?.nombre ??
            (item.categoria_id ? nombreCategoriaPorId.get(item.categoria_id) : "") ??
            ""
          ).toLowerCase();
          return !CATEGORIAS_FIJAS.includes(nombreCat);
        });

        if (items.length === compra.items.length) return compra;
        return { ...compra, items };
      })
      .filter((compra) => compra.items.length > 0);
  }, [filtradas, incluirFijos, nombreCategoriaPorId]);

  const serieTendencia = useMemo(() => calcularSerieGastoDiario(comprasTendencia), [comprasTendencia]);

  const hayFiltros = filtro.personas.length > 0 || filtro.categorias.length > 0 || filtro.etiquetas.length > 0 || filtro.subcategorias.length > 0;
  const hayCambios = hayFiltros || periodo.tipo !== "este-mes";
  const modoVacio = !comprasHook.compras.length && !hayCambios ? "onboarding" : "filtros";

  function resetFiltros() {
    setFiltro({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
    setPeriodo({ tipo: "este-mes", label: "Este mes" });
  }

  async function eliminarCompra() {
    if (!compraAEliminar) return;
    await comprasHook.eliminarCompra(compraAEliminar);
    toast.success("Compra eliminada");
    setCompraAEliminar(null);
  }

  return (
    <section className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-headline text-lg font-semibold tracking-tight text-on-surface">Historial</h1>
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          mesActualLabel={formatearMesLabel(new Date().toISOString().slice(0, 7))}
        />
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-3 space-y-3">
        <FiltroGlobal
          filtro={filtro}
          setFiltro={setFiltro}
          categorias={categorias.categorias}
          etiquetas={categorias.etiquetas}
          subcategorias={categorias.subcategorias}
        />

        {/* View toggle + count + actions */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button type="button" onClick={() => setVista("tarjetas")}
            className={combinarClases("font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors", vista === "tarjetas" ? "text-secondary border-secondary" : "text-on-surface-variant border-transparent")}>
            Tarjetas
          </button>
          <button type="button" onClick={() => setVista("hoja")}
            className={combinarClases("font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors", vista === "hoja" ? "text-secondary border-secondary" : "text-on-surface-variant border-transparent")}>
            Hoja
          </button>

          {/* Toggle fijos */}
          <button type="button" onClick={() => setIncluirFijos(!incluirFijos)}
            className={combinarClases("font-label text-[10px] font-bold uppercase tracking-wider pb-0.5 border-b-2 transition-colors ml-2", incluirFijos ? "text-[#ED7D31] border-[#ED7D31]" : "text-on-surface-variant border-transparent")}>
            {incluirFijos ? "Con fijos" : "Sin fijos"}
          </button>

          <span className="text-[10px] text-on-surface-variant/40 ml-auto">
            {filtradas.length} {filtradas.length === 1 ? "compra" : "compras"}
          </span>

          {hayCambios && (
            <button type="button" onClick={resetFiltros} className="text-[10px] text-secondary font-medium hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {!comprasHook.cargando && comprasTendencia.length > 0 && (
        <GraficoTendenciaDiaria
          registros={serieTendencia}
          compras={comprasTendencia}
          nombres={nombres}
          colorFranco={config.colores.franco}
          colorFabiola={config.colores.fabiola}
        />
      )}

      {/* List */}
      {vista === "hoja" && !comprasHook.cargando && filtradas.length ? (
        <HojaCompras compras={filtradas} />
      ) : (
        <ListaCompras compras={filtradas} cargando={comprasHook.cargando} nombres={nombres} onEliminar={setCompraAEliminar} modoVacio={modoVacio} />
      )}

      <Modal abierto={Boolean(compraAEliminar)} titulo="Eliminar compra" descripcion="Esta accion elimina la compra y todos sus items." confirmacion="Eliminar" onCancelar={() => setCompraAEliminar(null)} onConfirmar={() => void eliminarCompra()} />
    </section>
  );
}
