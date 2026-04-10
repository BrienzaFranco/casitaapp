"use client";

import { useCallback, useId, useState } from "react";
import { normalizarTexto } from "@/lib/utiles";

interface OpcionCombobox {
  valor: string;
  etiqueta: string;
}

interface Props {
  valor: string;
  onChange: (valor: string) => void;
  opciones: OpcionCombobox[];
  placeholder?: string;
  listSize?: number;
}

export function Combobox({
  valor,
  onChange,
  opciones,
  placeholder = "Buscar y seleccionar...",
  listSize = 8,
}: Props) {
  const id = useId();
  const [input, setInput] = useState(() => {
    const opcion = opciones.find((o) => o.valor === valor);
    return opcion?.etiqueta ?? "";
  });
  const [activo, setActivo] = useState(false);

  const opcionesFiltradas = input
    ? opciones.filter((o) =>
        normalizarTexto(o.etiqueta).includes(normalizarTexto(input)),
      )
    : opciones.slice(0, listSize);

  const manejarCambio = useCallback(
    (nuevoInput: string) => {
      setInput(nuevoInput);
      setActivo(true);

      const exacta = opciones.find(
        (o) => normalizarTexto(o.etiqueta) === normalizarTexto(nuevoInput),
      );
      if (exacta) {
        onChange(exacta.valor);
        setActivo(false);
        return;
      }

      if (!nuevoInput.trim()) {
        onChange("");
      }
    },
    [opciones, onChange],
  );

  const manejarSeleccion = useCallback(
    (valorSeleccionado: string) => {
      const opcion = opciones.find((o) => o.valor === valorSeleccionado);
      if (opcion) {
        setInput(opcion.etiqueta);
        onChange(valorSeleccionado);
      }
      setActivo(false);
    },
    [opciones, onChange],
  );

  return (
    <div className="relative">
      <input
        type="text"
        list={`${id}-list`}
        value={input}
        onChange={(e) => manejarCambio(e.target.value)}
        onFocus={() => setActivo(true)}
        onBlur={() => setTimeout(() => setActivo(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (opcionesFiltradas.length === 1) {
              manejarSeleccion(opcionesFiltradas[0].valor);
            } else if (opcionesFiltradas.length > 0) {
              manejarSeleccion(opcionesFiltradas[0].valor);
            }
          } else if (e.key === "Escape") {
            setActivo(false);
          }
        }}
        placeholder={placeholder}
        className="h-8 w-full border-none bg-transparent px-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
      />
      <datalist id={`${id}-list`}>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.etiqueta} />
        ))}
      </datalist>
    </div>
  );
}