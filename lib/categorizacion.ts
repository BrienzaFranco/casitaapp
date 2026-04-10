import { normalizarTexto } from "./utiles";

interface ResultadoPredictivo {
  categoria_id: string;
  subcategoria_id: string;
}

type MapaLugares = Map<string, ResultadoPredictivo>;

export function inferirCategoria(
  texto: string,
  opciones: {
    categoria_id?: string;
    subcategoria_id?: string;
  }[],
): ResultadoPredictivo | null {
  if (!texto.trim()) {
    return null;
  }

  for (const opcion of opciones) {
    if (!opcion.categoria_id) continue;

    if (opcion.subcategoria_id) {
      return {
        categoria_id: opcion.categoria_id,
        subcategoria_id: opcion.subcategoria_id,
      };
    }

    return {
      categoria_id: opcion.categoria_id,
      subcategoria_id: "",
    };
  }

  return null;
}

export function cargarMapaLugares(
  compras: Array<{
    nombre_lugar: string;
    items: Array<{
      categoria_id: string | null;
      subcategoria_id: string | null;
    }>;
  }>,
): MapaLugares {
  const mapa = new Map<string, ResultadoPredictivo>();

  for (const compra of compras) {
    if (!compra.nombre_lugar?.trim()) continue;

    const normalizado = normalizarTexto(compra.nombre_lugar);

    for (const item of compra.items) {
      if (item.categoria_id) {
        mapa.set(normalizado, {
          categoria_id: item.categoria_id,
          subcategoria_id: item.subcategoria_id ?? "",
        });
        break;
      }
    }
  }

  return mapa;
}

export function cargarMapaDetalles(
  compras: Array<{
    items: Array<{
      descripcion: string;
      categoria_id: string | null;
      subcategoria_id: string | null;
    }>;
  }>,
): MapaLugares {
  const mapa = new Map<string, ResultadoPredictivo>();

  for (const compra of compras) {
    for (const item of compra.items) {
      if (!item.descripcion?.trim() || !item.categoria_id) continue;

      const palabras = normalizarTexto(item.descripcion).split(" ");
      for (const palabra of palabras) {
        if (palabra.length < 4) continue;

        const existente = mapa.get(palabra);
        if (!existente) {
          mapa.set(palabra, {
            categoria_id: item.categoria_id,
            subcategoria_id: item.subcategoria_id ?? "",
          });
        }
      }
    }
  }

  return mapa;
}

export function predecirCategoria(
  texto: string,
  mapaLugares: MapaLugares | null,
  mapaDetalles: MapaLugares | null,
): ResultadoPredictivo | null {
  if (!texto.trim()) return null;

  const normalizado = normalizarTexto(texto);

  if (mapaLugares) {
    const resultado = mapaLugares.get(normalizado);
    if (resultado) return resultado;
  }

  if (mapaDetalles) {
    const palabras = normalizado.split(" ");
    for (let i = palabras.length - 1; i >= 0; i--) {
      const palabra = palabras.slice(i).join(" ");
      if (palabra.length < 4) continue;

      const resultado = mapaDetalles.get(palabra);
      if (resultado) return resultado;
    }

    for (const palabra of palabras) {
      if (palabra.length < 4) continue;

      const resultado = mapaDetalles.get(palabra);
      if (resultado) return resultado;
    }
  }

  return null;
}
