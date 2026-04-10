"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { Input } from "@/components/ui/Input";
import { crearClienteSupabase } from "@/lib/supabase";

export function FormularioIngreso() {
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviarMagicLink() {
    try {
      setEnviando(true);
      const cliente = crearClienteSupabase();
      const urlRedireccion = new URL("/autenticacion/callback", window.location.origin).toString();

      const { error } = await cliente.auth.signInWithOtp({
        email: correo,
        options: {
          emailRedirectTo: urlRedireccion,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Revisa tu mail. Te enviamos el link de acceso.");
      setCorreo("");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo enviar el magic link.";
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Ingreso</p>
        <h1 className="text-2xl font-bold text-gray-950">Entrar con magic link</h1>
        <p className="text-sm text-gray-500">
          Los usuarios se administran desde Supabase. Solo necesitas tu mail para recibir el link.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          etiqueta="Email"
          type="email"
          placeholder="nombre@correo.com"
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
        />

        <Boton anchoCompleto onClick={enviarMagicLink} disabled={enviando || !correo} icono={<Mail className="h-4 w-4" />}>
          {enviando ? "Enviando..." : "Enviarme el link"}
        </Boton>
      </div>
    </section>
  );
}
