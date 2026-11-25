export type PeriodMode = 'day' | 'week' | 'custom';
export interface DateRange {
  startDate: string;
  endDate: string;
}
export interface HistoryAppointment {
  id: string;
  date: string;
  time: string;
  endTime?: string;
  patientName: string;
  reason: string;
  phone: string;
  status: number | string;
  syncId?: string;
  name?: string;
  avatar?: string;
  specialty?: string;
  [key: string]: any;
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value ? date : null;
}

export function shiftDate(value: string, days: number): string {
  const date = parseLocalDate(value)!;
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function rangeForDate(value: string, mode: 'day' | 'week'): DateRange {
  if (mode === 'day') return { startDate: value, endDate: value };
  const date = parseLocalDate(value)!;
  const startDate = shiftDate(value, -((date.getDay() + 6) % 7));
  return { startDate, endDate: shiftDate(startDate, 6) };
}

export function rangeLength(range: DateRange): number {
  const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);
  return (utc(range.endDate) - utc(range.startDate)) / 86_400_000 + 1;
}

export function isValidRange(range: DateRange): boolean {
  return (
    !!parseLocalDate(range.startDate) &&
    !!parseLocalDate(range.endDate) &&
    range.startDate <= range.endDate &&
    rangeLength(range) <= 366
  );
}

export function monthRanges(range: DateRange): Array<DateRange & { year: number; month: number }> {
  if (!isValidRange(range)) throw new Error('Indica un rango válido de hasta 366 días.');
  const result = [];
  let start = range.startDate;
  while (start <= range.endDate) {
    const date = parseLocalDate(start)!;
    const year = date.getFullYear(),
      month = date.getMonth() + 1;
    const lastDay = localDateKey(new Date(year, month, 0, 12));
    const end = lastDay < range.endDate ? lastDay : range.endDate;
    result.push({ year, month, startDate: start, endDate: end });
    start = shiftDate(end, 1);
  }
  return result;
}

export function normalizedTime(value: unknown): string {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return '';
  let hour = Number(match[1]);
  const minute = Number(match[2]),
    meridiem = match[3]?.toUpperCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23) || (meridiem && hour === 0)) return '';
  if (meridiem) hour = (hour % 12) + (meridiem === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

export function normalizeAppointment(
  item: any,
  date = item?.date,
  slot?: string,
): HistoryAppointment | null {
  if (!item || !parseLocalDate(date || '')) return null;
  const time = normalizedTime(item.time || slot);
  if (!time) return null;
  return {
    ...item,
    id: `${date}|${time}`,
    date,
    time,
    endTime: normalizedTime(item.endTime),
    patientName: item.patientName || item.name || 'Sin nombre',
    reason: item.reason || item.specialty || 'Sin motivo especificado',
    phone: item.phone || item.telefono || '',
    status: item.status ?? 0,
  };
}

export function appointmentStatus(status: unknown): string {
  switch (Number(status)) {
    case 0:
      return 'Sin confirmar';
    case 1:
      return 'Confirmada';
    case 2:
      return 'Cancelada';
    case 3:
      return 'Asistió';
    case 4:
      return 'No asistió';
    default:
      return 'Estado sin definir';
  }
}

export function isAttended(item: { status?: unknown }): boolean {
  return item.status !== null && item.status !== undefined && Number(item.status) === 3;
}

export function sortAppointments(
  items: HistoryAppointment[],
  descending: boolean,
): HistoryAppointment[] {
  return [...items].sort((a, b) => {
    const result =
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.id.localeCompare(b.id);
    return descending ? -result : result;
  });
}
