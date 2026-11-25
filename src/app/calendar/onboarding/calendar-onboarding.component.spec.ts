import { TestBed } from '@angular/core/testing';
import { CalendarOnboardingComponent } from './calendar-onboarding.component';
describe('Isolated calendar practice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  for (const view of ['month', 'week', 'day'] as const) {
    it('practices the complete ' + view + ' flow without network, storage or real services', () => {
      const fetch = vi.fn(() => {
        throw new Error('Practice must not call a service');
      });
      vi.stubGlobal('fetch', fetch);
      const storage = vi.spyOn(Storage.prototype, 'setItem');
      const fixture = TestBed.createComponent(CalendarOnboardingComponent),
        c = fixture.componentInstance;
      c.initialView = view;
      c.begin();
      expect(c.view).toBe(view);
      c.selectSlot(17, view === 'month' ? '' : '11:00');
      expect(c.valid).toBe(false);
      c.openPicker('patient');
      c.query = '000 000 0002';
      expect(c.filteredPatients).toHaveLength(1);
      c.selectPatient(c.filteredPatients[0]);
      expect(c.form.email).toBe('carlos@example.invalid');
      c.openPicker('service');
      c.query = 'seguimiento';
      c.selectService(c.filteredServices[0]);
      c.selectTime('11:00');
      if (!c.time) c.selectTime('11:00');
      expect(c.valid).toBe(true);
      c.save();
      expect(c.stage).toBe('saved');
      expect(c.available(17, '11:00')).toBe(false);
      c.openDetail();
      expect(c.stage).toBe('detail');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Detalles de la Cita');
      c.stage = 'cancel';
      c.cancel();
      expect(c.stage).toBe('finished');
      expect(c.appointment?.status).toBe(2);
      expect(c.available(17, '11:00')).toBe(true);
      const closed = vi.fn();
      c.dismissed.subscribe(closed);
      c.close();
      expect(closed).toHaveBeenCalledWith(true);
      expect(fetch).not.toHaveBeenCalled();
      expect(storage).not.toHaveBeenCalled();
      storage.mockRestore();
    });
  }
  it('accepts manual data and an unknown reason but requires a free slot and name', () => {
    const c = new CalendarOnboardingComponent();
    c.begin();
    c.selectSlot(17);
    c.form.name = 'Paciente manual';
    c.reasonUnknown = true;
    c.toggleUnknown();
    c.selectTime('10:00');
    expect(c.time).toBe('');
    c.selectTime('09:00');
    expect(c.valid).toBe(true);
    c.duration = 120;
    c.changeDuration();
    expect(c.time).toBe('');
    expect(c.valid).toBe(false);
    c.selectTime('14:00');
    c.save();
    expect(c.appointment?.patientId).toBe('');
    expect(c.appointment?.reason).toBe('Sin definir');
  });
  it('can leave the cancellation without changing status and starts a clean practice on replay', () => {
    const c = new CalendarOnboardingComponent();
    c.begin();
    c.selectSlot(20, '12:00');
    c.form = { name: 'Ejemplo', reason: 'Revisión', phone: '', email: '' };
    c.save();
    c.openDetail();
    c.stage = 'cancel';
    c.stage = 'detail';
    expect(c.appointment?.status).toBe(0);
    c.reset();
    expect(c.appointment).toBeNull();
    expect(c.form.name).toBe('');
    expect(c.stage).toBe('intro');
    expect(c.picker).toBeNull();
  });
});
