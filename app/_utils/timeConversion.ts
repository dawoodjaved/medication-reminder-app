export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  let totalMinutes = hours * 60 + minutes + minutesToAdd;
  totalMinutes = (totalMinutes + 1440) % 1440;

  const newHours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const newMinutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${newHours}:${newMinutes}`;
}
