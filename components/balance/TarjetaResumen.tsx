import type { ReactNode } from "react";

interface Props {
  titulo: string;
  valor: string;
  detalle?: string;
  icono?: ReactNode;
}

export function TarjetaResumen({ titulo, valor, detalle, icono }: Props) {
  return (
    <article className="rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {titulo}
          </p>
          <p className="font-label text-3xl font-bold tracking-tight tabular-nums text-primary">
            {valor}
          </p>
          {detalle ? (
            <p className="font-body text-sm text-on-surface-variant">{detalle}</p>
          ) : null}
        </div>
        {icono}
      </div>
    </article>
  );
}
