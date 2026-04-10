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
        "inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700",
        className,
      )}
    >
      {color ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      {children}
    </span>
  );
}
