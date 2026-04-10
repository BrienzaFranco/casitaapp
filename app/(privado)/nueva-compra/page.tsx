"use client";

import { useDeferredValue } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Compra, CompraEditable } from "@/types";
import { FormularioCompra } from "@/components/compras/FormularioCompra";
import { Skeleton } from "@/components/ui/Skeleton";
import { deducirNombresParticipantes } from "@/lib/calculos";
import { vibrarExito } from "@/lib/haptics";
import { usarCategorias } from "@/hooks/usarCategorias";
import { usarCompras } from "@/hooks/usarCompras";
import { usarOffline } from "@/hooks/usarOffline";
import { usarUsuario } from "@/hooks/usarUsuario";

function compraAEditable(compra: Compra): CompraEditable {
  return {
    id: compra.id,
    fecha: compra.fecha,
    nombre_lugar: compra.nombre_lugar,
    notas: compra.notas,
    registrado_por: compra.registrado_por,
    pagador_general: compra.pagador_general,
    estado: compra.estado,
    hogar_id: compra.hogar_id,
    etiquetas_compra_ids: compra.etiquetas_compra.map((etiqueta) => etiqueta.id),
    items: compra.items.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      categoria_id: item.categoria_id ?? "",
      subcategoria_id: item.subcategoria_id ?? "",
      expresion_monto: item.expresion_monto,
      monto_resuelto: item.monto_resuelto,
      tipo_reparto: item.tipo_reparto,
      pago_franco: item.pago_franco,
      pago_fabiola: item.pago_fabiola,
      etiquetas_ids: item.etiquetas.map((etiqueta) => etiqueta.id),
    })),
  };
}

export default function PaginaNuevaCompra() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idEditar = useDeferredValue(searchParams.get("editar"));
  const estaEditando = Boolean(idEditar);
  const categorias = usarCategorias();
  const compras = usarCompras({ cargarInicial: estaEditando });
  const usuario = usarUsuario();
  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const compraExistente = compras.compras.find((compra) => compra.id === idEditar);
  const compraInicial = compraExistente ? compraAEditable(compraExistente) : null;
  const { guardarConFallback } = usarOffline(compras.guardarCompra);

  async function guardar(compra: CompraEditable) {
    const resultado = await guardarConFallback({
      ...compra,
      id: compraInicial?.id ?? compra.id,
    });

    if (resultado.pendiente) {
      router.push("/historial");
      return;
    }

    toast.success(compraInicial ? "Compra actualizada" : "Compra guardada");
    vibrarExito();
    router.push("/historial");
  }

  if (estaEditando && compras.cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-md" />
        <Skeleton className="h-72 w-full rounded-md" />
      </div>
    );
  }

  if (estaEditando && !compraInicial) {
    return (
      <section className="border border-gray-300 bg-white p-4 text-sm text-gray-600">
        No se encontro la compra para editar.
      </section>
    );
  }

  const historia = compras.compras.map((c) => ({
    nombre_lugar: c.nombre_lugar,
    items: c.items.map((i) => ({
      descripcion: i.descripcion,
      categoria_id: i.categoria_id,
      subcategoria_id: i.subcategoria_id,
    })),
  }));

  return (
    <FormularioCompra
      key={compraInicial?.id ?? "nueva-compra"}
      categorias={categorias.categorias}
      subcategorias={categorias.subcategorias}
      nombres={nombres}
      registradoPorDefecto={usuario.perfil?.nombre ?? ""}
      compraInicial={compraInicial}
      guardando={compras.guardando}
      etiquetas={categorias.etiquetas}
      onCrearSubcategoria={categorias.crearSubcategoria}
      onGuardar={guardar}
      comprasHistoria={historia}
    />
  );
}
