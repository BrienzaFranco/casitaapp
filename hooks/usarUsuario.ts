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
      const [{ data: datosUsuario }, { data: perfiles, error }] = await Promise.all([
        cliente.auth.getUser(),
        cliente.from("perfiles").select("*").order("creado_en", { ascending: true }),
      ]);

      if (error) {
        setEstado((anterior) => ({ ...anterior, cargando: false }));
        return;
      }

      const usuario = datosUsuario.user;
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
