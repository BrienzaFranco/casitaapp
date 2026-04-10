import { colorProgreso } from "@/lib/calculos";
import { combinarClases } from "@/lib/utiles";

interface Props {
  porcentaje: number | null;
  className?: string;
}

export function BarraProgreso({ porcentaje, className }: Props) {
  const porcentajeVisible = porcentaje === null ? 0 : Math.min(100, Math.max(0, porcentaje));

  return (
    <div className={combinarClases("h-2.5 overflow-hidden rounded-full bg-gray-100", className)}>
      <div
        className={combinarClases("h-full rounded-full transition-[width]", colorProgreso(porcentaje))}
        style={{ width: `${porcentajeVisible}%` }}
      />
    </div>
  );
}
