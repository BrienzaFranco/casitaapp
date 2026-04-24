"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import {
  type FiltroActivo,
} from "@/components/dashboard/FiltroGlobal";
import {
  type PeriodoActivo,
  filtrarPorPeriodo,
} from "@/components/dashboard/SelectorPeriodo";
import { mesClave } from "@/lib/utiles";
import { obtenerMesAnterior } from "@/lib/calculos";
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
  const [direccion, setDireccion] = useState<"adelante" | "atras" | null>(null);

  const mesAnterior = useMemo(() => obtenerMesAnterior(balance.mesSeleccionado), [balance.mesSeleccionado]);
  const comprasPeriodo = useMemo(() => {
    if (periodo.tipo === "este-mes") return balance.comprasMes;
    if (periodo.tipo === "mes-anterior") {
      return mesAnterior ? balance.compras.compras.filter((c) => mesClave(c.fecha) === mesAnterior) : [];
    }
    return filtrarPorPeriodo(balance.compras.compras, {
      tipo: periodo.tipo,
      desde: periodo.desde,
      hasta: periodo.hasta,
    });
  }, [periodo, balance.comprasMes, balance.compras.compras, mesAnterior]);

  const push = useCallback((vista: VistaTipo) => {
    setDireccion("adelante");
    setStack(prev => [...prev, vista]);
  }, []);

  const pop = useCallback(() => {
    setDireccion("atras");
    setStack(prev => prev.slice(0, -1));
  }, []);

  const vistaActual = stack[stack.length - 1];
  const vistaPrevia = stack.length > 1 ? stack[stack.length - 2] : null;

  const animClase = direccion === "adelante"
    ? "animate-slide-in-right"
    : direccion === "atras"
      ? "animate-slide-in-left"
      : "";

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando || balance.cortes.cargando) {
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
      <div key={vistaActual.tipo + "-" + (vistaActual.tipo === "overview" ? "" : stack.length)} className={`${animClase} transition-none`}>
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
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaCategoria
              categoria={vistaActual.data}
              comprasMes={comprasPeriodo}
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
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaDetalle
              titulo={vistaActual.nombre}
              compras={vistaActual.compras}
              nombres={balance.nombres}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : vistaActual.tipo === "lugar" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
            </button>
            <VistaDetalle
              titulo={vistaActual.nombre}
              compras={vistaActual.compras}
              nombres={balance.nombres}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : vistaActual.tipo === "item" ? (
          <div className="space-y-3">
            <button type="button" onClick={pop}
              className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">{labelVolver()}</span>
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
              onCrearCorte={async (data) => {
                await balance.cortes.crearCorte(data);
                balance.compras.recargar();
                balance.cortes.recargar();
              }}
              onItemClick={callbacks.onItemClick}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
