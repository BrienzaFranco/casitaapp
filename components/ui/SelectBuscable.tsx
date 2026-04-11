"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { normalizarTexto } from "@/lib/utiles";

interface Opcion {
  valor: string;
  etiqueta: string;
  color?: string;
  frecuencia?: number;
}

interface Props {
  opciones: Opcion[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  onCreateNuevo?: (nombre: string) => Promise<string | null>;
  labelNuevo?: string;
  tamano?: "sm" | "md";
  disabled?: boolean;
}

export function SelectBuscable({
  opciones, valor, onChange,
  placeholder = "Buscar...",
  onCreateNuevo,
  labelNuevo = "+ Nuevo",
  tamano = "sm",
  disabled = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [creando, setCreando] = useState(false);

  const opcionActual = opciones.find(o => o.valor === valor);

  useEffect(() => {
    function clicFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
        if (opcionActual) setBusqueda(opcionActual.etiqueta);
        else setBusqueda("");
      }
    }
    document.addEventListener("mousedown", clicFuera);
    return () => document.removeEventListener("mousedown", clicFuera);
  }, [opcionActual]);

  const opcionesFiltradas = busqueda
    ? opciones.filter(o => normalizarTexto(o.etiqueta).includes(normalizarTexto(busqueda)))
    : opciones;

  // Ordenar por frecuencia (sugerencias primero)
  const ordenadas = [...opcionesFiltradas].sort((a, b) => (b.frecuencia ?? 0) - (a.frecuencia ?? 0));

  const seleccionar = useCallback((v: string) => {
    onChange(v);
    setBusqueda(opciones.find(o => o.valor === v)?.etiqueta ?? "");
    setAbierto(false);
  }, [opciones, onChange]);

  async function crearNuevo() {
    if (!onCreateNuevo || !busqueda.trim() || creando) return;
    setCreando(true);
    const id = await onCreateNuevo(busqueda.trim());
    if (id) {
      onChange(id);
      setBusqueda("");
    }
    setAbierto(false);
    setCreando(false);
  }

  const altura = tamano === "sm" ? "h-7" : "h-8";

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => { if (disabled) return; setAbierto(true); setBusqueda(opcionActual?.etiqueta ?? ""); queueMicrotask(() => inputRef.current?.focus()); }}
        disabled={disabled}
        className={`w-full ${altura} rounded bg-surface-container px-2 font-label text-[10px] text-on-surface text-left outline-none flex items-center justify-between ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        <span className="truncate">{opcionActual?.etiqueta ?? placeholder}</span>
        {opcionActual?.color && <span className="h-2 w-2 rounded-full shrink-0 ml-1" style={{ backgroundColor: opcionActual.color }} />}
      </button>

      {abierto && (
        <div className="absolute z-50 mt-1 w-full rounded-lg bg-surface-container-lowest border border-outline-variant/15 shadow-lg overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1 border-b border-outline-variant/10">
            <Search className="h-3.5 w-3.5 text-on-surface-variant/50 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (ordenadas.length === 1) seleccionar(ordenadas[0].valor);
                  else if (onCreateNuevo && busqueda.trim()) crearNuevo();
                }
                if (e.key === "Escape") setAbierto(false);
              }}
              placeholder="Buscar o crear nuevo..."
              className="flex-1 bg-transparent text-xs text-on-surface outline-none placeholder:text-on-surface-variant/50"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {ordenadas.length > 0 && ordenadas.map(o => (
              <button
                key={o.valor}
                type="button"
                onClick={() => seleccionar(o.valor)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-surface-container transition-colors ${o.valor === valor ? "bg-surface-container-high" : ""}`}
              >
                {o.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                <span className="flex-1 truncate">{o.etiqueta}</span>
                {o.frecuencia && o.frecuencia > 0 && (
                  <span className="font-label text-[8px] text-on-surface-variant/60 tabular-nums">{o.frecuencia}</span>
                )}
              </button>
            ))}

            {onCreateNuevo && busqueda.trim() && !ordenadas.find(o => normalizarTexto(o.etiqueta) === normalizarTexto(busqueda)) && (
              <button
                type="button"
                onClick={crearNuevo}
                disabled={creando}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-secondary hover:bg-surface-container transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span className="flex-1 truncate">{labelNuevo} &ldquo;{busqueda.trim()}&rdquo;</span>
                {creando && <span className="text-[8px] text-on-surface-variant">...</span>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
