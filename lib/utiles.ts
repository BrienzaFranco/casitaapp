export function combinarClases(...clases: Array<string | false | null | undefined>) {
  return clases.filter(Boolean).join(" ");
}

export function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function mesClave(fecha: string) {
  return fecha.slice(0, 7);
}
