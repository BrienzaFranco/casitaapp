import { redirect } from "next/navigation";
import { FormularioIngreso } from "@/components/auth/FormularioIngreso";
import { ContenedorPagina } from "@/components/layout/ContenedorPagina";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";

export default async function PaginaIngreso() {
  const cliente = await crearClienteSupabaseServidor();
  const {
    data: { user },
  } = await cliente.auth.getUser();

  if (user) {
    redirect("/nueva-compra");
  }

  return (
    <ContenedorPagina className="justify-center">
      <section className="space-y-6 pt-12">
        <div className="space-y-3 text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">CasitaApp</p>
          <h1 className="text-2xl font-bold text-gray-950">Control de gastos del hogar</h1>
          <p className="text-sm text-gray-500">
            Registren compras, repartan montos, filtren historial y sigan el balance mensual sin salir del celu.
          </p>
        </div>
        <FormularioIngreso />
      </section>
    </ContenedorPagina>
  );
}
