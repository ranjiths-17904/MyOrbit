export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function diffDays(a, b) {
  const ms = parseISODate(b) - parseISODate(a);
  return Math.round(ms / 86400000);
}

export function startOfWeek(iso) {
  const d = parseISODate(iso || todayISO());
  const day = d.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatLong(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDay(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function weekdayName(iso, style = 'short') {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: style });
}

export function monthLabel(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function startOfMonth(iso) {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function daysInMonth(iso) {
  const d = parseISODate(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function weekNumber(planStart, iso) {
  if (!planStart) return 1;
  const days = Math.max(0, diffDays(planStart, iso));
  return Math.floor(days / 7) + 1;
}

export function dayOfPlan(planStart, iso) {
  if (!planStart) return 1;
  return Math.max(1, diffDays(planStart, iso) + 1);
}

export function minutesToLabel(min) {
  const n = Math.max(0, Math.round(min));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function hoursLabel(min) {
  const h = Math.round((min / 60) * 10) / 10;
  return `${h}h`;
}

export function parseMin(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function fmtMin(min) {
  const wrapped = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
