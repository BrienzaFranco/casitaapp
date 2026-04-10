import type { ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

interface Props {
  children: ReactNode;
  className?: string;
}

export function ContenedorPagina({ children, className }: Props) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1160px] flex-col px-3 pb-8 pt-3">
      <div className={combinarClases("flex flex-1 flex-col gap-4", className)}>{children}</div>
    </main>
  );
}
