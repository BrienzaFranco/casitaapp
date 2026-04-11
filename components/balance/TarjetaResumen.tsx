interface Props {
  titulo: string;
  valor: string;
  detalle?: string;
}

export function TarjetaResumen({ titulo, valor, detalle }: Props) {
  return (
    <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-4 shadow-sm">
      <p className="font-label text-[10px] uppercase tracking-wider font-bold text-outline mb-1.5">
        {titulo}
      </p>
      <p className="font-label text-2xl font-bold tabular-nums text-primary">
        {valor}
      </p>
      {detalle && (
        <p className="font-body text-xs text-on-surface-variant mt-1">{detalle}</p>
      )}
    </div>
  );
}
