import type { ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

interface Props {
  children: ReactNode;
  className?: string;
}

export function ContenedorPagina({ children, className }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-28 pt-14 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
      <div className={combinarClases("flex flex-col gap-4", className)}>{children}</div>
    </main>
  );
}
