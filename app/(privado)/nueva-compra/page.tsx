"use client";

import { useDeferredValue } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Compra, CompraEditable } from "@/types";
import { FormularioCompraPC } from "@/components/compras/FormularioCompraPC";
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
    etiquetas_compra_ids: compra.etiquetas_compra.map((e) => e.id),
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
      etiquetas_ids: item.etiquetas.map((e) => e.id),
    })),
  };
}

export default function PaginaNuevaCompra() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idEditar = useDeferredValue(searchParams.get("editar"));
  const estaEditando = Boolean(idEditar);
  const categorias = usarCategorias();
  const compras = usarCompras({ cargarInicial: true, incluirBorradores: estaEditando });
  const usuario = usarUsuario();
  const nombres = deducirNombresParticipantes(usuario.perfiles);
  const compraExistente = compras.compras.find((c) => c.id === idEditar);
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
      <div className="space-y-3">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  if (estaEditando && !compraInicial) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 text-sm text-on-surface-variant">
        No se encontro la compra para editar.
      </section>
    );
  }

  const historia = compras.compras.map((c) => ({
    nombre_lugar: c.nombre_lugar,
    fecha: c.fecha,
    items: c.items.map((i) => ({
      descripcion: i.descripcion,
      categoria_id: i.categoria_id,
      subcategoria_id: i.subcategoria_id,
    })),
  }));

  return (
    <FormularioCompraPC
      key={compraInicial?.id ?? "nueva-compra"}
      categorias={categorias.categorias}
      subcategorias={categorias.subcategorias}
      nombres={nombres}
      registradoPorDefecto={usuario.perfil?.nombre ?? ""}
      compraInicial={compraInicial}
      etiquetas={categorias.etiquetas}
      onGuardar={guardar}
      comprasHistoria={historia}
      onCrearCategoria={async (nombre) => {
        try {
          const nueva = await categorias.crearCategoria({ nombre, color: "", limite_mensual: 0 });
          if (nueva) toast.success(`Categoria "${nombre}" creada`);
          return nueva?.id ?? null;
        } catch {
          toast.error("No se pudo crear la categoria");
          return null;
        }
      }}
      onCrearEtiqueta={async (nombre) => {
        try {
          const nueva = await categorias.crearEtiqueta({ nombre, color: "" });
          if (nueva) toast.success(`Etiqueta "${nombre}" creada`);
          return nueva?.id ?? null;
        } catch {
          toast.error("No se pudo crear la etiqueta");
          return null;
        }
      }}
    />
  );
}
