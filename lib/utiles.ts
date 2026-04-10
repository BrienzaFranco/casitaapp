export function combinarClases(...clases: Array<string | false | null | undefined>) {
  return clases.filter(Boolean).join(" ");
}

function pad(valor: number) {
  return String(valor).padStart(2, "0");
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

export function fechaLocalISO(fecha = new Date()) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

export function mesLocalISO(fecha = new Date()) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}`;
}

/**
 * Convierte nombres de perfil tipo "brienzafrancoj" -> "Franco"
 * o "fabiola123" -> "Fabiola"
 */
export function nombreLegible(nombre: string | null): string {
  if (!nombre) return "Alguien";
  const n = nombre.toLowerCase().trim();
  if (n.includes("franco")) return "Franco";
  if (n.includes("fabiola")) return "Fabiola";
  if (n.includes("fabiana")) return "Fabiola";
  if (n.includes("fab")) return "Fabiola";
  if (n.includes("fran")) return "Franco";
  return nombre;
}

export function nombreCorto(nombre: string): string {
  const legible = nombreLegible(nombre);
  const n = legible.toLowerCase();
  if (n === "franco") return "Franco";
  if (n === "fabiola") return "Fabiola";
  return legible;
}
