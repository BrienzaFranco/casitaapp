import type { ReactNode } from "react";

interface Props {
  titulo: string;
  valor: string;
  detalle?: string;
  icono?: ReactNode;
}

export function TarjetaResumen({ titulo, valor, detalle, icono }: Props) {
  return (
    <article className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500">{titulo}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-gray-950">{valor}</p>
          {detalle ? <p className="mt-2 text-sm text-gray-500">{detalle}</p> : null}
        </div>
        {icono}
      </div>
    </article>
  );
}
