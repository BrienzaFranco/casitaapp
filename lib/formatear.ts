const formateadorMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formateadorPorcentaje = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatearPeso(valor: number) {
  return formateadorMoneda.format(valor);
}

export function formatearFecha(fechaIso: string) {
  return formateadorFecha.format(new Date(`${fechaIso}T00:00:00`));
}

export function formatearPorcentaje(valor: number) {
  return `${formateadorPorcentaje.format(valor)}%`;
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function formatearMesLabel(mes: string): string {
  const [anio, mesNum] = mes.split("-");
  return `${MESES[parseInt(mesNum, 10) - 1]} ${anio}`;
}

export function formatearMesCorto(mes: string): string {
  const [anio, mesNum] = mes.split("-");
  return `${MESES_CORTOS[parseInt(mesNum, 10) - 1]} ${anio}`;
}
