import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { AppointmentHistoryService } from '../appointment-history/appointment-history.service';
import { ClinicApiService } from './clinic-api.service';
import { CheckInRemindersComponent } from './check-in-reminders.component';
describe('Persistent check-in queue', () => {
  let auth: AuthService,
    component: CheckInRemindersComponent,
    history: any,
    api: any,
    plays: number;
  const item = {
    date: '2026-11-17',
    time: '13:00',
    endTime: '14:00',
    status: 0,
    patientName: 'Ana',
    updatedAt: '2026-11-17T18:00:00Z',
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 17, 13));
    localStorage.clear();
    plays = 0;
    vi.stubGlobal(
      'Audio',
      class {
        play() {
          plays++;
          return Promise.resolve();
        }
      },
    );
    history = { load: vi.fn(async () => [item]) };
    api = {
      branchId: () => auth.getSucursal()?.idConsultorio || '',
      post: vi.fn(),
      mergeAppointment: (a: any) => auth.saveCachedAppointments([a], true),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AppointmentHistoryService, useValue: history },
        { provide: ClinicApiService, useValue: api },
      ],
    });
    auth = TestBed.inject(AuthService);
    auth.saveSession({ email: 'doctor@example.test' });
    auth.saveSucursal({ idConsultorio: 'office' });
    auth.saveCachedAppointments([item], true);
    component = TestBed.runInInjectionContext(() => new CheckInRemindersComponent());
  });
  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('persists overdue cards across reloads and does not repeat a sound within the same ten-minute slot', async () => {
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.queue()).toHaveLength(1);
    expect(plays).toBe(1);
    component.tick();
    expect(plays).toBe(1);
    vi.setSystemTime(new Date(2026, 10, 17, 14, 30));
    component.tick();
    expect(component.queue()).toHaveLength(1);
    expect(plays).toBe(1);
    component.ngOnDestroy();
    component = TestBed.runInInjectionContext(() => new CheckInRemindersComponent());
    component.ngOnInit();
    expect(component.queue()).toHaveLength(1);
    expect(plays).toBe(1);
  });
  it('does not remove a pending card on network error, and removes it only after confirmed persistence', async () => {
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();
    api.post.mockRejectedValueOnce(new Error('offline'));
    await component.confirm(component.queue()[0], 3);
    expect(component.queue()).toHaveLength(1);
    api.post.mockResolvedValueOnce({
      appointment: {
        ...item,
        status: 3,
        appointmentId: 'server-id',
        updatedAt: '2026-11-17T19:01:00Z',
      },
    });
    await component.confirm(component.queue()[0], 3);
    expect(component.queue()).toHaveLength(0);
    expect(auth.getCachedAppointments()[0].status).toBe(3);
  });
  it('isolates queues by branch and applies another user’s completed check-in from server polling', async () => {
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();
    history.load.mockResolvedValue([
      { ...item, status: 3, appointmentId: 'id', updatedAt: '2026-11-17T19:01:00Z' },
    ]);
    await component.refresh();
    expect(component.queue()).toHaveLength(0);
    expect(auth.getCachedAppointments()[0].status).toBe(3);
    auth.clearBranchCache();
    history.load.mockResolvedValue([]);
    auth.saveSucursal({ idConsultorio: 'other' });
    expect(component.queue()).toHaveLength(0);
  });
  it('uses local reminder ticks without querying the server every minute or on repeated focus', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    component.ngOnInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(history.load).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(14 * 60_000);
    expect(history.load).toHaveBeenCalledTimes(1);
    expect(plays).toBe(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(history.load).toHaveBeenCalledTimes(2);
  });

  it('keeps a closed panel hidden on ticks and refreshes, and reopens for a new appointment', async () => {
    component.ngOnInit();
    await vi.advanceTimersByTimeAsync(0);
    component.close();
    component.tick();
    await component.refresh();
    expect(component.closed()).toBe(true);
    expect(component.queue()).toHaveLength(1);
    history.load.mockResolvedValue([
      item,
      {
        ...item,
        time: '12:00',
        endTime: '13:00',
        patientName: 'Nueva paciente',
        appointmentId: 'new',
      },
    ]);
    await component.refresh();
    expect(component.closed()).toBe(false);
    expect(component.queue()).toHaveLength(2);
  });
  it('dismisses current alerts locally across refresh and reload without recording attendance', async () => {
    component.ngOnInit();
    await vi.advanceTimersByTimeAsync(0);
    component.clearAlerts();
    expect(component.queue()).toHaveLength(0);
    expect(api.post).not.toHaveBeenCalled();
    expect(auth.getCachedAppointments()[0].status).toBe(0);
    history.load.mockResolvedValue([{ ...item, id: item.date + '|' + item.time }]);
    await component.refresh();
    expect(component.queue()).toHaveLength(0);
    component.ngOnDestroy();
    component = TestBed.runInInjectionContext(() => new CheckInRemindersComponent());
    component.ngOnInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(component.queue()).toHaveLength(0);
    history.load.mockResolvedValue([
      item,
      { ...item, time: '12:00', patientName: 'Otra paciente', appointmentId: 'new' },
    ]);
    await component.refresh();
    expect(component.queue()).toHaveLength(1);
    expect(component.queue()[0].patientName).toBe('Otra paciente');
  });
});
