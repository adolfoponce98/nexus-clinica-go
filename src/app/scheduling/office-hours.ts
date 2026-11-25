export function timeMinutes(value: any): any {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function clockTime(minutes: any): any {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function defaultOfficeHours(): any {
  return {
    version: 1,
    timeZone: 'America/Mexico_City',
    days: Array.from({ length: 7 }, (_, day) => ({
      day,
      closed: false,
      periods: [{ start: '07:00', end: '22:00' }],
    })),
  };
}
export function normalizeOfficeHours(value: any): any {
  if (value === undefined || value === null) return defaultOfficeHours();
  if (value.version !== 1 || !Array.isArray(value.days) || value.days.length !== 7)
    throw new Error('Configura los siete días del horario del consultorio.');
  const seen = new Set();
  const days = value.days.map((entry: any) => {
    if (!Number.isInteger(entry.day) || entry.day < 0 || entry.day > 6 || seen.has(entry.day))
      throw new Error('Día del horario inválido o repetido.');
    seen.add(entry.day);
    if (
      typeof entry.closed !== 'boolean' ||
      !Array.isArray(entry.periods) ||
      entry.periods.length > 4
    )
      throw new Error('Horario del día inválido.');
    const periods = entry.closed
      ? []
      : entry.periods
          .map((p: any) => {
            const start = timeMinutes(p.start),
              end = p.end === '24:00' ? 1440 : timeMinutes(p.end);
            if (start === null || end === null || start >= end)
              throw new Error('La apertura debe ser anterior al cierre.');
            return { start: p.start, end: p.end };
          })
          .sort((a: any, b: any) => a.start.localeCompare(b.start));
    if (!entry.closed && !periods.length)
      throw new Error('Agrega al menos un turno o marca el día como cerrado.');
    for (let i = 1; i < periods.length; i++)
      if (
        timeMinutes(periods[i].start) <
        (periods[i - 1].end === '24:00' ? 1440 : timeMinutes(periods[i - 1].end))
      )
        throw new Error('Los turnos no deben superponerse.');
    return { day: entry.day, closed: entry.closed, periods };
  });
  return {
    version: 1,
    timeZone: 'America/Mexico_City',
    days: days.sort((a: any, b: any) => a.day - b.day),
  };
}
export function officePeriods(office: any, date: any): any {
  if (office?.active === false || office?.status === 'disabled') return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return [];
  const parsed = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return [];
  const hours = normalizeOfficeHours(office?.officeHours),
    day = hours.days.find((d: any) => d.day === parsed.getUTCDay());
  return day?.closed ? [] : day?.periods || [];
}
export function isOfficeBookingAllowed(office: any, date: any, time: any, duration: any = 60): any {
  const start = timeMinutes(time),
    length = Number(duration);
  if (start === null || !Number.isInteger(length) || length <= 0 || start + length > 1440)
    return false;
  return officePeriods(office, date).some(
    (p: any) =>
      start >= timeMinutes(p.start) &&
      start + length <= (p.end === '24:00' ? 1440 : timeMinutes(p.end)),
  );
}
export function officeBookingSlots(office: any, date: any, duration: any = 60): any {
  const result = [];
  for (const p of officePeriods(office, date))
    for (
      let at = timeMinutes(p.start);
      at + Number(duration) <= (p.end === '24:00' ? 1440 : timeMinutes(p.end));
      at += 15
    )
      result.push(clockTime(at));
  return result;
}
