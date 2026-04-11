import type { ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

interface Props {
  children: ReactNode;
  className?: string;
}

export function ContenedorPagina({ children, className }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-24 pt-14 md:max-w-3xl md:pl-8 md:pt-6 lg:max-w-4xl xl:max-w-5xl">
      <div className={combinarClases("flex flex-col gap-4", className)}>{children}</div>
    </main>
  );
}
