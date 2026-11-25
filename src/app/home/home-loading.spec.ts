import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { HomeComponent } from './home.component';
import { OfficeSyncService } from '../auth/office-sync.service';
import { AuthService } from '../auth/auth.service';
import { BillingService } from '../planes/billing.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { PermissionService } from '../auth/permission.service';
function deferred() {
  let resolve!: () => void, reject!: (error: any) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup() {
  const offices = deferred(),
    patients = deferred(),
    appointments = deferred();
  let office: any = null;
  let patientRows: any[] = [],
    appointmentRows: any[] = [];
  const auth = {
    getSession: () => ({ email: 'owner' }),
    getSucursal: () => office,
    getCachedPatients: () => patientRows,
    getCachedAppointments: () => appointmentRows,
    hasCachedPatients: () => patientRows.length > 0,
    hasCachedAppointments: () => appointmentRows.length > 0,
    appointmentsUpdated$: new Subject(),
    patientsUpdated$: new Subject(),
    branchChanged$: new Subject(),
  };
  const sync = {
    ensureOfficeContext: vi.fn(() =>
      offices.promise.then(() => {
        office = { idConsultorio: 'office' };
      }),
    ),
    ensureResource: vi.fn((type: string) =>
      type === 'patients'
        ? patients.promise.then(() => {
            patientRows = [{ id: 'patient' }];
          })
        : appointments.promise.then(() => {
            appointmentRows = [{ date: '2030-01-01', time: '09:00', patientName: 'Ejemplo' }];
          }),
    ),
  };
  const tokens = { executeWithAuth: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: OfficeSyncService, useValue: sync },
      {
        provide: BillingService,
        useValue: {
          state: () => ({}),
          error: () => '',
          ensureFresh: vi.fn(async () => {}),
          allows: () => false,
        },
      },
      { provide: PermissionService, useValue: { can: () => true } },
      { provide: TokenInterceptorService, useValue: tokens },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { has: () => false } } } },
      { provide: Router, useValue: { navigate: vi.fn() } },
    ],
  });
  return {
    home: TestBed.runInInjectionContext(() => new HomeComponent()),
    offices,
    patients,
    appointments,
    sync,
    tokens,
  };
}
describe('Home progressive loading', () => {
  it('renders loading states immediately and reveals patients independently of appointments', async () => {
    const { home, offices, patients, appointments, sync } = setup();
    const loading = home.cargarDatosHome();
    expect(home.contextLoading()).toBe(true);
    expect(sync.ensureResource).not.toHaveBeenCalled();
    offices.resolve();
    await vi.waitFor(() => expect(sync.ensureResource).toHaveBeenCalledTimes(2));
    expect(home.contextLoading()).toBe(false);
    expect(home.patientsLoading()).toBe(true);
    expect(home.appointmentsLoading()).toBe(true);
    patients.resolve();
    await vi.waitFor(() => expect(home.patientsLoading()).toBe(false));
    expect(home.totalActivePatientsCount).toBe(1);
    expect(home.appointmentsLoading()).toBe(true);
    appointments.resolve();
    await loading;
    expect(home.appointmentsLoading()).toBe(false);
    expect(home.cachedAppointmentsSignal()).toHaveLength(1);
    expect(home.metricsLoading()).toBe(false);
  });
  it('ends loading with a retryable error when offices fail and never requests placeholder IDs', async () => {
    const { home, offices, sync, tokens } = setup();
    const loading = home.cargarDatosHome();
    offices.reject(new Error('offline'));
    await loading;
    expect(home.contextLoading()).toBe(false);
    expect(home.patientsLoading()).toBe(false);
    expect(home.appointmentsLoading()).toBe(false);
    expect(home.loadError()).toContain('consultorios');
    expect(sync.ensureResource).not.toHaveBeenCalled();
    expect(tokens.executeWithAuth).not.toHaveBeenCalled();
  });
});
