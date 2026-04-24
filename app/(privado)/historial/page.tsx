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
  montoFiltrado,
} from "@/components/dashboard/FiltroGlobal";
import {
  SelectorPeriodo,
  type PeriodoActivo,
  filtrarPorPeriodo,
} from "@/components/dashboard/SelectorPeriodo";

export default function PaginaHistorial() {
  const comprasHook = usarCompras();
  const categorias = usarCategorias();
  const usuario = usarUsuario();
  const config = usarConfiguracion();
  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const [vista, setVista] = useState<"hoja" | "tarjetas">("tarjetas");
  const [compraAEliminar, setCompraAEliminar] = useState<string | null>(null);

  // ── Filter state ──
  const [filtro, setFiltro] = useState<FiltroActivo>({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
  const [periodo, setPeriodo] = useState<PeriodoActivo>({ tipo: "este-mes", label: "Este mes" });

  // ── Apply period filter ──
  const comprasFiltradasPorPeriodo = useMemo(() => {
    return filtrarPorPeriodo(comprasHook.compras, {
      tipo: periodo.tipo,
      desde: periodo.desde,
      hasta: periodo.hasta,
    });
  }, [comprasHook.compras, periodo]);

  // ── Apply filter logic ──
  const filtradas = useMemo(() => {
    let resultado = comprasFiltradasPorPeriodo;

    // Category filter
    if (filtro.categorias.length > 0) {
      resultado = resultado.filter((c) =>
        c.items.some((i) => i.categoria_id && filtro.categorias.includes(i.categoria_id)),
      );
    }

    // Subcategory filter
    if (filtro.subcategorias.length > 0) {
      resultado = resultado.filter((c) =>
        c.items.some((i) => i.subcategoria_id && filtro.subcategorias.includes(i.subcategoria_id)),
      );
    }

    // Tag filter
    if (filtro.etiquetas.length > 0) {
      resultado = resultado.filter((c) =>
        c.items.some((i) => i.etiquetas?.some((e) => filtro.etiquetas.includes(e.id))) ||
        c.etiquetas_compra?.some((e) => filtro.etiquetas.includes(e.id)),
      );
    }

    // Persona filter
    if (filtro.personas.length === 1) {
      const persona = filtro.personas[0];
      resultado = resultado.filter((c) => {
        if (persona === "franco") {
          return c.items.some((i) => i.pago_franco > 0);
        }
        return c.items.some((i) => i.pago_fabiola > 0);
      });
    }

    return resultado;
  }, [comprasFiltradasPorPeriodo, filtro]);

  const serieTendencia = useMemo(() => calcularSerieGastoDiario(filtradas), [filtradas]);
  const hayFiltrosActivos = filtro.personas.length > 0 || filtro.categorias.length > 0 || filtro.etiquetas.length > 0 || filtro.subcategorias.length > 0 || periodo.tipo !== "este-mes";
  const modoVacio = !comprasHook.compras.length && !hayFiltrosActivos ? "onboarding" : "filtros";

  async function eliminarCompra() {
    if (!compraAEliminar) return;
    await comprasHook.eliminarCompra(compraAEliminar);
    toast.success("Compra eliminada");
    setCompraAEliminar(null);
  }

  // ── Render ──
  return (
    <section className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-lg font-semibold tracking-tight text-on-surface">Historial</h1>
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          mesActualLabel={(() => {
            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const hoy = new Date();
            return `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
          })()}
        />
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3 space-y-3">
        <FiltroGlobal
          filtro={filtro}
          setFiltro={setFiltro}
          categorias={categorias.categorias}
          etiquetas={categorias.etiquetas}
          subcategorias={categorias.subcategorias}
        />

        {/* View toggle */}
        <div className="flex items-center gap-2 pt-1">
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
          <span className="text-[10px] text-on-surface-variant/40 ml-auto">
            {filtradas.length} {filtradas.length === 1 ? "compra" : "compras"}
          </span>
          {(filtro.personas.length > 0 || filtro.categorias.length > 0 || filtro.etiquetas.length > 0 || filtro.subcategorias.length > 0) && (
            <button
              type="button"
              onClick={() => setFiltro({ personas: [], categorias: [], etiquetas: [], subcategorias: [] })}
              className="text-[10px] text-secondary font-medium hover:underline ml-1"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {!comprasHook.cargando && filtradas.length ? (
        <GraficoTendenciaDiaria registros={serieTendencia} compras={filtradas} nombres={nombres} colorFranco={config.colores.franco} colorFabiola={config.colores.fabiola} />
      ) : null}

      {/* List */}
      {vista === "hoja" && !comprasHook.cargando && filtradas.length ? (
        <HojaCompras compras={filtradas} />
      ) : (
        <ListaCompras
          compras={filtradas}
          cargando={comprasHook.cargando}
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
