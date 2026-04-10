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
