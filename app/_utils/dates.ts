/** Date helpers for scheduling & calendar */

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return formatDateISO(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getWeekDates(anchor = new Date()): string[] {
  const start = new Date(anchor);
  const day = start.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => formatDateISO(addDays(start, i)));
}

export function dosesPerDay(frequency: string): number {
  if (frequency === 'Twice a day') return 2;
  if (frequency === 'Three times a day') return 3;
  return 1;
}
