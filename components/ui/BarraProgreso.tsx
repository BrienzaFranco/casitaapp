import { colorProgreso } from "@/lib/calculos";
import { combinarClases } from "@/lib/utiles";

interface Props {
  porcentaje: number | null;
  className?: string;
}

export function BarraProgreso({ porcentaje, className }: Props) {
  const pct = porcentaje === null ? 0 : Math.min(100, Math.max(0, porcentaje));

  return (
    <div className={combinarClases("h-1.5 overflow-hidden rounded-full bg-surface-container-lowest", className)}>
      <div
        className={combinarClases("h-full rounded-full transition-all duration-200", colorProgreso(porcentaje))}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
