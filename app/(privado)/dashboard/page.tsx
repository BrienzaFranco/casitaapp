"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import type { FiltroActivo } from "@/components/dashboard/FiltroGlobal";
import type { PeriodoActivo } from "@/components/dashboard/SelectorPeriodo";
import { obtenerMesAnterior } from "@/lib/calculos";
import { VistaOverview, type OverviewData } from "@/components/dashboard/VistaOverview";
import { VistaCategoria } from "@/components/dashboard/VistaCategoria";
import { VistaDetalle } from "@/components/dashboard/VistaDetalle";
import { VistaItem } from "@/components/dashboard/VistaItem";
import { VistaBalance } from "@/components/dashboard/VistaBalance";
import type { CategoriaBalance, Compra, Item } from "@/types";

type VistaTipo =
  | { tipo: "overview" }
  | { tipo: "categoria"; data: CategoriaBalance }
  | { tipo: "subcategoria"; nombre: string; compras: Compra[] }
  | { tipo: "lugar"; nombre: string; compras: Compra[] }
  | { tipo: "item"; item: Item; lugar: string; fecha: string; compraId: string }
  | { tipo: "balance" };

export default function PaginaDashboard() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

  const [filtro, setFiltro] = useState<FiltroActivo>({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
  const [periodo, setPeriodo] = useState<PeriodoActivo>({ tipo: "este-mes", label: "Este mes" });
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  const [stack, setStack] = useState<VistaTipo[]>([{ tipo: "overview" }]);
  const [direccion, setDireccion] = useState<"adelante" | "atras" | null>(null);

  const mesAnterior = useMemo(() => obtenerMesAnterior(balance.mesSeleccionado), [balance.mesSeleccionado]);

  const overviewData = useMemo((): OverviewData => ({
    compras: balance.compras.compras,
    comprasMes: balance.comprasMes,
    categorias: balance.categorias.categorias,
    subcategorias: balance.categorias.subcategorias,
    etiquetas: balance.categorias.etiquetas,
    categoriasMes: balance.categoriasMes,
    etiquetasMes: balance.etiquetasMes,
    resumenMes: balance.resumenMes,
    resumenHistorico: balance.resumenHistorico,
    saldoAbierto: balance.saldoAbierto,
    nombres: balance.nombres,
    mesSeleccionado: balance.mesSeleccionado,
    numBorradores: balance.compras.compras.filter(c => c.estado === "borrador").length,
  }), [balance]);

  const push = useCallback((vista: VistaTipo) => {
    if (vista.tipo === "overview") setDiaSeleccionado(null);
    setDireccion("adelante");
    setStack(prev => [...prev, vista]);
  }, []);

  const pop = useCallback(() => {
    setDireccion("atras");
    setStack(prev => prev.slice(0, -1));
  }, []);

  const vistaActual = stack[stack.length - 1];
  const vistaPrevia = stack.length > 1 ? stack[stack.length - 2] : null;

  const limpiarFiltros = useCallback(() => {
    setFiltro({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
    setPeriodo({ tipo: "este-mes", label: "Este mes" });
    setDiaSeleccionado(null);
  }, []);

  const animClase = direccion === "adelante" ? "animate-slide-in-right" : direccion === "atras" ? "animate-slide-in-left" : "";

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando || balance.cortes.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  const callbacks = {
    onCategoriaClick: (cat: CategoriaBalance) => push({ tipo: "categoria", data: cat }),
    onBalanceClick: () => push({ tipo: "balance" }),
    onItemClick: (item: Item, lugar: string, fecha: string, compraId: string) =>
      push({ tipo: "item", item, lugar, fecha, compraId }),
    onDiaClick: (dia: number) => {
      if (diaSeleccionado === dia) { setDiaSeleccionado(null); return; }
      setDiaSeleccionado(dia);
    },
  };

  function labelVolver(): string {
    if (!vistaPrevia) return "Dashboard";
    switch (vistaPrevia.tipo) {
      case "overview": return "Dashboard";
      case "categoria": return vistaPrevia.data.categoria.nombre;
      case "subcategoria": return vistaPrevia.nombre;
      case "lugar": return vistaPrevia.nombre;
      case "item": return vistaPrevia.item.descripcion || "Item";
      case "balance": return "Balance";
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div key={vistaActual.tipo + "-" + (vistaActual.tipo === "overview" ? String(diaSeleccionado ?? "") : String(stack.length))}
        className={`${animClase} transition-none`}>

        {vistaActual.tipo === "overview" ? (
          <VistaOverview
            data={overviewData}
            callbacks={callbacks}
            filtro={filtro}
            setFiltro={setFiltro}
            periodo={periodo}
            setPeriodo={setPeriodo}
            mesAnterior={mesAnterior}
            diaSeleccionado={diaSeleccionado}
            onLimpiarFiltros={limpiarFiltros}
          />
        ) : vistaActual.tipo === "categoria" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaCategoria
              categoria={vistaActual.data}
              comprasMes={balance.comprasMes}
              comprasMesAnterior={balance.comprasMesAnterior}
              todasLasCompras={balance.compras.compras}
              nombres={balance.nombres}
              onSubcategoriaClick={(nombre, compras) => push({ tipo: "subcategoria", nombre, compras })}
              onLugarClick={(nombre, compras) => push({ tipo: "lugar", nombre, compras })}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : vistaActual.tipo === "subcategoria" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaDetalle titulo={vistaActual.nombre} compras={vistaActual.compras} nombres={balance.nombres} onItemClick={callbacks.onItemClick} />
          </div>
        ) : vistaActual.tipo === "lugar" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaDetalle titulo={vistaActual.nombre} compras={vistaActual.compras} nombres={balance.nombres} onItemClick={callbacks.onItemClick} />
          </div>
        ) : vistaActual.tipo === "item" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaItem item={vistaActual.item} nombreLugar={vistaActual.lugar} fechaCompra={vistaActual.fecha} compraId={vistaActual.compraId} nombres={balance.nombres} />
          </div>
        ) : vistaActual.tipo === "balance" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaBalance
              compras={balance.compras.compras}
              nombres={balance.nombres}
              colorFran={colorFran}
              colorFabi={colorFabi}
              corteActivo={balance.cortes.corteActivo}
              hogarId={balance.compras.compras[0]?.hogar_id}
              nombrePerfil={balance.usuario.perfil?.nombre ?? undefined}
              onCrearCorte={async (data) => { await balance.cortes.crearCorte(data); balance.compras.recargar(); balance.cortes.recargar(); }}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
