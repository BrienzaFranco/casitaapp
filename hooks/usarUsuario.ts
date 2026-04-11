"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Perfil } from "@/types";
import { crearClienteSupabase } from "@/lib/supabase";
import { nombreLegible } from "@/lib/utiles";

interface EstadoUsuario {
  usuarioId: string | null;
  correo: string;
  perfil: Perfil | null;
  otroPerfil: Perfil | null;
  perfiles: Perfil[];
  cargando: boolean;
}

/**
 * Retry wrapper around getUser() to handle Supabase auth lock contention.
 * The gotrue-js lock can break under concurrent requests; this retries up to 3 times.
 */
async function getUserConReintentos(cliente: ReturnType<typeof crearClienteSupabase>, intentos = 3) {
  let ultimoError: Error | null = null;
  for (let i = 0; i < intentos; i++) {
    try {
      return await cliente.auth.getUser();
    } catch (error) {
      ultimoError = error as Error;
      // Only retry on lock/abort errors
      if (error instanceof Error && (error.message.includes("Lock") || error.message.includes("Abort"))) {
        await new Promise(r => setTimeout(r, 300 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
  throw ultimoError;
}

export function useUsuario() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoUsuario>({
    usuarioId: null,
    correo: "",
    perfil: null,
    otroPerfil: null,
    perfiles: [],
    cargando: true,
  });

  useEffect(() => {
    const cliente = crearClienteSupabase();

    async function cargar() {
      const [datosUsuario, { data: perfiles, error }] = await Promise.all([
        getUserConReintentos(cliente),
        cliente.from("perfiles").select("*").order("creado_en", { ascending: true }),
      ]);

      if (error) {
        setEstado((anterior) => ({ ...anterior, cargando: false }));
        return;
      }

      const usuario = datosUsuario.data.user;
      const perfilesRaw = (perfiles ?? []) as Perfil[];
      // Normalizar nombres en TODOS los perfiles
      const perfilesNormalizados = perfilesRaw.map(p => ({
        ...p,
        nombre: nombreLegible(p.nombre),
      }));
      const perfil = perfilesNormalizados.find((item) => item.id === usuario?.id) ?? null;
      const otroPerfil = perfilesNormalizados.find((item) => item.id !== usuario?.id) ?? null;

      setEstado({
        usuarioId: usuario?.id ?? null,
        correo: usuario?.email ?? "",
        perfil,
        otroPerfil,
        perfiles: perfilesNormalizados,
        cargando: false,
      });
    }

    void cargar();

    const { data: suscripcion } = cliente.auth.onAuthStateChange(() => {
      void cargar();
      router.refresh();
    });

    return () => {
      suscripcion.subscription.unsubscribe();
    };
  }, [router]);

  async function cerrarSesion() {
    const cliente = crearClienteSupabase();
    await cliente.auth.signOut();
    router.push("/ingresar");
    router.refresh();
  }

  return {
    ...estado,
    cerrarSesion,
  };
}

export const usarUsuario = useUsuario;
