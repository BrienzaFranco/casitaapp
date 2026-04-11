"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Perfil } from "@/types";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { nombreLegible } from "@/lib/utiles";

interface EstadoUsuario {
  usuarioId: string | null;
  correo: string;
  perfil: Perfil | null;
  otroPerfil: Perfil | null;
  perfiles: Perfil[];
  cargando: boolean;
}

async function cargarUsuario(): Promise<EstadoUsuario> {
  const [{ data: datosUsuario }, { data: perfilesRaw }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("perfiles").select("*").order("creado_en", { ascending: true }),
  ]);

  const usuario = datosUsuario?.user;
  const perfilesNormalizados = ((perfilesRaw ?? []) as Perfil[]).map((p) => ({
    ...p,
    nombre: nombreLegible(p.nombre),
  }));

  const perfil = perfilesNormalizados.find((item) => item.id === usuario?.id) ?? null;
  const otroPerfil = perfilesNormalizados.find((item) => item.id !== usuario?.id) ?? null;

  return {
    usuarioId: usuario?.id ?? null,
    correo: usuario?.email ?? "",
    perfil,
    otroPerfil,
    perfiles: perfilesNormalizados,
    cargando: false,
  };
}

export function useUsuario() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["usuario"],
    queryFn: cargarUsuario,
    staleTime: 1000 * 60 * 5, // 5 min
    refetchOnWindowFocus: false,
    retry: (count, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) {
        return count < 2;
      }
      return false;
    },
    refetchInterval: (query) => {
      // Refetch after auth state changes
      if (query.state.data?.usuarioId) return false;
      return 1000;
    },
  });

  // Escuchar cambios de auth para invalidar el cache
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, _session: Session | null) => {
        queryClient.invalidateQueries({ queryKey: ["usuario"] });
        router.refresh();
      },
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [queryClient, router]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/ingresar");
    router.refresh();
  }

  const estado: EstadoUsuario = data ?? {
    usuarioId: null,
    correo: "",
    perfil: null,
    otroPerfil: null,
    perfiles: [],
    cargando: true,
  };

  return {
    ...estado,
    cargando: isLoading || isFetching,
    cerrarSesion,
  };
}

export const usarUsuario = useUsuario;
