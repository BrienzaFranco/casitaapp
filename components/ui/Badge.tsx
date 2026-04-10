import type { ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

interface Props {
  children: ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: Props) {
  return (
    <span
      className={combinarClases(
        "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] backdrop-blur",
        className,
      )}
    >
      {color ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      {children}
    </span>
  );
}
