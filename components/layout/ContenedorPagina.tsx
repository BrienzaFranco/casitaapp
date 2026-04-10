import type { ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

interface Props {
  children: ReactNode;
  className?: string;
}

export function ContenedorPagina({ children, className }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[480px] px-4 pb-24 pt-16">
      <div className={combinarClases("flex flex-col gap-4", className)}>{children}</div>
    </main>
  );
}
