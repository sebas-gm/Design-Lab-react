export function deletionDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date(value.endsWith('Z') ? value : `${value}Z`));
}
