"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { mesClave } from "@/lib/utiles";
import { Skeleton } from "@/components/ui/Skeleton";
import { FiltroGlobal, type FiltroActivo, montoFiltrado, filtrarCompras } from "@/components/dashboard/FiltroGlobal";
import { SelectorPeriodo, type PeriodoActivo, filtrarPorPeriodo } from "@/components/dashboard/SelectorPeriodo";
import { GraficoExplorador } from "@/components/dashboard/GraficoExplorador";
import { obtenerMesAnterior } from "@/lib/calculos";

export default function PaginaExplorar() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filtro, setFiltro] = useState<FiltroActivo>({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
  const [periodo, setPeriodo] = useState<PeriodoActivo>({ tipo: "este-mes", label: "Este mes" });

  const mesAnterior = obtenerMesAnterior(balance.mesSeleccionado);

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

  const comprasMesAnteriorData = useMemo(
    () => (mesAnterior ? balance.compras.compras.filter((c) => mesClave(c.fecha) === mesAnterior) : []),
    [balance.compras.compras, mesAnterior],
  );

  const comprasFiltradas = useMemo(
    () => filtrarCompras(comprasPeriodo, filtro),
    [comprasPeriodo, filtro],
  );

  if (balance.compras.cargando || balance.categorias.cargando) {
    return (
      <div className="space-y-3 px-4 pt-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-[34px] h-[34px] rounded-[10px] border-[0.5px] border-outline-variant/20 bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-headline text-lg font-semibold text-on-surface">Explorador</h1>
          <p className="text-[11px] text-on-surface-variant/50">Visualizá tus datos con gráficos interactivos</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="px-4 mb-3">
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          mesActualLabel={formatearMesLabel(balance.mesSeleccionado)}
          mesAnteriorLabel={mesAnterior ? formatearMesCorto(mesAnterior) : ""}
        />
      </div>

      {/* Filters */}
      <FiltroGlobal
        filtro={filtro}
        setFiltro={setFiltro}
        categorias={balance.categorias.categorias}
        etiquetas={balance.categorias.etiquetas}
        subcategorias={balance.categorias.subcategorias}
      />

      {/* Explorer chart */}
      <div className="px-4 mt-4">
        <GraficoExplorador
          comprasFiltradas={comprasFiltradas}
          comprasMesAnterior={comprasMesAnteriorData}
          filtro={filtro}
          resumenHistorico={balance.resumenHistorico}
        />
      </div>

      {/* Quick stats */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-2">
        <div className="bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[12px] px-3 py-2.5">
          <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wide">Compras</p>
          <p className="text-[18px] font-medium text-on-surface mt-0.5">{comprasFiltradas.length}</p>
        </div>
        <div className="bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[12px] px-3 py-2.5">
          <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wide">Total</p>
          <p className="text-[18px] font-medium text-on-surface mt-0.5 font-mono">
            {formatearPesoCompacto(montoFiltrado(comprasFiltradas, filtro))}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatearMesLabel(mes: string): string {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

function formatearMesCorto(mes: string): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

function formatearPesoCompacto(valor: number): string {
  if (valor >= 1000000) return `$${(valor / 1000000).toFixed(1)}M`;
  if (valor >= 1000) return `$${(valor / 1000).toFixed(1)}k`;
  return `$${valor}`;
}
