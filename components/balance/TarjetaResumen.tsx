import type { ReactNode } from "react";

interface Props {
  titulo: string;
  valor: string;
  detalle?: string;
  icono?: ReactNode;
}

export function TarjetaResumen({ titulo, valor, detalle, icono }: Props) {
  return (
    <article className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{titulo}</p>
          <p className="mt-3 font-mono text-3xl font-semibold text-slate-950">{valor}</p>
          {detalle ? <p className="mt-3 text-sm text-[var(--muted)]">{detalle}</p> : null}
        </div>
        {icono}
      </div>
    </article>
  );
}
