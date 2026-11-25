import { OfficeHoursEditorComponent } from './office-hours-editor.component';
import { defaultOfficeHours, isOfficeBookingAllowed } from './office-hours';
describe('General clinic schedule', () => {
  it('applies a single attention and lunch period to all selected weekdays and excludes weekends', () => {
    const c = new OfficeHoursEditorComponent();
    c.value = defaultOfficeHours();
    c.ngOnChanges();
    c.opening = '09:00';
    c.closing = '18:00';
    c.hasLunch = true;
    c.lunchStart = '13:00';
    c.lunchEnd = '14:00';
    c.selected = [1, 2, 3, 4, 5];
    let value: any;
    c.valueChange.subscribe((v) => (value = v));
    c.emit();
    expect(c.error).toBe('');
    expect(value.days[1].periods).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ]);
    expect(value.days[5].periods).toEqual(value.days[1].periods);
    expect(value.days[6].closed).toBe(true);
    expect(isOfficeBookingAllowed({ officeHours: value }, '2026-11-23', '13:00', 30)).toBe(false);
    expect(isOfficeBookingAllowed({ officeHours: value }, '2026-11-23', '14:00', 60)).toBe(true);
  });
  it('shows invalid lunch ranges and does not silently change an existing per-day schedule on load', () => {
    const c = new OfficeHoursEditorComponent(),
      saved = defaultOfficeHours();
    saved.days[2].periods = [{ start: '08:00', end: '17:00' }];
    c.value = saved;
    const emit = vi.fn();
    c.valueChange.subscribe(emit);
    c.ngOnChanges();
    expect(c.varied).toBe(true);
    expect(emit).not.toHaveBeenCalled();
    c.hasLunch = true;
    c.lunchStart = '06:00';
    c.lunchEnd = '08:00';
    expect(c.error).toContain('dentro');
    expect(saved.days[2].periods[0].start).toBe('08:00');
  });
});
