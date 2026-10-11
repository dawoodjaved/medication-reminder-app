export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const parts = String(timeStr || '00:00').split(':').map((p) => Number(p));
  const hours = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
  let totalMinutes = hours * 60 + minutes + minutesToAdd;
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const newHours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const newMinutes = (totalMinutes % 60).toString().padStart(2, '0');

  return `${newHours}:${newMinutes}`;
}
