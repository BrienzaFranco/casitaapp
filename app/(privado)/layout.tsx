import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MarcoPrivado } from "@/components/layout/MarcoPrivado";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";

export default async function LayoutPrivado({ children }: Readonly<{ children: ReactNode }>) {
  const cliente = await crearClienteSupabaseServidor();
  const {
    data: { user },
  } = await cliente.auth.getUser();

  if (!user) {
    redirect("/ingresar");
  }

  return <MarcoPrivado>{children}</MarcoPrivado>;
}
