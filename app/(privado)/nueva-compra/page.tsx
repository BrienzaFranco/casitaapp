"use client";

import { useDeferredValue } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Compra, CompraEditable } from "@/types";
import { FormularioCompra } from "@/components/compras/FormularioCompra";
import { Skeleton } from "@/components/ui/Skeleton";
import { deducirNombresParticipantes } from "@/lib/calculos";
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
    hogar_id: compra.hogar_id,
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
  const categorias = usarCategorias();
  const compras = usarCompras();
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
    router.push("/historial");
  }

  if (categorias.cargando || compras.cargando || usuario.cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-[28px]" />
        <Skeleton className="h-72 w-full rounded-[28px]" />
      </div>
    );
  }

  return (
    <FormularioCompra
      key={compraInicial?.id ?? "nueva-compra"}
      categorias={categorias.categorias}
      subcategorias={categorias.subcategorias}
      etiquetas={categorias.etiquetas}
      nombres={nombres}
      registradoPorDefecto={usuario.perfil?.nombre ?? ""}
      compraInicial={compraInicial}
      guardando={compras.guardando}
      onGuardar={guardar}
    />
  );
}
