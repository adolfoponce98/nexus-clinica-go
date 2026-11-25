import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { EmployeesComponent } from '../employes/employees-tab.component';
import { ServiciosConsultorioComponent } from '../services/doctor_services.component';
import { CreationAccessService } from '../planes/creation-access.service';
import { BillingService } from '../planes/billing.service';
import { PermissionService } from '../auth/permission.service';
import { AuthService } from '../auth/auth.service';
import { OfficeSyncService } from '../auth/office-sync.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
function setup() {
  const office = {
      idConsultorio: 'office',
      name: 'Prueba',
      services: [
        { id: 's1', nombre: 'Servicio', precioBase: 100, precioFinal: 100, sucursales: ['office'] },
      ],
    },
    access = { allow: vi.fn(() => false) },
    permissions = { can: vi.fn(() => true) },
    sync = {
      updates: new Subject(),
      ensureOfficeContext: vi.fn(async () => {}),
      call: vi.fn(async () => ({ consultorios: [office] })),
    };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CreationAccessService, useValue: access },
      { provide: PermissionService, useValue: permissions },
      {
        provide: AuthService,
        useValue: {
          getSession: () => ({ email: 'owner', typeUser: 1, sessionToken: 'test' }),
          getSucursal: () => office,
          getAllBranches: () => [office],
          branchChanged$: new Subject(),
        },
      },
      { provide: OfficeSyncService, useValue: sync },
      {
        provide: TokenInterceptorService,
        useValue: { authenticatedFetch: () => new Promise(() => {}) },
      },
      { provide: ClinicApiService, useValue: {} },
      {
        provide: BillingService,
        useValue: {
          canCreate: () => false,
          active: () => false,
          error: () => '',
          state: () => ({
            usage: { employees: 1, services: 3 },
            limits: { employees: 1, services: 3 },
          }),
        },
      },
    ],
  });
  return { access, permissions, sync };
}
describe('Employee and service creation limits and loading', () => {
  it('blocks new forms at the plan cap and preserves ordinary creation below the cap', () => {
    const { access } = setup();
    const employee = TestBed.runInInjectionContext(() => new EmployeesComponent()),
      service = TestBed.runInInjectionContext(() => new ServiciosConsultorioComponent());
    employee.addEmpleado();
    service.abrirModalNuevo();
    expect(access.allow).toHaveBeenCalledWith('employees');
    expect(access.allow).toHaveBeenCalledWith('services');
    expect(employee.selectedEmpleado()).toBeNull();
    expect(service.showModal()).toBe(false);
    access.allow.mockReturnValue(true);
    employee.addEmpleado();
    service.abrirModalNuevo();
    expect(employee.selectedEmpleado()?.role).toBe('RECEPCIONISTA');
    expect(service.showModal()).toBe(true);
  });
  it('keeps write-denied users from reaching the creation actions', () => {
    const { permissions, access } = setup();
    permissions.can.mockReturnValue(false);
    const employee = TestBed.runInInjectionContext(() => new EmployeesComponent()),
      service = TestBed.runInInjectionContext(() => new ServiciosConsultorioComponent());
    employee.addEmpleado();
    service.abrirModalNuevo();
    expect(access.allow).not.toHaveBeenCalled();
  });
  it('shows the compact employee quota inside the title header and a skeleton during the request', () => {
    setup();
    const fixture = TestBed.createComponent(EmployeesComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.employees-header .compact-usage')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.usage')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('app-directory-skeleton [aria-busy=true]'),
    ).toBeTruthy();
    expect(fixture.componentInstance.isLoading()).toBe(true);
  });
  it('shows a skeleton while office context is pending and replaces it with the cached services', async () => {
    const { sync } = setup();
    let finish!: () => void;
    sync.ensureOfficeContext.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const fixture = TestBed.createComponent(ServiciosConsultorioComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('header .compact-usage')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-directory-skeleton')).toBeTruthy();
    finish();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.servicios()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('app-directory-skeleton')).toBeNull();
  });
});
