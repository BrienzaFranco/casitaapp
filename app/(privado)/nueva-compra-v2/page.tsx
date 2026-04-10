"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Calendar,
  MapPin,
  Tag,
  DollarSign,
  Users,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Calculator,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TIPOS
// ============================================

type TipoReparto = "50/50" | "solo_franco" | "solo_fabiola" | "personalizado";

interface ItemNuevo {
  id: string;
  descripcion: string;
  categoria_id: string;
  subcategoria_id: string;
  expresion_monto: string;
  monto_resuelto: number;
  tipo_reparto: TipoReparto;
  pago_franco: number;
  pago_fabiola: number;
  etiquetas_ids: string[];
}

interface PasoConfig {
  id: number;
  titulo: string;
  subtitulo: string;
  icono: React.ElementType;
}

// ============================================
// DATOS DE EJEMPLO
// ============================================

const CATEGORIAS = [
  { id: "1", nombre: "Alimentos", color: "#10b981", icono: "🍽️" },
  { id: "2", nombre: "Higiene", color: "#f472b6", icono: "🧴" },
  { id: "3", nombre: "Vivienda", color: "#6366f1", icono: "🏠" },
  { id: "4", nombre: "Transporte", color: "#f59e0b", icono: "🚗" },
  { id: "5", nombre: "Salud", color: "#ef4444", icono: "💊" },
  { id: "6", nombre: "Mascota", color: "#84cc16", icono: "🐾" },
];

const SUBCATEGORIAS: Record<string, { id: string; nombre: string }[]> = {
  "1": [
    { id: "1a", nombre: "Almacén" },
    { id: "1b", nombre: "Carnicería" },
    { id: "1c", nombre: "Verdulería" },
    { id: "1d", nombre: "Bebidas" },
    { id: "1e", nombre: "Comida hecha" },
    { id: "1f", nombre: "Snacks" },
  ],
  "2": [
    { id: "2a", nombre: "Shampoo" },
    { id: "2b", nombre: "Limpieza" },
    { id: "2c", nombre: "Maquillaje" },
  ],
  "3": [
    { id: "3a", nombre: "Alquiler" },
    { id: "3b", nombre: "Expensas" },
    { id: "3c", nombre: "Servicios" },
  ],
  "4": [
    { id: "4a", nombre: "Nafta" },
    { id: "4b", nombre: "SUBE" },
    { id: "4c", nombre: "Peaje" },
  ],
  "5": [
    { id: "5a", nombre: "Farmacia" },
    { id: "5b", nombre: "Médico" },
  ],
  "6": [
    { id: "6a", nombre: "Alimento" },
    { id: "6b", nombre: "Veterinaria" },
  ],
};

const ETIQUETAS = [
  { id: "e1", nombre: "IMPREVISTO", color: "#ef4444" },
  { id: "e2", nombre: "VACACIONES", color: "#0ea5e9" },
  { id: "e3", nombre: "REGALO", color: "#ec4899" },
  { id: "e4", nombre: "URGENCIA", color: "#f97316" },
];

const PASOS: PasoConfig[] = [
  { id: 1, titulo: "Fecha y lugar", subtitulo: "¿Cuándo y dónde fue?", icono: Calendar },
  { id: 2, titulo: "Categoría", subtitulo: "¿Qué tipo de gasto es?", icono: Tag },
  { id: 3, titulo: "Descripción", subtitulo: "¿Qué compraste?", icono: Sparkles },
  { id: 4, titulo: "Monto", subtitulo: "¿Cuánto costó?", icono: DollarSign },
  { id: 5, titulo: "Reparto", subtitulo: "¿Cómo lo dividen?", icono: Users },
];

// ============================================
// UTILIDADES
// ============================================

function evaluarExpresion(expr: string): number {
  if (!expr.trim()) return 0;
  try {
    const limpio = expr.replace(/[^0-9+\-*/().]/g, "");
    const resultado = Function('"use strict";return(' + limpio + ")")();
    return isFinite(resultado) ? Math.round(resultado) : 0;
  } catch {
    return 0;
  }
}

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monto);
}

function generarId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================
// COMPONENTES
// ============================================

function IndicadorPasos({ pasoActual, totalPasos }: { pasoActual: number; totalPasos: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalPasos }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i + 1 === pasoActual ? "w-8 bg-emerald-500" : i + 1 < pasoActual ? "w-4 bg-emerald-300" : "w-4 bg-gray-200"
          )}
          initial={false}
          animate={{ width: i + 1 === pasoActual ? 32 : 16 }}
        />
      ))}
    </div>
  );
}

function BotonContinuar({
  onClick,
  disabled,
  texto = "Continuar",
}: {
  onClick: () => void;
  disabled?: boolean;
  texto?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition-all",
        disabled ? "cursor-not-allowed bg-gray-100 text-gray-400" : "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
      )}
    >
      {texto}
      <ChevronRight className="h-5 w-5" />
    </motion.button>
  );
}

function BotonRetroceder({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium text-gray-500"
    >
      <ChevronLeft className="h-4 w-4" />
      Volver
    </motion.button>
  );
}

// ============================================
// PASO 1: FECHA Y LUGAR
// ============================================

function PasoFechaLugar({
  fecha,
  lugar,
  registradoPor,
  onCambiarFecha,
  onCambiarLugar,
  onCambiarRegistradoPor,
}: {
  fecha: string;
  lugar: string;
  registradoPor: string;
  onCambiarFecha: (fecha: string) => void;
  onCambiarLugar: (lugar: string) => void;
  onCambiarRegistradoPor: (nombre: string) => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Fecha rápida */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Fecha</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { valor: hoy, texto: "Hoy" },
            { valor: ayer, texto: "Ayer" },
            { valor: "", texto: "Otra" },
          ].map((opcion) => (
            <button
              key={opcion.texto}
              onClick={() => opcion.valor && onCambiarFecha(opcion.valor)}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition-all",
                fecha === opcion.valor
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              {opcion.texto}
            </button>
          ))}
        </div>
        {fecha !== hoy && fecha !== ayer && (
          <motion.input
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            type="date"
            value={fecha}
            onChange={(e) => onCambiarFecha(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        )}
      </div>

      {/* Lugar */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Lugar</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={lugar}
            onChange={(e) => onCambiarLugar(e.target.value)}
            placeholder="Ej: Coto Palermo"
            className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        {/* Sugerencias rápidas */}
        <div className="flex flex-wrap gap-2">
          {["Coto", "Día", "Carrefour", "Farmacity"].map((sugerencia) => (
            <button
              key={sugerencia}
              onClick={() => onCambiarLugar(sugerencia)}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
            >
              {sugerencia}
            </button>
          ))}
        </div>
      </div>

      {/* Quién registra */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">¿Quién registra?</label>
        <div className="grid grid-cols-2 gap-3">
          {["Franco", "Fabiola"].map((nombre) => (
            <button
              key={nombre}
              onClick={() => onCambiarRegistradoPor(nombre)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-4 py-4 font-medium transition-all",
                registradoPor === nombre
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  registradoPor === nombre ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                )}
              >
                {nombre[0]}
              </div>
              {nombre}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// PASO 2: CATEGORÍA
// ============================================

function PasoCategoria({
  categoriaId,
  subcategoriaId,
  onCambiarCategoria,
  onCambiarSubcategoria,
}: {
  categoriaId: string;
  subcategoriaId: string;
  onCambiarCategoria: (id: string) => void;
  onCambiarSubcategoria: (id: string) => void;
}) {
  const subcategorias = SUBCATEGORIAS[categoriaId] || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Categorías */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Categoría</label>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIAS.map((cat) => (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onCambiarCategoria(cat.id);
                onCambiarSubcategoria("");
              }}
              className={cn(
                "flex items-center gap-3 rounded-2xl p-4 text-left transition-all",
                categoriaId === cat.id ? "shadow-md ring-2" : "bg-gray-50 hover:bg-gray-100"
              )}
              style={{
                backgroundColor: categoriaId === cat.id ? `${cat.color}15` : undefined,
                borderColor: categoriaId === cat.id ? cat.color : undefined,
                ringColor: categoriaId === cat.id ? cat.color : undefined,
              }}
            >
              <span className="text-2xl">{cat.icono}</span>
              <span className={cn("font-medium", categoriaId === cat.id ? "text-gray-900" : "text-gray-700")}>
                {cat.nombre}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Subcategorías */}
      <AnimatePresence>
        {subcategorias.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <label className="text-sm font-medium text-gray-700">Subcategoría (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {subcategorias.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => onCambiarSubcategoria(subcategoriaId === sub.id ? "" : sub.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    subcategoriaId === sub.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {sub.nombre}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// PASO 3: DESCRIPCIÓN
// ============================================

function PasoDescripcion({
  descripcion,
  etiquetasIds,
  onCambiarDescripcion,
  onAlternarEtiqueta,
}: {
  descripcion: string;
  etiquetasIds: string[];
  onCambiarDescripcion: (desc: string) => void;
  onAlternarEtiqueta: (id: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Descripción */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => onCambiarDescripcion(e.target.value)}
          placeholder="Ej: Pollo entero, coca cola 2.5L..."
          rows={3}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Etiquetas - UI minimalista, aparecen al final */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Etiquetas</label>
          <span className="text-xs text-gray-400">Opcional</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ETIQUETAS.map((etiqueta) => {
            const activa = etiquetasIds.includes(etiqueta.id);
            return (
              <button
                key={etiqueta.id}
                onClick={() => onAlternarEtiqueta(etiqueta.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
                  activa ? "text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
                style={{
                  backgroundColor: activa ? etiqueta.color : undefined,
                }}
              >
                {etiqueta.nombre}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// PASO 4: MONTO
// ============================================

function PasoMonto({
  expresion,
  montoResuelto,
  onCambiarExpresion,
}: {
  expresion: string;
  montoResuelto: number;
  onCambiarExpresion: (expr: string) => void;
}) {
  const [mostrarCalculadora, setMostrarCalculadora] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Input de monto con preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Monto</label>
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            inputMode="decimal"
            value={expresion}
            onChange={(e) => onCambiarExpresion(e.target.value)}
            placeholder="4000-521+200"
            className="w-full rounded-2xl border border-gray-200 bg-white py-5 pl-12 pr-4 font-mono text-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={() => setMostrarCalculadora(!mostrarCalculadora)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <Calculator className="h-5 w-5" />
          </button>
        </div>

        {/* Preview del resultado */}
        <AnimatePresence>
          {expresion && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex items-center justify-between rounded-xl px-4 py-3",
                montoResuelto > 0 ? "bg-emerald-50" : "bg-red-50"
              )}
            >
              <span className="text-sm text-gray-600">Resultado:</span>
              <span className={cn("font-mono text-xl font-bold", montoResuelto > 0 ? "text-emerald-600" : "text-red-500")}>
                {montoResuelto > 0 ? formatearPeso(montoResuelto) : "Expresión inválida"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ayuda */}
      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-xs text-gray-500">
          <span className="font-medium">Tip:</span> Podés escribir operaciones como{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-emerald-600">4000-521</code> para aplicar descuentos
          directamente.
        </p>
      </div>
    </motion.div>
  );
}

// ============================================
// PASO 5: REPARTO (FINAL)
// ============================================

function PasoReparto({
  tipoReparto,
  pagoFranco,
  pagoFabiola,
  montoTotal,
  onCambiarTipoReparto,
  onCambiarPagoFranco,
  onCambiarPagoFabiola,
}: {
  tipoReparto: TipoReparto;
  pagoFranco: number;
  pagoFabiola: number;
  montoTotal: number;
  onCambiarTipoReparto: (tipo: TipoReparto) => void;
  onCambiarPagoFranco: (monto: number) => void;
  onCambiarPagoFabiola: (monto: number) => void;
}) {
  // Calcular reparto automáticamente
  const calcularReparto = useCallback(
    (tipo: TipoReparto) => {
      switch (tipo) {
        case "50/50":
          return { franco: montoTotal / 2, fabiola: montoTotal / 2 };
        case "solo_franco":
          return { franco: montoTotal, fabiola: 0 };
        case "solo_fabiola":
          return { franco: 0, fabiola: montoTotal };
        default:
          return { franco: pagoFranco, fabiola: pagoFabiola };
      }
    },
    [montoTotal, pagoFranco, pagoFabiola]
  );

  const reparto = calcularReparto(tipoReparto);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Opciones de reparto */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">¿Cómo lo dividen?</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { tipo: "50/50" as TipoReparto, texto: "50/50", desc: "Mitades iguales" },
            { tipo: "solo_franco" as TipoReparto, texto: "Solo Franco", desc: "100% Franco" },
            { tipo: "solo_fabiola" as TipoReparto, texto: "Solo Fabiola", desc: "100% Fabiola" },
            { tipo: "personalizado" as TipoReparto, texto: "Personalizado", desc: "Definir montos" },
          ].map((opcion) => (
            <button
              key={opcion.tipo}
              onClick={() => onCambiarTipoReparto(opcion.tipo)}
              className={cn(
                "flex flex-col items-center rounded-2xl p-4 transition-all",
                tipoReparto === opcion.tipo
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              <span className="font-semibold">{opcion.texto}</span>
              <span className={cn("text-xs", tipoReparto === opcion.tipo ? "text-emerald-100" : "text-gray-400")}>
                {opcion.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs personalizados */}
      <AnimatePresence>
        {tipoReparto === "personalizado" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Franco paga</label>
              <input
                type="number"
                inputMode="decimal"
                value={pagoFranco || ""}
                onChange={(e) => onCambiarPagoFranco(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fabiola paga</label>
              <input
                type="number"
                inputMode="decimal"
                value={pagoFabiola || ""}
                onChange={(e) => onCambiarPagoFabiola(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resumen visual del reparto */}
      <motion.div
        layout
        className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5"
      >
        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">Resumen del reparto</h4>

        {/* Barra de distribución visual */}
        <div className="mb-4 h-3 overflow-hidden rounded-full bg-white">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
            initial={{ width: 0 }}
            animate={{ width: montoTotal > 0 ? `${(reparto.franco / montoTotal) * 100}%` : "50%" }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Desglose */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/70 p-3 text-center backdrop-blur">
            <p className="text-xs font-medium text-gray-500">Franco</p>
            <p className="font-mono text-xl font-bold text-emerald-600">
              {formatearPeso(tipoReparto === "personalizado" ? pagoFranco : reparto.franco)}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 text-center backdrop-blur">
            <p className="text-xs font-medium text-gray-500">Fabiola</p>
            <p className="font-mono text-xl font-bold text-teal-600">
              {formatearPeso(tipoReparto === "personalizado" ? pagoFabiola : reparto.fabiola)}
            </p>
          </div>
        </div>

        {/* Total */}
        <div className="mt-4 border-t border-emerald-200/50 pt-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Total</span>
            <span className="font-mono text-2xl font-bold text-gray-900">{formatearPeso(montoTotal)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// LISTA DE ITEMS (con drag & drop)
// ============================================

function ListaItemsAgregados({
  items,
  onReordenar,
  onEliminar,
}: {
  items: ItemNuevo[];
  onReordenar: (items: ItemNuevo[]) => void;
  onEliminar: (id: string) => void;
}) {
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.monto_resuelto, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Items agregados</h3>
        <span className="font-mono text-sm font-medium text-emerald-600">{formatearPeso(total)}</span>
      </div>

      <Reorder.Group axis="y" values={items} onReorder={onReordenar} className="space-y-2">
        {items.map((item) => {
          const categoria = CATEGORIAS.find((c) => c.id === item.categoria_id);
          return (
            <Reorder.Item
              key={item.id}
              value={item}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
            >
              <GripVertical className="h-5 w-5 cursor-grab text-gray-300 active:cursor-grabbing" />
              <span className="text-lg">{categoria?.icono || "📦"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{item.descripcion || "Sin descripción"}</p>
                <p className="text-xs text-gray-500">{categoria?.nombre || "Sin categoría"}</p>
              </div>
              <span className="font-mono text-sm font-semibold text-gray-700">{formatearPeso(item.monto_resuelto)}</span>
              <button
                onClick={() => onEliminar(item.id)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </motion.div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NuevaCompraV2() {
  // Estado del flujo
  const [pasoActual, setPasoActual] = useState(1);

  // Estado de la compra
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [lugar, setLugar] = useState("");
  const [registradoPor, setRegistradoPor] = useState("Franco");

  // Estado del item actual
  const [categoriaId, setCategoriaId] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [expresionMonto, setExpresionMonto] = useState("");
  const [tipoReparto, setTipoReparto] = useState<TipoReparto>("50/50");
  const [pagoFranco, setPagoFranco] = useState(0);
  const [pagoFabiola, setPagoFabiola] = useState(0);
  const [etiquetasIds, setEtiquetasIds] = useState<string[]>([]);

  // Items agregados
  const [items, setItems] = useState<ItemNuevo[]>([]);

  // Monto calculado
  const montoResuelto = useMemo(() => evaluarExpresion(expresionMonto), [expresionMonto]);

  // Validación por paso
  const puedeAvanzar = useMemo(() => {
    switch (pasoActual) {
      case 1:
        return fecha && lugar && registradoPor;
      case 2:
        return categoriaId;
      case 3:
        return true; // Descripción es opcional
      case 4:
        return montoResuelto > 0;
      case 5:
        return true;
      default:
        return false;
    }
  }, [pasoActual, fecha, lugar, registradoPor, categoriaId, montoResuelto]);

  // Alternar etiqueta
  const alternarEtiqueta = (id: string) => {
    setEtiquetasIds((prev) => (prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]));
  };

  // Agregar item
  const agregarItem = () => {
    const nuevoItem: ItemNuevo = {
      id: generarId(),
      descripcion,
      categoria_id: categoriaId,
      subcategoria_id: subcategoriaId,
      expresion_monto: expresionMonto,
      monto_resuelto: montoResuelto,
      tipo_reparto: tipoReparto,
      pago_franco: tipoReparto === "personalizado" ? pagoFranco : tipoReparto === "50/50" ? montoResuelto / 2 : tipoReparto === "solo_franco" ? montoResuelto : 0,
      pago_fabiola: tipoReparto === "personalizado" ? pagoFabiola : tipoReparto === "50/50" ? montoResuelto / 2 : tipoReparto === "solo_fabiola" ? montoResuelto : 0,
      etiquetas_ids: etiquetasIds,
    };

    setItems((prev) => [...prev, nuevoItem]);

    // Reset para nuevo item
    setCategoriaId("");
    setSubcategoriaId("");
    setDescripcion("");
    setExpresionMonto("");
    setTipoReparto("50/50");
    setPagoFranco(0);
    setPagoFabiola(0);
    setEtiquetasIds([]);
    setPasoActual(2); // Volver a categoría para agregar otro
  };

  // Navegar
  const avanzar = () => {
    if (pasoActual < 5) {
      setPasoActual((prev) => prev + 1);
    } else {
      agregarItem();
    }
  };

  const retroceder = () => {
    if (pasoActual > 1) {
      setPasoActual((prev) => prev - 1);
    }
  };

  // Configuración del paso actual
  const pasoConfig = PASOS[pasoActual - 1];

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Nueva compra</h1>
              <p className="text-sm text-gray-500">
                {lugar || "Sin lugar"} · {fecha}
              </p>
            </div>
            {items.length > 0 && (
              <div className="rounded-full bg-emerald-100 px-3 py-1">
                <span className="font-mono text-sm font-semibold text-emerald-700">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          <IndicadorPasos pasoActual={pasoActual} totalPasos={5} />
        </div>
      </header>

      {/* Contenido del paso */}
      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Título del paso */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <pasoConfig.icono className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{pasoConfig.titulo}</h2>
            <p className="text-sm text-gray-500">{pasoConfig.subtitulo}</p>
          </div>
        </div>

        {/* Contenido dinámico por paso */}
        <AnimatePresence mode="wait">
          {pasoActual === 1 && (
            <PasoFechaLugar
              key="paso1"
              fecha={fecha}
              lugar={lugar}
              registradoPor={registradoPor}
              onCambiarFecha={setFecha}
              onCambiarLugar={setLugar}
              onCambiarRegistradoPor={setRegistradoPor}
            />
          )}
          {pasoActual === 2 && (
            <PasoCategoria
              key="paso2"
              categoriaId={categoriaId}
              subcategoriaId={subcategoriaId}
              onCambiarCategoria={setCategoriaId}
              onCambiarSubcategoria={setSubcategoriaId}
            />
          )}
          {pasoActual === 3 && (
            <PasoDescripcion
              key="paso3"
              descripcion={descripcion}
              etiquetasIds={etiquetasIds}
              onCambiarDescripcion={setDescripcion}
              onAlternarEtiqueta={alternarEtiqueta}
            />
          )}
          {pasoActual === 4 && (
            <PasoMonto
              key="paso4"
              expresion={expresionMonto}
              montoResuelto={montoResuelto}
              onCambiarExpresion={setExpresionMonto}
            />
          )}
          {pasoActual === 5 && (
            <PasoReparto
              key="paso5"
              tipoReparto={tipoReparto}
              pagoFranco={pagoFranco}
              pagoFabiola={pagoFabiola}
              montoTotal={montoResuelto}
              onCambiarTipoReparto={setTipoReparto}
              onCambiarPagoFranco={setPagoFranco}
              onCambiarPagoFabiola={setPagoFabiola}
            />
          )}
        </AnimatePresence>

        {/* Lista de items agregados */}
        <ListaItemsAgregados
          items={items}
          onReordenar={setItems}
          onEliminar={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
        />
      </main>

      {/* Footer con acciones */}
      <footer className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          {pasoActual > 1 && <BotonRetroceder onClick={retroceder} />}
          <div className="flex-1">
            <BotonContinuar
              onClick={avanzar}
              disabled={!puedeAvanzar}
              texto={pasoActual === 5 ? "Agregar item" : "Continuar"}
            />
          </div>
        </div>

        {/* Botón guardar compra */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 pb-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 font-semibold text-white">
              <Check className="h-5 w-5" />
              Guardar compra ({items.length} items)
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
