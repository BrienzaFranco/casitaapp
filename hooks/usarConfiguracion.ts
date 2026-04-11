"use client";

import { useEffect, useState } from "react";
import type { ColoresPersonas } from "@/lib/configuracion";
import { obtenerColores, obtenerLugaresOcultos } from "@/lib/configuracion";
import { usarUsuario } from "./usarUsuario";

export function useConfiguracion() {
  const usuario = usarUsuario();
  const [colores, setColores] = useState<ColoresPersonas>({ franco: "#3b82f6", fabiola: "#10b981" });
  const [lugaresOcultos, setLugaresOcultos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function cargar() {
      const [c, lo] = await Promise.all([
        obtenerColores(),
        obtenerLugaresOcultos(),
      ]);
      if (mounted) {
        setColores(c);
        setLugaresOcultos(lo);
        setCargando(false);
      }
    }
    void cargar();
    return () => { mounted = false; };
  }, []);

  return { colores, setColores, lugaresOcultos, setLugaresOcultos, cargando, nombreUsuario: usuario.perfil?.nombre ?? "" };
}

export const usarConfiguracion = useConfiguracion;
