"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TIPOS
// ============================================

type TipoReparto = "50/50" | "solo_franco" | "solo_fabiola" | "personalizado";

interface ItemCompra {
  id: string;
  descripcion: string;
  categoria_id: string;
  subcategoria_id: string;
  expresion_monto: string;
  monto: number;
  tipo_reparto: TipoReparto;
  pago_franco: number;
  pago_fabiola: number;
  etiquetas_ids: string[];
}

// ============================================
// DATOS DE EJEMPLO
// ============================================

const CATEGORIAS = [
  { id: "1", nombre: "Alimentos", color: "#10b981", icono: "🍽️" },
  { id: "2", nombre: "Higiene", color: "#ec4899", icono: "🧴" },
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
    { id: "2a", nombre: "Limpieza" },
    { id: "2b", nombre: "Cuidado personal" },
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

function obtenerCategoria(id: string) {
  return CATEGORIAS.find((c) => c.id === id);
}

function obtenerSubcategoria(catId: string, subId: string) {
  return SUBCATEGORIAS[catId]?.find((s) => s.id === subId);
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NuevaCompraV2() {
  const hoy = new Date().toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Estado del encabezado
  const [fecha, setFecha] = useState(hoy);
  const [lugar, setLugar] = useState("");
  const [registradoPor, setRegistradoPor] = useState("Franco");

  // Items de la compra
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [itemEditando, setItemEditando] = useState<string | null>(null);
  
  // Agrupar por categoría
  const [agrupar, setAgrupar] = useState(true);
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set());

  // Items agrupados por categoría
  const itemsAgrupados = useMemo(() => {
    if (!agrupar) return null;
    
    const grupos: Record<string, ItemCompra[]> = {};
    items.forEach((item) => {
      const cat = obtenerCategoria(item.categoria_id);
      const key = cat?.nombre || "Sin categoría";
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    });
    return grupos;
  }, [items, agrupar]);

  // Totales
  const totales = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.monto, 0);
    const franco = items.reduce((sum, item) => sum + item.pago_franco, 0);
    const fabiola = items.reduce((sum, item) => sum + item.pago_fabiola, 0);
    return { total, franco, fabiola };
  }, [items]);

  // Agregar item vacío
  const agregarItem = () => {
    const nuevoItem: ItemCompra = {
      id: generarId(),
      descripcion: "",
      categoria_id: "1",
      subcategoria_id: "",
      expresion_monto: "",
      monto: 0,
      tipo_reparto: "50/50",
      pago_franco: 0,
      pago_fabiola: 0,
      etiquetas_ids: [],
    };
    setItems([...items, nuevoItem]);
    setItemEditando(nuevoItem.id);
  };

  // Actualizar item
  const actualizarItem = (id: string, cambios: Partial<ItemCompra>) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      
      const actualizado = { ...item, ...cambios };
      
      // Recalcular monto si cambió la expresión
      if (cambios.expresion_monto !== undefined) {
        actualizado.monto = evaluarExpresion(cambios.expresion_monto);
      }
      
      // Recalcular reparto si cambió el monto o el tipo de reparto
      if (cambios.expresion_monto !== undefined || cambios.tipo_reparto !== undefined || cambios.monto !== undefined) {
        const monto = actualizado.monto;
        switch (actualizado.tipo_reparto) {
          case "50/50":
            actualizado.pago_franco = Math.round(monto / 2);
            actualizado.pago_fabiola = Math.round(monto / 2);
            break;
          case "solo_franco":
            actualizado.pago_franco = monto;
            actualizado.pago_fabiola = 0;
            break;
          case "solo_fabiola":
            actualizado.pago_franco = 0;
            actualizado.pago_fabiola = monto;
            break;
        }
      }
      
      return actualizado;
    }));
  };

  // Eliminar item
  const eliminarItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    if (itemEditando === id) setItemEditando(null);
  };

  // Toggle grupo expandido
  const toggleGrupo = (nombre: string) => {
    const nuevos = new Set(gruposExpandidos);
    if (nuevos.has(nombre)) {
      nuevos.delete(nombre);
    } else {
      nuevos.add(nombre);
    }
    setGruposExpandidos(nuevos);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header de la compra */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Fecha */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="border-none bg-transparent text-sm font-medium focus:outline-none"
              >
                <option value={hoy}>Hoy</option>
                <option value={ayer}>Ayer</option>
              </select>
            </div>

            {/* Lugar */}
            <div className="flex flex-1 items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Lugar..."
                className="w-full border-none bg-transparent text-sm focus:outline-none"
              />
            </div>

            {/* Quien registra */}
            <div className="flex gap-1">
              {["Franco", "Fabiola"].map((nombre) => (
                <button
                  key={nombre}
                  onClick={() => setRegistradoPor(nombre)}
                  className={cn(
                    "h-8 w-8 rounded-full text-xs font-bold transition-all",
                    registradoPor === nombre
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {nombre[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <button
            onClick={() => setAgrupar(!agrupar)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              agrupar ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            Agrupar por categoría
          </button>
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      {/* Contenido principal - Tabla de items */}
      <main className="p-4">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-foreground">Sin items todavía</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Agregá tu primer item para empezar
            </p>
            <button
              onClick={agregarItem}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Agregar item
            </button>
          </motion.div>
        ) : agrupar && itemsAgrupados ? (
          // Vista agrupada por categoría
          <div className="space-y-3">
            {Object.entries(itemsAgrupados).map(([nombreCategoria, itemsGrupo]) => {
              const cat = CATEGORIAS.find((c) => c.nombre === nombreCategoria);
              const expandido = gruposExpandidos.has(nombreCategoria);
              const totalGrupo = itemsGrupo.reduce((sum, i) => sum + i.monto, 0);

              return (
                <motion.div
                  key={nombreCategoria}
                  layout
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  {/* Header del grupo */}
                  <button
                    onClick={() => toggleGrupo(nombreCategoria)}
                    className="flex w-full items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: `${cat?.color}20` }}
                      >
                        {cat?.icono}
                      </span>
                      <div className="text-left">
                        <div className="font-medium text-foreground">{nombreCategoria}</div>
                        <div className="text-xs text-muted-foreground">
                          {itemsGrupo.length} {itemsGrupo.length === 1 ? "item" : "items"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {formatearPeso(totalGrupo)}
                      </span>
                      <motion.div
                        animate={{ rotate: expandido ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Items del grupo */}
                  <AnimatePresence>
                    {expandido && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Reorder.Group
                          axis="y"
                          values={itemsGrupo}
                          onReorder={(nuevosItems) => {
                            const otrosItems = items.filter(
                              (i) => obtenerCategoria(i.categoria_id)?.nombre !== nombreCategoria
                            );
                            setItems([...otrosItems, ...nuevosItems]);
                          }}
                          className="divide-y divide-border border-t border-border"
                        >
                          {itemsGrupo.map((item) => (
                            <ItemFila
                              key={item.id}
                              item={item}
                              editando={itemEditando === item.id}
                              onEditar={() => setItemEditando(item.id)}
                              onCerrar={() => setItemEditando(null)}
                              onActualizar={(cambios) => actualizarItem(item.id, cambios)}
                              onEliminar={() => eliminarItem(item.id)}
                            />
                          ))}
                        </Reorder.Group>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          // Vista sin agrupar (lista simple)
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={setItems}
            className="space-y-2"
          >
            {items.map((item) => (
              <ItemFila
                key={item.id}
                item={item}
                editando={itemEditando === item.id}
                onEditar={() => setItemEditando(item.id)}
                onCerrar={() => setItemEditando(null)}
                onActualizar={(cambios) => actualizarItem(item.id, cambios)}
                onEliminar={() => eliminarItem(item.id)}
                mostrarCategoria
              />
            ))}
          </Reorder.Group>
        )}

        {/* Botón agregar más */}
        {items.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={agregarItem}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Agregar item
          </motion.button>
        )}
      </main>

      {/* Footer fijo con resumen y distribución */}
      {items.length > 0 && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="p-4">
            {/* Barra de distribución visual */}
            <div className="mb-3 overflow-hidden rounded-full bg-muted">
              <div className="flex h-2">
                {totales.total > 0 && (
                  <>
                    <motion.div
                      className="bg-sky-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(totales.franco / totales.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.div
                      className="bg-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(totales.fabiola / totales.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Desglose */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-sky-500" />
                  <span className="text-xs text-muted-foreground">Franco</span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {formatearPeso(totales.franco)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-pink-500" />
                  <span className="text-xs text-muted-foreground">Fabiola</span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {formatearPeso(totales.fabiola)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-mono text-xl font-bold text-foreground">
                  {formatearPeso(totales.total)}
                </div>
              </div>
            </div>

            {/* Botón guardar */}
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground transition-all hover:bg-primary/90">
              <Save className="h-5 w-5" />
              Guardar compra
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE FILA DE ITEM
// ============================================

function ItemFila({
  item,
  editando,
  onEditar,
  onCerrar,
  onActualizar,
  onEliminar,
  mostrarCategoria = false,
}: {
  item: ItemCompra;
  editando: boolean;
  onEditar: () => void;
  onCerrar: () => void;
  onActualizar: (cambios: Partial<ItemCompra>) => void;
  onEliminar: () => void;
  mostrarCategoria?: boolean;
}) {
  const cat = obtenerCategoria(item.categoria_id);
  const sub = obtenerSubcategoria(item.categoria_id, item.subcategoria_id);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cuando entra en modo edición, focus al input
  const handleEditar = () => {
    onEditar();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (editando) {
    return (
      <Reorder.Item
        value={item}
        className="bg-card"
        dragListener={false}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 p-4"
        >
          {/* Fila 1: Descripción + Monto */}
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={item.descripcion}
              onChange={(e) => onActualizar({ descripcion: e.target.value })}
              placeholder="Descripción..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={item.expresion_monto}
                onChange={(e) => onActualizar({ expresion_monto: e.target.value })}
                placeholder="0"
                className="w-28 rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-right font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Preview del monto si es expresión */}
          {item.expresion_monto.match(/[+\-*/]/) && item.monto > 0 && (
            <div className="flex justify-end">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                = {formatearPeso(item.monto)}
              </span>
            </div>
          )}

          {/* Fila 2: Categoría + Subcategoría */}
          <div className="flex flex-wrap gap-2">
            <select
              value={item.categoria_id}
              onChange={(e) => onActualizar({ categoria_id: e.target.value, subcategoria_id: "" })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icono} {c.nombre}
                </option>
              ))}
            </select>

            {SUBCATEGORIAS[item.categoria_id]?.length > 0 && (
              <select
                value={item.subcategoria_id}
                onChange={(e) => onActualizar({ subcategoria_id: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Subcategoría...</option>
                {SUBCATEGORIAS[item.categoria_id].map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Fila 3: Reparto */}
          <div className="flex flex-wrap gap-1.5">
            {(["50/50", "solo_franco", "solo_fabiola"] as TipoReparto[]).map((tipo) => (
              <button
                key={tipo}
                onClick={() => onActualizar({ tipo_reparto: tipo })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  item.tipo_reparto === tipo
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tipo === "50/50" ? "50/50" : tipo === "solo_franco" ? "Franco" : "Fabiola"}
              </button>
            ))}
          </div>

          {/* Fila 4: Etiquetas (chips pequeños) */}
          <div className="flex flex-wrap gap-1.5">
            {ETIQUETAS.map((etiqueta) => {
              const activa = item.etiquetas_ids.includes(etiqueta.id);
              return (
                <button
                  key={etiqueta.id}
                  onClick={() => {
                    const nuevas = activa
                      ? item.etiquetas_ids.filter((id) => id !== etiqueta.id)
                      : [...item.etiquetas_ids, etiqueta.id];
                    onActualizar({ etiquetas_ids: nuevas });
                  }}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all",
                    activa ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  style={{ backgroundColor: activa ? etiqueta.color : undefined }}
                >
                  {etiqueta.nombre}
                </button>
              );
            })}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onEliminar}
              className="flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar
            </button>
            <button
              onClick={onCerrar}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              <Check className="h-3 w-3" />
              Listo
            </button>
          </div>
        </motion.div>
      </Reorder.Item>
    );
  }

  // Vista compacta (no editando)
  return (
    <Reorder.Item
      value={item}
      className="group bg-card"
    >
      <motion.div
        layout
        onClick={handleEditar}
        className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/50"
      >
        {/* Handle drag */}
        <div className="cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Categoría (si se muestra) */}
        {mostrarCategoria && cat && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
            style={{ backgroundColor: `${cat.color}20` }}
          >
            {cat.icono}
          </span>
        )}

        {/* Descripción + Subcategoría + Tags */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {item.descripcion || <span className="text-muted-foreground">Sin descripción</span>}
            </span>
            {item.etiquetas_ids.map((id) => {
              const etiqueta = ETIQUETAS.find((e) => e.id === id);
              if (!etiqueta) return null;
              return (
                <span
                  key={id}
                  className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase text-white"
                  style={{ backgroundColor: etiqueta.color }}
                >
                  {etiqueta.nombre.slice(0, 3)}
                </span>
              );
            })}
          </div>
          {sub && (
            <span className="text-xs text-muted-foreground">{sub.nombre}</span>
          )}
        </div>

        {/* Reparto visual mini */}
        <div className="flex items-center gap-1">
          {item.tipo_reparto === "50/50" ? (
            <>
              <div className="h-2 w-2 rounded-full bg-sky-500" />
              <div className="h-2 w-2 rounded-full bg-pink-500" />
            </>
          ) : item.tipo_reparto === "solo_franco" ? (
            <div className="h-2 w-4 rounded-full bg-sky-500" />
          ) : (
            <div className="h-2 w-4 rounded-full bg-pink-500" />
          )}
        </div>

        {/* Monto */}
        <div className="text-right">
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatearPeso(item.monto)}
          </span>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}
