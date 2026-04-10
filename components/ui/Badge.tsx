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
        "inline-flex items-center gap-1.5 rounded-full bg-surface-variant px-2 py-0.5 text-[10px] font-medium font-label text-on-surface-variant",
        className,
      )}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </span>
  );
}
