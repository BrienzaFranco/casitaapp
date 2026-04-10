"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatearFecha } from "@/lib/formatear";
import { usarCompras } from "@/hooks/usarCompras";
import { usarUsuario } from "@/hooks/usarUsuario";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaginaAnotadorRapido() {
  const usuario = usarUsuario();
  const compras = usarCompras({ incluirBorradores: true });
  const [fecha, setFecha] = useState(hoy());
  const [lugar, setLugar] = useState("");
  const [pagador, setPagador] = useState<"franco" | "fabiola" | "compartido">("compartido");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const borradores = useMemo(
    () => compras.compras.filter((compra) => compra.estado === "borrador").slice(0, 8),
    [compras.compras],
  );

  async function guardarPendiente() {
    if (!lugar.trim() && !detalle.trim()) {
      toast.error("Agrega al menos lugar o detalle rapido.");
      return;
    }

    try {
      setGuardando(true);
      const compraId = await compras.crearBorradorRapido({
        fecha,
        nombre_lugar: lugar.trim(),
        pagador_general: pagador,
        registrado_por: usuario.perfil?.nombre ?? "Usuario",
        detalle_rapido: detalle.trim(),
        expresion_monto: monto.trim(),
      });

      toast.success("Anotacion guardada como pendiente.");
      setDetalle("");
      setMonto("");
      if (!lugar.trim()) {
        setLugar("");
      }
      await compras.recargar();

      if (compraId) {
        window.dispatchEvent(new Event("pendientes-actualizados"));
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar la anotacion.";
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="border border-gray-300 bg-white p-3">
        <h1 className="text-lg font-semibold text-gray-900">Anotador rapido</h1>
        <p className="mt-1 text-sm text-gray-600">Guarda compras en segundos y completalas despues en casa.</p>
      </div>

      <section className="space-y-2 border border-gray-300 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={lugar}
            onChange={(event) => setLugar(event.target.value)}
            placeholder="Lugar (ej: kiosco, feria, coto)"
            className="h-10 rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          <input
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className="h-10 rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPagador("franco")}
            className={`h-9 rounded border px-3 text-xs font-semibold ${pagador === "franco" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"}`}
          >
            Franco
          </button>
          <button
            type="button"
            onClick={() => setPagador("fabiola")}
            className={`h-9 rounded border px-3 text-xs font-semibold ${pagador === "fabiola" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"}`}
          >
            Fabiola
          </button>
          <button
            type="button"
            onClick={() => setPagador("compartido")}
            className={`h-9 rounded border px-3 text-xs font-semibold ${pagador === "compartido" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"}`}
          >
            Compartido
          </button>
        </div>

        <textarea
          value={detalle}
          onChange={(event) => setDetalle(event.target.value)}
          placeholder="Detalle rapido (ej: verduleria efectivo, 2kg papa + 1kg cebolla)"
          className="min-h-24 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
        <input
          type="text"
          inputMode="decimal"
          value={monto}
          onChange={(event) => setMonto(event.target.value)}
          placeholder="Monto rapido (opcional, ej: 5400 o 7600-500)"
          className="h-10 rounded border border-gray-300 bg-white px-3 font-mono text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void guardarPendiente()}
            disabled={guardando}
            className="h-10 flex-1 rounded bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar pendiente"}
          </button>
          <Link
            href="/nueva-compra"
            className="inline-flex h-10 items-center justify-center rounded border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Carga completa
          </Link>
        </div>
      </section>

      <section className="border border-gray-300 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-gray-600">Pendientes para completar</p>
        {borradores.length ? (
          <div className="mt-2 space-y-2">
            {borradores.map((compra) => (
              <Link
                key={compra.id}
                href={`/nueva-compra?editar=${compra.id}`}
                className="block rounded border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100"
              >
                <p className="text-sm font-medium text-gray-900">{compra.nombre_lugar || "Compra sin lugar"}</p>
                <p className="text-xs text-gray-600">{formatearFecha(compra.fecha)} - {compra.notas || "Sin detalle"}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600">No hay pendientes. Todo al dia.</p>
        )}
      </section>
    </section>
  );
}
