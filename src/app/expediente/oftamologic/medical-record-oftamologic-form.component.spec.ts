import { TestBed } from '@angular/core/testing';
import { OftalmologiaComponent } from './medical-record-oftamologic-form.component';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { AppointmentContextService } from '../../appointments/appointment-context.service';
import { AuthService } from '../../auth/auth.service';
import { PermissionService } from '../../auth/permission.service';
import { API_URLS } from '../../config/api-urls';
describe('Real ophthalmology patient registration', () => {
  it('persists the shared clinical core and ocular examination before announcing success', async () => {
    const api = {
        branchId: () => 'office',
        post: vi
          .fn()
          .mockResolvedValue({ success: true, numeroDeExpediente: 'EXP-123456-2026-11-20-000' }),
      },
      context = { recordCreated: vi.fn().mockResolvedValue('') };
    TestBed.configureTestingModule({
      providers: [
        { provide: ClinicApiService, useValue: api },
        { provide: AppointmentContextService, useValue: context },
        {
          provide: AuthService,
          useValue: { getSession: () => ({ email: 'doctor@example.test' }) },
        },
        { provide: PermissionService, useValue: { can: () => true } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new OftalmologiaComponent());
    component.recordForm.patchValue({
      nombreCompleto: 'Paciente',
      motivoConsulta: 'Revisión de visión',
      est_retina: 'ojo_seco',
    });
    await component.saveRecord();
    expect(api.post.mock.calls[0][0]).toBe(API_URLS.REGISTERNEWPATIENT);
    expect(
      api.post.mock.calls[0][1].clinicalCore.specialtyAdditional.ophthalmology.est_retina,
    ).toBe('ojo_seco');
    expect(api.post.mock.calls[0][1].especialidad).toBe('oftalmologia');
    expect(component.savedRecord()).toBe('EXP-123456-2026-11-20-000');
    await component.saveRecord();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
