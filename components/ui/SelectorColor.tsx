"use client";

import { useState } from "react";

// Predefined color palette
const COLORES_PREDEFINIDOS = [
  "#3b82f6", // azul
  "#10b981", // verde
  "#f59e0b", // ambar
  "#ef4444", // rojo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#06b6d4", // cyan
  "#f97316", // naranja
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
  "#e11d48", // rose
];

interface Props {
  color: string;
  onChange: (color: string) => void;
}

export function SelectorColor({ color, onChange }: Props) {
  const [personalizado, setPersonalizado] = useState(false);

  return (
    <div className="space-y-1.5">
      {/* Grid de colores */}
      <div className="grid grid-cols-6 gap-1.5">
        {COLORES_PREDEFINIDOS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); setPersonalizado(false); }}
            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-on-surface ring-offset-1 ring-offset-surface-container-low" : ""}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Custom color */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 h-7 px-2 rounded bg-surface-container text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors">
          <input
            type="color"
            value={personalizado ? color : COLORES_PREDEFINIDOS.find(c => c === color) ? "" : color}
            onChange={e => { onChange(e.target.value); setPersonalizado(true); }}
            onFocus={() => setPersonalizado(true)}
            className="h-4 w-4 border-none bg-transparent p-0 cursor-pointer"
          />
          <span className="font-label text-[9px] font-bold uppercase">Personal</span>
        </label>
        {color && !personalizado && (
          <span className="font-label text-[9px] text-on-surface-variant">o usa el selector →</span>
        )}
      </div>
    </div>
  );
}
