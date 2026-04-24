"use client";

import { useEffect, useState } from "react";
import type { ColoresPersonas } from "@/lib/configuracion";
import { obtenerColores, obtenerLugaresOcultos, obtenerModeloIa } from "@/lib/configuracion";
import { usarUsuario } from "./usarUsuario";

export function useConfiguracion() {
  const usuario = usarUsuario();
  const [colores, setColores] = useState<ColoresPersonas>({ franco: "#3b82f6", fabiola: "#10b981" });
  const [lugaresOcultos, setLugaresOcultos] = useState<string[]>([]);
  const [modeloIa, setModeloIa] = useState("openai/gpt-4o-mini");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function cargar() {
      const [coloresResp, lugaresResp, modeloResp] = await Promise.all([
        obtenerColores(),
        obtenerLugaresOcultos(),
        obtenerModeloIa(),
      ]);
      if (mounted) {
        setColores(coloresResp);
        setLugaresOcultos(lugaresResp);
        setModeloIa(modeloResp);
        setCargando(false);
      }
    }
    void cargar();
    return () => { mounted = false; };
  }, []);

  return {
    colores,
    setColores,
    lugaresOcultos,
    setLugaresOcultos,
    modeloIa,
    setModeloIa,
    cargando,
    nombreUsuario: usuario.perfil?.nombre ?? "",
  };
}

export const usarConfiguracion = useConfiguracion;
