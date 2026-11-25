import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OfficeSyncService } from './office-sync.service';
import { AuthService } from './auth.service';
import { TokenInterceptorService } from './token-interceptor.service';
import { NotificationUiService } from './notification-ui.service';
import { browserDevice } from './browser-device';
import { API_URLS } from '../config/api-urls';
describe('Office push coordinator', () => {
  let sync: OfficeSyncService,
    auth: AuthService,
    ui: NotificationUiService,
    navigate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    navigate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: TokenInterceptorService, useValue: {} },
      ],
    });
    auth = TestBed.inject(AuthService);
    auth.saveSession({ email: 'doctor@example.test', sessionToken: 'access', sessionId: 'sid-a' });
    auth.saveSucursal({ idConsultorio: 'office-a' });
    sync = TestBed.inject(OfficeSyncService);
    ui = TestBed.inject(NotificationUiService);
  });
  afterEach(() => {
    sync.stop();
    ui.dismiss();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('deduplicates repeated push events and refreshes only their resource', async () => {
    const refresh = vi.spyOn(sync, 'refresh').mockResolvedValue();
    const event = {
      eventId: 'event-1',
      type: 'patients',
      idDoctor: 'doctor@example.test',
      idConsultorio: 'office-a',
    };
    sync.receive(event);
    sync.receive(event);
    expect(refresh).toHaveBeenCalledExactlyOnceWith('patients');
    expect(ui.activeNotification()).not.toBeNull();
  });
  it('does not query another owner or replace the selected-office cache for another office', () => {
    const refresh = vi.spyOn(sync, 'refresh').mockResolvedValue();
    sync.receive({ type: 'patients', idDoctor: 'other@example.test', idConsultorio: 'office-a' });
    sync.receive({ type: 'patients', idDoctor: 'doctor@example.test', idConsultorio: 'office-b' });
    expect(refresh).not.toHaveBeenCalled();
  });
  it('clears only the targeted device session and ignores a delayed logout for an older session', () => {
    const id = browserDevice().id;
    sync.receive({ type: 'session-revoked', deviceId: id, sessionId: 'old-sid' });
    expect(auth.isLoggedIn()).toBe(true);
    sync.receive({ type: 'session-revoked', deviceId: id, sessionId: 'sid-a' });
    expect(auth.getSession()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
  it('replaces appointment snapshots, including removal of every appointment', async () => {
    auth.saveCachedAppointments([{ syncId: 'old', date: '2026-11-18' }], true);
    const call = vi
      .spyOn(sync, 'call')
      .mockResolvedValue({ success: true, appointments: [], lastUpdated: '2026-11-18T12:00:00Z' });
    await sync.refresh('appointments');
    expect(call).toHaveBeenCalledWith(API_URLS.SYNCFOLLOWINGAPPOINTMENTS, {
      idConsultorio: 'office-a',
    });
    expect(auth.getCachedAppointments()).toEqual([]);
    expect(auth.getLastSyncDateAppointments()).toBe('2026-11-18T12:00:00Z');
  });
  it('keeps patient display caches isolated by account and office', () => {
    auth.saveCachedPatients([{ id: 'p1' }], '2026-11-18T12:00:00Z');
    auth.saveSucursal({ idConsultorio: 'office-b' });
    expect(auth.getCachedPatients()).toEqual([]);
    auth.saveSucursal({ idConsultorio: 'office-a' });
    expect(auth.getCachedPatients()).toEqual([{ id: 'p1' }]);
  });
  it('shows the local toast for ten seconds and a prior timer cannot dismiss a newer one', () => {
    vi.useFakeTimers();
    ui.show('One', 'Body');
    vi.advanceTimersByTime(9000);
    ui.show('Two', 'Body');
    vi.advanceTimersByTime(1000);
    expect(ui.activeNotification()?.title).toBe('Two');
    vi.advanceTimersByTime(9000);
    expect(ui.activeNotification()).toBeNull();
  });

  it('does not show or refresh an appointment push sent by the current device, but refreshes another device', () => {
    const refresh = vi.spyOn(sync, 'refresh').mockResolvedValue();
    sync.receive({
      eventId: 'own',
      type: 'appointments',
      originDeviceId: browserDevice().id,
      idDoctor: 'doctor@example.test',
      idConsultorio: 'office-a',
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(ui.activeNotification()).toBeNull();
    sync.receive({
      eventId: 'other',
      type: 'appointments',
      originDeviceId: 'another-device',
      idDoctor: 'doctor@example.test',
      idConsultorio: 'office-a',
    });
    expect(refresh).toHaveBeenCalledExactlyOnceWith('appointments');
  });

  it('does not poll every 45 seconds or refetch on repeated focus, but reconciles after 15 minutes', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const check = vi.spyOn(sync, 'check').mockResolvedValue(),
      refresh = vi.spyOn(sync, 'refresh').mockResolvedValue();
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(check).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(4);
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(14 * 60_000);
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(check).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(8);
  });
  it('does not publish a session revision when the server authorization has not changed', async () => {
    vi.spyOn(sync, 'call').mockResolvedValue({ authorization: { email: 'doctor@example.test' } });
    const save = vi.spyOn(auth, 'saveSession');
    await sync.check();
    expect(save).not.toHaveBeenCalled();
  });
});
