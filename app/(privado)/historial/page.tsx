"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ListaCompras } from "@/components/compras/ListaCompras";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { deducirNombresParticipantes, filtrarComprasHistorial } from "@/lib/calculos";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarUsuario } from "@/hooks/usarUsuario";

export default function PaginaHistorial() {
  const compras = usarCompras();
  const categorias = usarCategorias();
  const usuario = usarUsuario();
  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const [mes, setMes] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [etiquetaId, setEtiquetaId] = useState("");
  const [compraAEliminar, setCompraAEliminar] = useState<string | null>(null);

  const filtradas = filtrarComprasHistorial(compras.compras, {
    mes,
    categoria_id: categoriaId,
    etiqueta_id: etiquetaId,
  });

  async function eliminarCompra() {
    if (!compraAEliminar) {
      return;
    }

    await compras.eliminarCompra(compraAEliminar);
    toast.success("Compra eliminada");
    setCompraAEliminar(null);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-950">Historial</h2>
        <p className="text-sm text-gray-500">Filtra por mes, categoria o etiqueta y expandi cada compra.</p>
      </div>

      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-2 text-left">
            <span className="text-sm font-semibold text-gray-800">Mes</span>
            <input
              type="month"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
              className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <Select
            etiqueta="Categoria"
            value={categoriaId}
            onChange={(event) => setCategoriaId(event.target.value)}
            placeholder="Todas"
            opciones={categorias.categorias.map((categoria) => ({ etiqueta: categoria.nombre, valor: categoria.id }))}
          />
          <Select
            etiqueta="Etiqueta"
            value={etiquetaId}
            onChange={(event) => setEtiquetaId(event.target.value)}
            placeholder="Todas"
            opciones={categorias.etiquetas.map((etiqueta) => ({ etiqueta: etiqueta.nombre, valor: etiqueta.id }))}
          />
        </div>
      </section>

      <ListaCompras compras={filtradas} cargando={compras.cargando} nombres={nombres} onEliminar={setCompraAEliminar} />

      <Modal
        abierto={Boolean(compraAEliminar)}
        titulo="Eliminar compra"
        descripcion="Esta accion elimina la compra y todos sus items."
        confirmacion="Eliminar"
        onCancelar={() => setCompraAEliminar(null)}
        onConfirmar={() => void eliminarCompra()}
      />
    </section>
  );
}
