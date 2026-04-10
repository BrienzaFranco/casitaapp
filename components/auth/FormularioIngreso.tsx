"use client";

import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { Input } from "@/components/ui/Input";
import { crearClienteSupabase } from "@/lib/supabase";

export function FormularioIngreso() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [ingresando, setIngresando] = useState(false);

  async function ingresarConContrasena() {
    try {
      setIngresando(true);
      const cliente = crearClienteSupabase();
      const { error } = await cliente.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });

      if (error) {
        throw error;
      }

      toast.success("Sesion iniciada");
      router.push("/nueva-compra");
      router.refresh();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo iniciar sesion.";
      toast.error(mensaje);
    } finally {
      setIngresando(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Ingreso</p>
        <h1 className="text-2xl font-bold text-gray-950">Entrar con email y contrasena</h1>
        <p className="text-sm text-gray-500">
          Los usuarios se administran desde Supabase. Ingresa con el mail y la contrasena cargados por admin.
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

        <Input
          etiqueta="Contrasena"
          type="password"
          placeholder="Tu contrasena"
          value={contrasena}
          onChange={(event) => setContrasena(event.target.value)}
        />

        <Boton
          anchoCompleto
          onClick={ingresarConContrasena}
          disabled={ingresando || !correo || !contrasena}
          icono={ingresando ? <Lock className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
        >
          {ingresando ? "Ingresando..." : "Ingresar"}
        </Boton>
      </div>
    </section>
  );
}
