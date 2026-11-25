import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { AppointmentContextService } from '../appointments/appointment-context.service';
import { CurrentAppointmentComponent } from './current-appointment.component';
describe('Current appointment card', () => {
  let component: CurrentAppointmentComponent,
    auth: any,
    context: any,
    router: any,
    appointments: any[],
    changes: Subject<void>;
  const patient = {
    idPaciente: 'patient',
    expedienteId: 'internal-record',
    numeroDeExpediente: 'EXP-123456-2026-11-20-000',
    fichaDeIdentificacion: {
      nombreCompleto: 'Ana Pérez',
      telefono: '5555555555',
      correo: 'ana@example.test',
    },
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 13, 0));
    changes = new Subject<void>();
    appointments = [
      {
        date: '2026-11-20',
        time: '13:00',
        endTime: '14:00',
        status: 0,
        syncId: 'booking',
        patientName: 'Ana',
        reason: 'Revisión',
      },
    ];
    auth = {
      getCachedAppointments: () => appointments,
      getCachedPatients: () => [patient],
      getSucursal: () => ({ name: 'Centro' }),
      appointmentsUpdated$: changes,
      branchChanged$: new Subject<void>(),
      patientsUpdated$: new Subject<void>(),
    };
    context = {
      attend: vi.fn(),
      begin: vi.fn(),
      link: vi.fn(async (a: any, p: any) => {
        appointments = [
          {
            ...a,
            idPaciente: p.idPaciente,
            expedienteId: p.expedienteId,
            numeroDeExpediente: p.numeroDeExpediente,
          },
        ];
      }),
    };
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AppointmentContextService, useValue: context },
        { provide: PermissionService, useValue: { can: () => true } },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new CurrentAppointmentComponent());
    component.ngOnInit();
  });
  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });
  it('creates a record for an unlinked booking and attends after selecting a patient', async () => {
    expect(component.linked()).toBe(false);
    component.act();
    expect(router.navigate).toHaveBeenCalledWith(['/expediente/nuevo']);
    component.search();
    component.query = 'ana@example.test';
    expect(component.patients()).toHaveLength(1);
    await component.select(patient);
    expect(component.linked()).toBe(true);
    expect(component.searching()).toBe(false);
    component.act();
    expect(context.attend).toHaveBeenCalledWith(
      expect.objectContaining({ idPaciente: 'patient', expedienteId: 'internal-record' }),
    );
  });
  it('does not pretend the link succeeded when the service rejects it', async () => {
    context.link.mockRejectedValue(new Error('La cita cambió'));
    component.search();
    await component.select(patient);
    expect(component.error()).toBe('La cita cambió');
    expect(component.linked()).toBe(false);
    expect(component.searching()).toBe(true);
    expect(component.busy()).toBe(false);
  });
  it('can be dismissed and expires at the appointment end without an API poll', () => {
    component.dismiss();
    expect(component.appointment()).toBeNull();
    changes.next();
    expect(component.appointment()).toBeNull();
    auth.branchChanged$.next();
    expect(component.appointment()).not.toBeNull();
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(component.appointment()).toBeNull();
  });
});
