"use client";

import { useState, useCallback, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import {
  FiltroGlobal,
  type FiltroActivo,
} from "@/components/dashboard/FiltroGlobal";
import {
  SelectorPeriodo,
  type PeriodoActivo,
} from "@/components/dashboard/SelectorPeriodo";
import { VistaOverview } from "@/components/dashboard/VistaOverview";
import { VistaCategoria } from "@/components/dashboard/VistaCategoria";
import { VistaDetalle } from "@/components/dashboard/VistaDetalle";
import { VistaItem } from "@/components/dashboard/VistaItem";
import { VistaBalance } from "@/components/dashboard/VistaBalance";
import type { CategoriaBalance, Item } from "@/types";

type VistaTipo =
  | { tipo: "overview" }
  | { tipo: "categoria"; data: CategoriaBalance }
  | { tipo: "subcategoria"; nombre: string; compras: Parameters<typeof VistaDetalle>[0]["compras"] }
  | { tipo: "lugar"; nombre: string; compras: Parameters<typeof VistaDetalle>[0]["compras"] }
  | { tipo: "item"; item: Item; lugar: string; fecha: string; compraId: string }
  | { tipo: "balance" };

export default function PaginaDashboard() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

  const [filtro, setFiltro] = useState<FiltroActivo>({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
  const [periodo, setPeriodo] = useState<PeriodoActivo>({ tipo: "este-mes", label: "Este mes" });

  const [stack, setStack] = useState<VistaTipo[]>([{ tipo: "overview" }]);
  const direccion = useRef<"adelante" | "atras" | null>(null);

  const push = useCallback((vista: VistaTipo) => {
    direccion.current = "adelante";
    setStack(prev => [...prev, vista]);
  }, []);

  const pop = useCallback(() => {
    direccion.current = "atras";
    setStack(prev => prev.slice(0, -1));
  }, []);

  const vistaActual = stack[stack.length - 1];

  const animClase = direccion.current === "adelante"
    ? "animate-slide-in-right"
    : direccion.current === "atras"
      ? "animate-slide-in-left"
      : "";

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    );
  }

  const callbacks = {
    onCategoriaClick: (cat: CategoriaBalance) => push({ tipo: "categoria", data: cat }),
    onBalanceClick: () => push({ tipo: "balance" }),
    onItemClick: (item: Item, lugar: string, fecha: string, compraId: string) =>
      push({ tipo: "item", item, lugar, fecha, compraId }),
  };

  return (
    <div className="relative overflow-hidden">
      <div key={stack.length + "-" + vistaActual.tipo} className={`${animClase} transition-none`}>
        {vistaActual.tipo === "overview" ? (
          <VistaOverview
            callbacks={callbacks}
            filtro={filtro}
            setFiltro={setFiltro}
            periodo={periodo}
            setPeriodo={setPeriodo}
          />
        ) : vistaActual.tipo === "categoria" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>
            <VistaCategoria
              categoria={vistaActual.data}
              comprasMes={balance.comprasMes}
              comprasMesAnterior={balance.comprasMesAnterior}
              todasLasCompras={balance.compras.compras}
              nombres={balance.nombres}
              colorFran={colorFran}
              colorFabi={colorFabi}
              onSubcategoriaClick={(nombre, compras) => push({ tipo: "subcategoria", nombre, compras })}
              onLugarClick={(nombre, compras) => push({ tipo: "lugar", nombre, compras })}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : vistaActual.tipo === "subcategoria" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Categor&iacute;a</span>
            </button>
            <VistaDetalle
              titulo={vistaActual.nombre}
              compras={vistaActual.compras}
              nombres={balance.nombres}
              colorFran={colorFran}
              colorFabi={colorFabi}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : vistaActual.tipo === "lugar" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Categor&iacute;a</span>
            </button>
            <VistaDetalle
              titulo={vistaActual.nombre}
              compras={vistaActual.compras}
              nombres={balance.nombres}
              colorFran={colorFran}
              colorFabi={colorFabi}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : vistaActual.tipo === "item" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Atr&aacute;s</span>
            </button>
            <VistaItem
              item={vistaActual.item}
              nombreLugar={vistaActual.lugar}
              fechaCompra={vistaActual.fecha}
              compraId={vistaActual.compraId}
              nombres={balance.nombres}
            />
          </div>
        ) : vistaActual.tipo === "balance" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>
            <VistaBalance
              compras={balance.compras.compras}
              nombres={balance.nombres}
              colorFran={colorFran}
              colorFabi={colorFabi}
              corteActivo={balance.cortes.corteActivo}
              hogarId={balance.compras.compras[0]?.hogar_id}
              nombrePerfil={balance.usuario.perfil?.nombre ?? undefined}
              onCrearCorte={balance.cortes.crearCorte}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
