"use client";

import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearClienteSupabase } from "@/lib/supabase";

export function FormularioIngreso() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [ingresando, setIngresando] = useState(false);

  async function ingresar() {
    try {
      setIngresando(true);
      const cliente = crearClienteSupabase();
      const { error } = await cliente.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });
      if (error) throw error;
      toast.success("Sesion iniciada");
      router.push("/nueva-compra");
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo iniciar sesion.";
      toast.error(msg);
    } finally {
      setIngresando(false);
    }
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-5">
      <div className="mb-4 space-y-1">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline">Ingreso</p>
        <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface">Entrar a CasitaApp</h2>
        <p className="font-body text-sm text-on-surface-variant">
          Ingresa con el email y contrasena configurados.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Email</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="nombre@correo.com"
            className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2.5 font-headline text-sm text-on-surface outline-none transition-all focus:bg-surface-container-highest focus:border-b-primary placeholder:text-on-surface-variant/50"
          />
        </div>

        <div>
          <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Contrasena</label>
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Tu contrasena"
            className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2.5 font-headline text-sm text-on-surface outline-none transition-all focus:bg-surface-container-highest focus:border-b-primary placeholder:text-on-surface-variant/50"
          />
        </div>

        <button
          type="button"
          onClick={ingresar}
          disabled={ingresando || !correo || !contrasena}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded bg-primary font-headline text-sm font-semibold text-on-primary disabled:opacity-50 hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {ingresando ? "Ingresando..." : "Ingresar"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
