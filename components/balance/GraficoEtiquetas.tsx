import type { EtiquetaBalance } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  registros: EtiquetaBalance[];
}

export function GraficoEtiquetas({ registros }: Props) {
  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Gastos por etiqueta</h2>
        <p className="text-sm text-gray-500">Totales acumulados en el mes elegido.</p>
      </div>

      <div className="space-y-3">
        {registros.length ? (
          registros.map((registro) => (
            <div key={registro.etiqueta.id} className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-3 py-3">
              <div className="space-y-1">
                <Badge color={registro.etiqueta.color}>{registro.etiqueta.nombre}</Badge>
                <p className="text-sm text-gray-500">{registro.cantidad_items} items</p>
              </div>
              <p className="font-mono text-sm font-semibold text-gray-950">{formatearPeso(registro.total)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No hubo etiquetas usadas este mes.</p>
        )}
      </div>
    </section>
  );
}
