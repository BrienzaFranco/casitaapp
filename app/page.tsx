import { redirect } from "next/navigation";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";

export default async function Inicio() {
  const cliente = await crearClienteSupabaseServidor();
  const {
    data: { user },
  } = await cliente.auth.getUser();

  if (user) {
    redirect("/nueva-compra");
  }

  redirect("/ingresar");
}
