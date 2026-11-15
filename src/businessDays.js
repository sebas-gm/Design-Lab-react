export const businessDays = [["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"], ["vie", "Viernes"], ["sab", "Sábado"], ["dom", "Domingo"]];
export function formatBusinessDays(value) {
  const selected = (value || "").split(",");
  return businessDays.filter(([id]) => selected.includes(id)).map(([, label]) => label).join(", ") || "Días sin especificar";
}
