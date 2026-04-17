import { normalizarTexto } from "./utiles";

interface ResultadoPredictivo {
  categoria_id: string;
  subcategoria_id: string;
}

type MapaLugares = Map<string, ResultadoPredictivo>;

interface CategoriaCatalogo {
  id: string;
  nombre: string;
}

interface SubcategoriaCatalogo {
  id: string;
  categoria_id: string;
  nombre: string;
}

interface CatalogoPredictivo {
  categorias?: CategoriaCatalogo[];
  subcategorias?: SubcategoriaCatalogo[];
}

const CLAVES_ALIMENTOS = [
  "comida",
  "alimento",
  "almuerzo",
  "cena",
  "desayuno",
  "merienda",
  "super",
  "supermercado",
  "coto",
  "disco",
  "carrefour",
  "jumbo",
  "chango",
  "dia ",
  "verdura",
  "fruta",
  "pan",
  "panaderia",
  "carniceria",
  "pescaderia",
  "fiambreria",
  "almacen",
  "kiosco",
  "golosina",
  "snack",
  "bebida",
  "gaseosa",
  "cerveza",
  "vino",
  "pizza",
  "empanada",
  "hamburguesa",
  "sushi",
  "helado",
  "cafe",
  "cafeteria",
  "restaurante",
  "delivery",
  "pedidosya",
  "rappi",
];

const REGLAS_SUBCATEGORIA_ALIMENTOS: Array<{ palabras: string[]; subcategorias: string[] }> = [
  { palabras: ["pan", "factura", "medialuna"], subcategorias: ["panader", "pan"] },
  { palabras: ["carne", "asado", "milanesa", "pollo", "cerdo"], subcategorias: ["carnicer"] },
  { palabras: ["verdura", "fruta", "lechuga", "tomate", "papa"], subcategorias: ["verduler", "fruta"] },
  { palabras: ["cafe", "cafeteria"], subcategorias: ["cafe", "cafeter"] },
  { palabras: ["gaseosa", "agua", "cerveza", "vino", "bebida"], subcategorias: ["bebida", "vinos", "cerveza"] },
  { palabras: ["super", "supermercado", "coto", "disco", "carrefour", "jumbo", "chango", "dia "], subcategorias: ["super", "mercado"] },
  { palabras: ["pizza", "empanada", "hamburguesa", "sushi", "taco", "delivery", "pedidosya", "rappi"], subcategorias: ["delivery", "comida", "restaurante", "rapida"] },
  { palabras: ["helado"], subcategorias: ["helad"] },
  { palabras: ["kiosco", "golosina", "snack"], subcategorias: ["kiosco", "golosina", "snack"] },
];

function textoPareceAlimentos(normalizado: string): boolean {
  return CLAVES_ALIMENTOS.some((clave) => normalizado.includes(clave));
}

function buscarCategoriaAlimentos(categorias: CategoriaCatalogo[]): CategoriaCatalogo | null {
  for (const categoria of categorias) {
    const nombre = normalizarTexto(categoria.nombre);
    if (nombre === "alimentos" || nombre.startsWith("alimento")) return categoria;
  }
  for (const categoria of categorias) {
    const nombre = normalizarTexto(categoria.nombre);
    if (nombre.includes("alimento")) return categoria;
  }
  return null;
}

function elegirSubcategoriaAlimentos(
  textoNormalizado: string,
  categoriaIdAlimentos: string,
  subcategorias: SubcategoriaCatalogo[],
): string {
  const candidatas = subcategorias.filter((s) => s.categoria_id === categoriaIdAlimentos);
  if (!candidatas.length) return "";

  for (const regla of REGLAS_SUBCATEGORIA_ALIMENTOS) {
    if (!regla.palabras.some((palabra) => textoNormalizado.includes(palabra))) continue;
    const sub = candidatas.find((s) => {
      const nombre = normalizarTexto(s.nombre);
      return regla.subcategorias.some((clave) => nombre.includes(clave));
    });
    if (sub) return sub.id;
  }

  const tokens = textoNormalizado.split(/\s+/).filter((token) => token.length >= 4);
  const subPorNombre = candidatas.find((s) => {
    const nombre = normalizarTexto(s.nombre);
    return tokens.some((token) => nombre.includes(token));
  });
  if (subPorNombre) return subPorNombre.id;

  return candidatas[0]?.id ?? "";
}

function predecirAlimentos(
  textoNormalizado: string,
  categorias: CategoriaCatalogo[],
  subcategorias: SubcategoriaCatalogo[],
): ResultadoPredictivo | null {
  if (!textoPareceAlimentos(textoNormalizado)) return null;
  const categoriaAlimentos = buscarCategoriaAlimentos(categorias);
  if (!categoriaAlimentos) return null;
  return {
    categoria_id: categoriaAlimentos.id,
    subcategoria_id: elegirSubcategoriaAlimentos(textoNormalizado, categoriaAlimentos.id, subcategorias),
  };
}

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
  catalogo?: CatalogoPredictivo,
): ResultadoPredictivo | null {
  if (!texto.trim()) return null;

  const normalizado = normalizarTexto(texto);
  const categorias = catalogo?.categorias ?? [];
  const subcategorias = catalogo?.subcategorias ?? [];

  const predAlimentos = predecirAlimentos(normalizado, categorias, subcategorias);
  if (predAlimentos) return predAlimentos;

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
