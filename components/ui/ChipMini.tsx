"use client";

import { X } from "lucide-react";

interface Props {
  label: string;
  color: string;
  onRemove?: () => void;
}

function normalizarColor(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return `${color}20`;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const expandido = color
      .slice(1)
      .split("")
      .map((caracter) => `${caracter}${caracter}`)
      .join("");
    return `#${expandido}20`;
  }

  return "rgb(243 244 246)";
}

export function ChipMini({ label, color, onRemove }: Props) {
  const abreviado = label.slice(0, 3).toUpperCase();

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: normalizarColor(color),
        color,
      }}
    >
      {abreviado}
      {onRemove ? (
        <button type="button" onClick={onRemove} className="ml-0.5 hover:opacity-70">
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </span>
  );
}
