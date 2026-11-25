import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { EmployeesComponent } from './employees-tab.component';
import { AuthService } from '../auth/auth.service';
import { OfficeSyncService } from '../auth/office-sync.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { BillingService } from '../planes/billing.service';
function setup() {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthService,
        useValue: {
          sessionRevision: () => 0,
          getSucursal: () => ({ idConsultorio: 'office-a' }),
          getSession: () => ({ email: 'owner', typeUser: 1 }),
        },
      },
      { provide: OfficeSyncService, useValue: { updates: new Subject() } },
      { provide: TokenInterceptorService, useValue: {} },
      { provide: BillingService, useValue: { canCreate: () => true } },
    ],
  });
  return TestBed.runInInjectionContext(() => new EmployeesComponent());
}
describe('Employee permission editor', () => {
  it('loads defaults on profile change without erasing employee data or assigned offices', () => {
    const c = setup();
    c.addEmpleado();
    c.selectedEmpleado()!.name = 'Ana';
    c.applyRolePreset('AYUDANTE');
    expect(c.selectedEmpleado()!.name).toBe('Ana');
    expect(c.selectedEmpleado()!.consultoriosIds).toEqual(['office-a']);
    expect(c.getPermission('nexusI').read).toBe(true);
    expect(c.activePermissionsCount).toBe(5);
  });
  it('supports customization and keeps reading consistent with write and delete', () => {
    const c = setup();
    c.addEmpleado();
    c.setPermission('services', 'write', true);
    expect(c.getPermission('services')).toEqual({ read: true, write: true, delete: false });
    c.setPermission('services', 'delete', true);
    c.setPermission('services', 'read', false);
    expect(c.getPermission('services')).toEqual({ read: false, write: false, delete: false });
  });
  it('preserves existing custom access until the doctor explicitly restores a profile', () => {
    const c = setup();
    c.addEmpleado();
    c.setPermission('reports', 'read', true);
    const existing = structuredClone(c.selectedEmpleado()!);
    c.editarEmpleado(existing, 0);
    expect(c.getPermission('reports').read).toBe(true);
    c.applyRolePreset('RECEPCIONISTA');
    expect(c.getPermission('reports').read).toBe(false);
  });
});
