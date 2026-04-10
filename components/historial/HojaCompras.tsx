"use client";

import Link from "next/link";
import type { Compra } from "@/types";
import { formatearFecha, formatearPeso } from "@/lib/formatear";

interface Props {
  compras: Compra[];
}

export function HojaCompras({ compras }: Props) {
  if (!compras.length) {
    return (
      <section className="border border-gray-300 bg-white p-4 text-sm text-gray-600">
        No hay compras para mostrar en la hoja.
      </section>
    );
  }

  return (
    <section className="border border-gray-300 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left text-xs font-semibold uppercase text-gray-600">
              <th className="border-b border-gray-300 px-3 py-2">Fecha</th>
              <th className="border-b border-gray-300 px-3 py-2">Lugar</th>
              <th className="border-b border-gray-300 px-3 py-2">Detalle item</th>
              <th className="border-b border-gray-300 px-3 py-2">Categoria</th>
              <th className="border-b border-gray-300 px-3 py-2">Subcategoria</th>
              <th className="border-b border-gray-300 px-3 py-2">Monto</th>
              <th className="border-b border-gray-300 px-3 py-2">Reparto</th>
              <th className="border-b border-gray-300 px-3 py-2">Editar</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((compra) =>
              compra.items.map((item, indiceItem) => (
                <tr key={`${compra.id}-${item.id}`} className="align-top text-sm">
                  <td className="border-b border-gray-200 px-3 py-2 text-gray-700">
                    {indiceItem === 0 ? formatearFecha(compra.fecha) : ""}
                  </td>
                  <td className="border-b border-gray-200 px-3 py-2 text-gray-900">
                    {indiceItem === 0 ? (compra.nombre_lugar || "Sin lugar") : ""}
                  </td>
                  <td className="border-b border-gray-200 px-3 py-2 text-gray-900">{item.descripcion || "Sin detalle"}</td>
                  <td className="border-b border-gray-200 px-3 py-2 text-gray-700">{item.categoria?.nombre || "-"}</td>
                  <td className="border-b border-gray-200 px-3 py-2 text-gray-700">{item.subcategoria?.nombre || "-"}</td>
                  <td className="border-b border-gray-200 px-3 py-2 font-mono text-gray-900">{formatearPeso(item.monto_resuelto)}</td>
                  <td className="border-b border-gray-200 px-3 py-2 text-gray-700">{item.tipo_reparto}</td>
                  <td className="border-b border-gray-200 px-3 py-2">
                    {indiceItem === 0 ? (
                      <Link
                        href={`/nueva-compra?editar=${compra.id}`}
                        className="inline-flex h-8 items-center rounded border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Editar compra
                      </Link>
                    ) : null}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
