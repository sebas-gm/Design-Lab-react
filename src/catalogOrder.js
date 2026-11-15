const days = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
export function catalogTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const key = `${value.year}-${value.month}-${value.day}`;
  return { key, day: new Date(`${key}T12:00:00Z`).getUTCDay(), minute: Number(value.hour) * 60 + Number(value.minute) };
}
export function businessOpening(business, time = catalogTime()) {
  const selected = (business.dias_atencion || '').split(',').filter(Boolean);
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!selected.length || !selected.every((day) => days.includes(day)) || !valid.test(business.hora_apertura || '') || !valid.test(business.hora_cierre || '')) return 'unknown';
  const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const start = minutes(business.hora_apertura), end = minutes(business.hora_cierre);
  if (start === end) return 'unknown';
  const today = selected.includes(days[time.day]);
  const yesterday = selected.includes(days[(time.day + 6) % 7]);
  const open = start < end ? today && time.minute >= start && time.minute < end : (today && time.minute >= start) || (yesterday && time.minute < end);
  return open ? 'open' : 'closed';
}
function dailyScore(id, day) {
  let hash = 2166136261;
  for (const char of `${day}:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function orderBusinesses(businesses, order = 'open', time = catalogTime()) {
  const rank = { open: 0, closed: 1, unknown: 2 };
  return businesses.filter((b) => b.estado === 'activo').sort((a, b) => {
    if (order === 'name') return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.id - b.id;
    if (order === 'recent') return b.id - a.id;
    return rank[businessOpening(a, time)] - rank[businessOpening(b, time)] || dailyScore(a.id, time.key) - dailyScore(b.id, time.key) || a.id - b.id;
  });
}
