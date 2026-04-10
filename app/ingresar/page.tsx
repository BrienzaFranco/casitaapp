import { redirect } from "next/navigation";
import { FormularioIngreso } from "@/components/auth/FormularioIngreso";
import { ContenedorPagina } from "@/components/layout/ContenedorPagina";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";

export default async function PaginaIngreso() {
  const cliente = await crearClienteSupabaseServidor();
  const { data: { user } } = await cliente.auth.getUser();

  if (user) redirect("/nueva-compra");

  return (
    <ContenedorPagina className="justify-center">
      <section className="space-y-4 pt-8">
        <div className="space-y-1">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">CasitaApp</p>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Control de gastos del hogar</h1>
          <p className="font-body text-sm text-on-surface-variant">
            Registren compras, repartan montos, filtren historial y sigan el balance mensual.
          </p>
        </div>
        <FormularioIngreso />
      </section>
    </ContenedorPagina>
  );
}
