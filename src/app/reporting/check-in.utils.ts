import { normalizedTime, parseLocalDate } from '../appointment-history/appointment-history.utils';
export function reminderId(a: any): string {
  return `${a.date}|${normalizedTime(a.time)}`;
}
export function appointmentWindow(a: any): { start: number; end: number } | null {
  const time = normalizedTime(a.time);
  if (!parseLocalDate(a.date || '') || !time) return null;
  const start = new Date(`${a.date}T${time}:00`).getTime();
  const endTime = normalizedTime(a.endTime);
  let end = endTime
    ? new Date(`${a.date}T${endTime}:00`).getTime()
    : start + Math.max(1, Number(a.durationMinutes) || 60) * 60000;
  if (end <= start) end += 86400000;
  return { start, end };
}
export function pendingCheckIns(items: any[], now: number): any[] {
  return items
    .filter(
      (a) =>
        [0, 1].includes(Number(a.status ?? 0)) && (appointmentWindow(a)?.start ?? Infinity) <= now,
    )
    .sort((a, b) => appointmentWindow(b)!.start - appointmentWindow(a)!.start);
}
export function soundBucket(a: any, now: number): number | null {
  const window = appointmentWindow(a);
  return window && now >= window.start && now < window.end
    ? Math.floor((now - window.start) / 600000)
    : null;
}
