import {
  appointmentStatus,
  isAttended,
  isValidRange,
  localDateKey,
  monthRanges,
  normalizeAppointment,
  normalizedTime,
  rangeForDate,
  shiftDate,
  sortAppointments,
} from './appointment-history.utils';

describe('Appointment history dates and attendance', () => {
  it('uses the local calendar day instead of converting through UTC', () => {
    const date = new Date(2026, 10, 17, 23, 45);
    expect(localDateKey(date)).toBe('2026-11-17');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('selects Monday through Sunday, including month and year boundaries', () => {
    expect(rangeForDate('2027-01-01', 'week')).toEqual({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
    });
    expect(rangeForDate('2027-01-03', 'week')).toEqual({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
    });
  });
  it('splits an inclusive custom range into backward-compatible monthly requests', () => {
    expect(monthRanges({ startDate: '2026-12-31', endDate: '2027-01-02' })).toEqual([
      { year: 2026, month: 12, startDate: '2026-12-31', endDate: '2026-12-31' },
      { year: 2027, month: 1, startDate: '2027-01-01', endDate: '2027-01-02' },
    ]);
  });
  it('rejects nonexistent dates, reversed dates and ranges longer than 366 days', () => {
    for (const range of [
      { startDate: '2026-02-29', endDate: '2026-03-01' },
      { startDate: '2026-02-02', endDate: '2026-02-01' },
      { startDate: '', endDate: '2026-01-01' },
      { startDate: '2026-01-01', endDate: '2027-01-02' },
    ])
      expect(isValidRange(range)).toBe(false);
    expect(isValidRange({ startDate: '2024-02-29', endDate: '2024-02-29' })).toBe(true);
  });
  it('treats only status 3 as attendance; confirmation is a separate state', () => {
    expect([0, 1, 2, 3, '3', undefined, null].filter((status) => isAttended({ status }))).toEqual([
      3,
      '3',
    ]);
    expect([0, 1, 2, 3].map(appointmentStatus)).toEqual([
      'Sin confirmar',
      'Confirmada',
      'Cancelada',
      'Asistió',
    ]);
  });
  it('normalizes 12-hour and 24-hour times without silently changing status zero', () => {
    expect(normalizedTime('12:00 AM')).toBe('00:00');
    expect(normalizedTime('2:30 PM')).toBe('14:30');
    expect(normalizedTime('25:00')).toBe('');
    expect(normalizeAppointment({ date: '2026-11-17', time: '09:00:00', status: 0 })?.status).toBe(
      0,
    );
  });
  it('sorts attended records newest first and agenda records chronologically', () => {
    const items = ['10:30', '08:00', '09:00'].map(
      (time) => normalizeAppointment({ date: '2026-11-17', time, status: 3 })!,
    );
    expect(sortAppointments(items, true).map((item) => item.time)).toEqual([
      '10:30',
      '09:00',
      '08:00',
    ]);
    expect(sortAppointments(items, false).map((item) => item.time)).toEqual([
      '08:00',
      '09:00',
      '10:30',
    ]);
  });
});
