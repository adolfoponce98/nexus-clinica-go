import {
  defaultOfficeHours,
  isOfficeBookingAllowed,
  normalizeOfficeHours,
  officeBookingSlots,
} from './office-hours';
describe('Office attendance schedule', () => {
  it('defaults to 07:00–22:00 and checks the entire duration', () => {
    expect(isOfficeBookingAllowed({}, '2026-11-20', '07:00', 60)).toBe(true);
    expect(isOfficeBookingAllowed({}, '2026-11-20', '06:45', 60)).toBe(false);
    expect(isOfficeBookingAllowed({}, '2026-11-20', '21:30', 60)).toBe(false);
    expect(isOfficeBookingAllowed({}, '2026-11-20', '21:00', 60)).toBe(true);
  });
  it('excludes lunch, appointments crossing lunch, and closed weekends', () => {
    const h = defaultOfficeHours();
    h.days[5].periods = [
      { start: '09:00', end: '14:00' },
      { start: '15:00', end: '18:00' },
    ];
    h.days[6].closed = true;
    const office = { officeHours: h };
    expect(isOfficeBookingAllowed(office, '2026-11-20', '13:30', 60)).toBe(false);
    expect(isOfficeBookingAllowed(office, '2026-11-20', '14:00', 30)).toBe(false);
    expect(isOfficeBookingAllowed(office, '2026-11-20', '15:00', 60)).toBe(true);
    expect(officeBookingSlots(office, '2026-11-21', 60)).toEqual([]);
  });
  it('rejects overlap and malformed configuration instead of silently defaulting', () => {
    const h = defaultOfficeHours();
    h.days[1].periods = [{ start: '10:00', end: '09:00' }];
    expect(() => normalizeOfficeHours(h)).toThrow();
    expect(() => normalizeOfficeHours({})).toThrow();
  });
});
