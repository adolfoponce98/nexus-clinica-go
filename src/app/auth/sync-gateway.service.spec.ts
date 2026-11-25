import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { SyncGatewayService, mergeResource } from './sync-gateway.service';
import { browserDevice } from './browser-device';
import { OfficeSyncService } from './office-sync.service';
import { Router } from '@angular/router';
import { TokenInterceptorService } from './token-interceptor.service';
const at = (v: number) => new Date(v).toISOString();
describe('Grouped cache synchronization', () => {
  let auth: AuthService, gateway: SyncGatewayService, post: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    post = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ClinicApiService, useValue: { post } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: TokenInterceptorService, useValue: {} },
      ],
    });
    auth = TestBed.inject(AuthService);
    auth.saveSession({ email: 'doctor', typeUser: 1, sessionId: 'sid', sessionToken: 'token' });
    auth.saveSucursal({ idConsultorio: 'a' });
    gateway = TestBed.inject(SyncGatewayService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  it('shares concurrent billing and office resources in one authenticated request', async () => {
    post.mockResolvedValue({
      idConsultorio: 'a',
      authorizationVersion: 'v1',
      resources: {
        offices: { consultorios: [], version: 100, lastUpdated: at(100) },
        billing: { version: 'hash', entitlements: { aiCredits: 10 } },
      },
    });
    await Promise.all([gateway.load(['offices']), gateway.load(['billing'])]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1].resources).toEqual(['offices', 'billing']);
  });
  it('sends stored versions and reconstructs notModified from local data', async () => {
    post
      .mockResolvedValueOnce({
        idConsultorio: 'a',
        authorizationVersion: 'v1',
        resources: {
          patients: { patients: [{ idPaciente: 'p1' }], version: 100, lastUpdated: at(100) },
        },
      })
      .mockResolvedValueOnce({
        idConsultorio: 'a',
        authorizationVersion: 'v1',
        resources: { patients: { notModified: true, version: 100 } },
      });
    await gateway.load(['patients']);
    const changed = vi.fn();
    auth.patientsUpdated$.subscribe(changed);
    const second = await gateway.load(['patients']);
    expect(post.mock.calls[1][1].versions.patients).toBe(at(100));
    expect(second.resources.patients.patients).toMatchObject([{ idPaciente: 'p1' }]);
    expect(changed).not.toHaveBeenCalled();
  });
  it('merges changes and removals without duplicates', () => {
    expect(
      mergeResource(
        'patients',
        { patients: [{ idPaciente: 'p1' }, { idPaciente: 'p2' }] },
        {
          delta: true,
          removedIds: ['p1'],
          patients: [{ idPaciente: 'p2', nombre: 'Updated' }, { idPaciente: 'p3' }],
        },
      ).patients,
    ).toEqual([{ idPaciente: 'p2', nombre: 'Updated' }, { idPaciente: 'p3' }]);
  });
  it('does not advance over concurrent unseen changes when applying a local mutation', async () => {
    post.mockResolvedValue({
      idConsultorio: 'a',
      authorizationVersion: 'v1',
      resources: { appointments: { appointments: [], version: 100, lastUpdated: at(100) } },
    });
    await gateway.load(['appointments']);
    window.dispatchEvent(
      new CustomEvent('clinic-local-mutation', {
        detail: {
          type: 'appointments',
          office: 'a',
          data: { appointment: { syncId: 'new', _syncVersion: 300, _syncPreviousVersion: 200 } },
        },
      }),
    );
    expect(gateway.version('appointments')).toBe(at(100));
    expect(gateway.peek('appointments').appointments).toHaveLength(1);
    window.dispatchEvent(
      new CustomEvent('clinic-local-mutation', {
        detail: {
          type: 'appointments',
          office: 'a',
          data: { appointment: { syncId: 'new', _syncVersion: 400, _syncPreviousVersion: 100 } },
        },
      }),
    );
    expect(gateway.version('appointments')).toBe(at(400));
    expect(gateway.peek('appointments').appointments).toHaveLength(1);
  });
  it('ignores an already-applied push but still refreshes an unseen version from the same device', async () => {
    post.mockResolvedValue({
      idConsultorio: 'a',
      authorizationVersion: 'v1',
      resources: { appointments: { appointments: [], version: 100, lastUpdated: at(100) } },
    });
    await gateway.load(['appointments']);
    const sync = TestBed.inject(OfficeSyncService),
      refresh = vi.spyOn(sync, 'refresh').mockResolvedValue();
    sync.receive({
      type: 'appointments',
      idDoctor: 'doctor',
      idConsultorio: 'a',
      version: '100',
      originDeviceId: browserDevice().id,
    });
    expect(refresh).not.toHaveBeenCalled();
    sync.receive({
      type: 'appointments',
      idDoctor: 'doctor',
      idConsultorio: 'a',
      version: '101',
      originDeviceId: browserDevice().id,
    });
    expect(refresh).toHaveBeenCalledOnce();
    sync.stop();
  });
  it('retains a newer local mutation when an older full snapshot arrives', () => {
    const current = { appointments: [{ syncId: 'a', _syncVersion: 300 }] };
    expect(
      mergeResource('appointments', current, { version: 200, appointments: [] }).appointments,
    ).toEqual(current.appointments);
  });
  it('keeps snapshots isolated between offices and rejects late replies after logout', async () => {
    let finish!: (value: any) => void;
    post.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const request = gateway.load(['patients']);
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    auth.clearSession();
    finish({ resources: { patients: { patients: [{ idPaciente: 'old' }] } } });
    await expect(request).rejects.toThrow('sesión');
    expect(gateway.peek('patients')).toBeNull();
  });
  it('does not let an earlier request overwrite a newer manually accepted billing snapshot', async () => {
    let finish!: (value: any) => void;
    post.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const request = gateway.load(['billing']);
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    gateway.accept('billing', { version: '', entitlements: { aiCredits: 200 } });
    finish({
      idConsultorio: 'a',
      resources: { billing: { version: 'old', entitlements: { aiCredits: 1 } } },
    });
    const result = await request;
    expect(result.resources.billing.entitlements.aiCredits).toBe(200);
    expect(gateway.peek('billing').entitlements.aiCredits).toBe(200);
  });
  it('does not overwrite or remove a pending local row with an older delta', () => {
    const current = { appointments: [{ syncId: 'a', _syncVersion: 300, patientName: 'Latest' }] };
    expect(
      mergeResource('appointments', current, {
        delta: true,
        version: 200,
        removedIds: ['a'],
        appointments: [],
      }).appointments,
    ).toEqual(current.appointments);
    expect(
      mergeResource('appointments', current, {
        delta: true,
        version: 200,
        appointments: [{ syncId: 'a', patientName: 'Old' }],
      }).appointments,
    ).toEqual(current.appointments);
  });
  it('repaints another tab from local storage without calling a service', () => {
    const updated = vi.fn();
    auth.patientsUpdated$.subscribe(updated);
    auth.saveCachedPatients([{ id: 'p1' }]);
    updated.mockClear();
    const key = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).find(
      (key) =>
        key?.startsWith('cliniq-go-patients_cache:') ||
        key?.startsWith('cliniq-go-patients_cache:v2:'),
    )!;
    window.dispatchEvent(new StorageEvent('storage', { key }));
    expect(updated).toHaveBeenCalledOnce();
    expect(post).not.toHaveBeenCalled();
  });
});
