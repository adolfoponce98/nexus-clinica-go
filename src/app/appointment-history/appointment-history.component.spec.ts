import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AppointmentHistoryComponent } from './appointment-history.component';
import { AppointmentHistoryService } from './appointment-history.service';
import { localDateKey, normalizeAppointment } from './appointment-history.utils';

describe('AppointmentHistoryComponent', () => {
  let component: AppointmentHistoryComponent;
  let routeData: Subject<any>;
  let history: { cached: ReturnType<typeof vi.fn>; load: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    localStorage.clear();
    routeData = new Subject();
    history = { cached: vi.fn(() => []), load: vi.fn(async () => []) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { data: routeData } },
        { provide: AppointmentHistoryService, useValue: history },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AppointmentHistoryComponent());
    component.ngOnInit();
  });
  afterEach(() => component.ngOnDestroy());
  it('starts with today and only attendance state 3 for the attended-patients route', async () => {
    const today = localDateKey();
    history.load.mockResolvedValue(
      [0, 1, 2, 3].map(
        (status) => normalizeAppointment({ date: today, time: `0${status + 6}:00`, status })!,
      ),
    );
    routeData.next({ view: 'patients' });
    await Promise.resolve();
    expect(component.range()).toEqual({ startDate: today, endDate: today });
    expect(component.filtered().map((item) => item.status)).toEqual([3]);
  });
  it('supports day, week and custom range navigation and validates custom input', () => {
    routeData.next({ view: 'appointments' });
    component.setAnchor('2026-12-31');
    component.step(1);
    expect(component.range()).toEqual({ startDate: '2027-01-01', endDate: '2027-01-01' });
    component.setMode('week');
    expect(component.range()).toEqual({ startDate: '2026-12-28', endDate: '2027-01-03' });
    component.step(1);
    expect(component.range()).toEqual({ startDate: '2027-01-04', endDate: '2027-01-10' });
    component.setMode('custom');
    component.customStart.set('2026-02-02');
    component.customEnd.set('2026-02-01');
    component.applyCustom();
    expect(component.validationError()).not.toBe('');
    component.customEnd.set('2026-02-03');
    component.applyCustom();
    component.step(1);
    expect(component.range()).toEqual({ startDate: '2026-02-04', endDate: '2026-02-05' });
  });
  it('keeps the day agenda complete, including elapsed, cancelled and attended appointments', async () => {
    const today = localDateKey();
    history.load.mockResolvedValue(
      [0, 1, 2, 3].map(
        (status) => normalizeAppointment({ date: today, time: `0${status + 6}:00`, status })!,
      ),
    );
    routeData.next({ view: 'appointments' });
    await Promise.resolve();
    expect(component.filtered().map((item) => item.status)).toEqual([0, 1, 2, 3]);
  });
  it('ignores a delayed response from an older date or branch', async () => {
    let finishOld!: (items: any[]) => void;
    history.load
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValue([]);
    routeData.next({ view: 'appointments' });
    const firstDay = component.range().startDate;
    TestBed.inject(AuthService).saveSucursal({ idConsultorio: 'branch-b' });
    await Promise.resolve();
    finishOld([
      normalizeAppointment({
        date: firstDay,
        time: '09:00',
        patientName: 'Old branch',
        status: 3,
      })!,
    ]);
    await Promise.resolve();
    expect(component.appointments()).toEqual([]);
  });
  it('shows an explicit warning with cached fallback on a network failure', async () => {
    const today = localDateKey();
    history.cached.mockReturnValue([
      normalizeAppointment({ date: today, time: '10:00', status: 3 })!,
    ]);
    history.load.mockRejectedValue(new Error('offline'));
    routeData.next({ view: 'patients' });
    await Promise.resolve();
    expect(component.filtered()).toHaveLength(1);
    expect(component.error()).toContain('incompleta');
    expect(component.loading()).toBe(false);
  });
});
