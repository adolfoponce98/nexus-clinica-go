import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ListaPacientesComponent } from './lista-pacientes.component';
import { ClinicsComponent } from '../../consultorios/clinics-tab.component';
import { CreationAccessService } from '../../planes/creation-access.service';
import { BillingService } from '../../planes/billing.service';
import { PermissionService } from '../../auth/permission.service';
import { AuthService } from '../../auth/auth.service';
import { TokenInterceptorService } from '../../auth/token-interceptor.service';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { OfficeSyncService } from '../../auth/office-sync.service';
describe('New patient and office creation entry points', () => {
  function setup() {
    const access = { allow: vi.fn(() => false) },
      permissions = { can: vi.fn(() => true) },
      router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: CreationAccessService, useValue: access },
        { provide: BillingService, useValue: {} },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: permissions },
        { provide: AuthService, useValue: {} },
        { provide: TokenInterceptorService, useValue: {} },
        { provide: ClinicApiService, useValue: {} },
        { provide: OfficeSyncService, useValue: { updates: new Subject() } },
      ],
    });
    return {
      access,
      permissions,
      router,
      patient: TestBed.runInInjectionContext(() => new ListaPacientesComponent()),
      offices: TestBed.runInInjectionContext(() => new ClinicsComponent()),
    };
  }
  it('shows the limit action rather than navigating or opening a creation form', () => {
    const { access, router, patient, offices } = setup();
    patient.nuevoExpediente();
    offices.addConsultorio();
    expect(access.allow).toHaveBeenCalledWith('patients');
    expect(access.allow).toHaveBeenCalledWith('offices');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(offices.selectedConsultorio()).toBeNull();
  });
  it('keeps authorized creation working below the limit and preserves write permissions', () => {
    const { access, permissions, router, patient, offices } = setup();
    access.allow.mockReturnValue(true);
    patient.idConsultorio.set('office');
    patient.nuevoExpediente();
    offices.addConsultorio();
    expect(router.navigate).toHaveBeenCalledWith(['/expediente/nuevo'], {
      queryParams: { idConsultorio: 'office' },
    });
    expect(offices.selectedConsultorio()?.id).toBe('');
    access.allow.mockClear();
    permissions.can.mockReturnValue(false);
    patient.nuevoExpediente();
    offices.addConsultorio();
    expect(access.allow).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });
});
