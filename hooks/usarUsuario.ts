"use client";

import { useEffect, useRef } from "react";
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

/**
 * Single shared auth state subscription.
 * Prevents multiple router.refresh() calls when several components
 * use `usarUsuario()` simultaneously (Sidebar, Header, page, etc.).
 */
let authSubscribed = false;

function suscribirseAlAuth(queryClient: ReturnType<typeof useQueryClient>, router: ReturnType<typeof useRouter>) {
  if (authSubscribed) return;
  authSubscribed = true;

  const { data: sub } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT") {
        router.push("/ingresar");
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        const current = queryClient.getQueryData<EstadoUsuario>(["usuario"]);
        if (current?.usuarioId !== session?.user?.id) {
          queryClient.invalidateQueries({ queryKey: ["usuario"] });
        }
      }
    },
  );

  // Clean up when the LAST component using usarUsuario unmounts.
  // We use a MutationObserver on the DOM to detect when all React
  // components are gone, but a simpler approach: unsubscribe on page hide.
  // In practice the subscription stays active, which is fine — it only
  // fires on real auth changes, not on route transitions.
  window.addEventListener("beforeunload", () => {
    sub.subscription.unsubscribe();
    authSubscribed = false;
  }, { once: true });
}

export function useUsuario() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["usuario"],
    queryFn: cargarUsuario,
    staleTime: 1000 * 60 * 5, // 5 min
    gcTime: 1000 * 60 * 30, // 30 min — survive page transitions
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on every mount
    retry: (count, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) {
        return count < 2;
      }
      return false;
    },
  });

  // Register the single shared auth subscription on first mount
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;
    suscribirseAlAuth(queryClient, router);
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
    cargando: isLoading,
    cerrarSesion,
  };
}

export const usarUsuario = useUsuario;
