"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CompraEditable, PagadorCompra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { vibrarExito } from "@/lib/haptics";
import { cargarMapaLugares, cargarMapaDetalles, predecirCategoria } from "@/lib/categorizacion";
import { fechaLocalISO } from "@/lib/utiles";
import { usarCompras } from "@/hooks/usarCompras";
import { usarOffline } from "@/hooks/usarOffline";
import { usarUsuario } from "@/hooks/usarUsuario";

function hoy() {
  return fechaLocalISO();
}

function generarIdTemporal() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tmp-${crypto.randomUUID()}`;
  }

  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function evaluarMonto(expresion: string): number {
  const limpia = expresion.trim().replace(/\s/g, "");
  if (!limpia) {
    return 0;
  }

  try {
    const evaluada = Function(`"use strict"; return (${limpia})`)();
    return typeof evaluada === "number" ? evaluada : 0;
  } catch {
    const parsed = parseFloat(limpia.replace(/[$.]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
}

export default function PaginaAnotadorRapido() {
  const router = useRouter();
  const compras = usarCompras();
  const usuario = usarUsuario();
  const { guardarConFallback } = usarOffline(compras.guardarCompra);

  const [lugar, setLugar] = useState("");
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [pagador, setPagador] = useState<PagadorCompra>("compartido");
  const [categoriaPredicha, setCategoriaPredicha] = useState({ categoria_id: "", subcategoria_id: "" });
  const [guardando, setGuardando] = useState(false);
  const [guardandoDetallar, setGuardandoDetallar] = useState(false);

  const montoCalculado = evaluarMonto(monto);

  const mapaLugares = useMemo(
    () => cargarMapaLugares(compras.compras),
    [compras.compras],
  );
  const mapaDetalles = useMemo(
    () => cargarMapaDetalles(compras.compras),
    [compras.compras],
  );

  function manejarCambioLugar(valor: string) {
    setLugar(valor);
    if (valor.length >= 3) {
      const prediccion = predecirCategoria(valor, mapaLugares, mapaDetalles);
      if (prediccion) {
        setCategoriaPredicha(prediccion);
      }
    }
  }

  function manejarCambioDetalle(valor: string) {
    setDetalle(valor);
    if (valor.length >= 4 && !categoriaPredicha.categoria_id) {
      const prediccion = predecirCategoria(valor, mapaLugares, mapaDetalles);
      if (prediccion) {
        setCategoriaPredicha(prediccion);
      }
    }
  }

  function crearCompraConPrediccion(): CompraEditable {
    return {
      id: generarIdTemporal(),
      fecha: hoy(),
      nombre_lugar: lugar.trim(),
      notas: "",
      registrado_por: usuario.perfil?.nombre ?? "",
      pagador_general: pagador,
      estado: "borrador",
      etiquetas_compra_ids: [],
      items: [
        {
          id: generarIdTemporal(),
          descripcion: detalle.trim(),
          categoria_id: categoriaPredicha.categoria_id,
          subcategoria_id: categoriaPredicha.subcategoria_id,
          expresion_monto: monto.trim(),
          monto_resuelto: montoCalculado,
          tipo_reparto: pagador === "franco"
            ? "solo_franco"
            : pagador === "fabiola"
              ? "solo_fabiola"
              : "50/50",
          pago_franco: pagador === "franco"
            ? montoCalculado
            : pagador === "fabiola"
              ? 0
              : montoCalculado / 2,
          pago_fabiola: pagador === "fabiola"
            ? montoCalculado
            : pagador === "franco"
              ? 0
              : montoCalculado / 2,
          etiquetas_ids: [],
        },
      ],
    };
  }

  async function guardarPendiente() {
    if (!monto.trim()) {
      toast.error("Ingresa un monto");
      return;
    }

    try {
      setGuardando(true);

      const compra = crearCompraConPrediccion();
      const resultado = await guardarConFallback(compra);

      if (resultado.pendiente) {
        toast.success("Borrador guardado offline");
      } else {
        toast.success("Borrador guardado");
      }

      vibrarExito();
      setLugar("");
      setMonto("");
      setDetalle("");
      setCategoriaPredicha({ categoria_id: "", subcategoria_id: "" });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarYDetallar() {
    if (!monto.trim()) {
      toast.error("Ingresa un monto");
      return;
    }

    try {
      setGuardandoDetallar(true);

      const compra = crearCompraConPrediccion();
      const resultado = await guardarConFallback(compra);

      if (resultado.pendiente || !resultado.id) {
        router.push("/historial");
      } else {
        router.push(`/nueva-compra?editar=${resultado.id}`);
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(mensaje);
    } finally {
      setGuardandoDetallar(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-24">
      <div className="mx-auto w-full max-w-lg px-3 py-4">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">Anotador rápido</h1>

        <div className="space-y-3">
          <input
            type="text"
            inputMode="text"
            value={lugar}
            onChange={(e) => manejarCambioLugar(e.target.value)}
            placeholder="Lugar (ej: Coto, Rapipago)"
            className="h-14 w-full rounded-lg border border-gray-300 bg-white px-4 text-lg font-medium text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
            style={{ fontSize: "18px" }}
          />

          <input
            type="text"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto (ej: 4500 o 2000+500-200)"
            className="h-14 w-full rounded-lg border border-gray-300 bg-white px-4 font-mono text-lg font-semibold text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
            style={{ fontSize: "20px" }}
          />

          <input
            type="text"
            inputMode="text"
            value={detalle}
            onChange={(e) => manejarCambioDetalle(e.target.value)}
            placeholder="Detalle rápido (ej: Yerba oferta)"
            className="h-14 w-full rounded-lg border border-gray-300 bg-white px-4 text-lg text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
            style={{ fontSize: "18px" }}
          />

          <div className="flex items-center gap-2 py-2">
            <span className="text-sm font-medium text-gray-600">Pagó:</span>
            <button
              type="button"
              onClick={() => setPagador("compartido")}
              className={`h-10 rounded-full px-4 text-sm font-medium transition ${pagador === "compartido" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              50/50
            </button>
            <button
              type="button"
              onClick={() => setPagador("franco")}
              className={`h-10 rounded-full px-4 text-sm font-medium transition ${pagador === "franco" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Franco
            </button>
            <button
              type="button"
              onClick={() => setPagador("fabiola")}
              className={`h-10 rounded-full px-4 text-sm font-medium transition ${pagador === "fabiola" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Fabiola
            </button>
          </div>
        </div>

        {montoCalculado > 0 && (
          <div className="mt-4 rounded-lg bg-gray-100 px-4 py-3">
            <p className="text-xs uppercase text-gray-600">Total</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{formatearPeso(montoCalculado)}</p>
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-300 bg-white px-3 py-3">
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            onClick={guardarPendiente}
            disabled={guardando || !monto.trim()}
            className="h-14 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 text-base font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            Guardar pendiente
          </button>
          <button
            type="button"
            onClick={guardarYDetallar}
            disabled={guardandoDetallar || !monto.trim()}
            className="h-14 flex-1 rounded-lg bg-blue-600 px-4 text-base font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {guardandoDetallar ? "Guardando..." : "Guardar y detallar"}
          </button>
        </div>
      </footer>
    </div>
  );
}
