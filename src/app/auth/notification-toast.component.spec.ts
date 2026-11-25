import { TestBed } from '@angular/core/testing';
import { NotificationToastComponent } from './notification-toast.component';
import { NotificationUiService } from './notification-ui.service';
describe('Branded in-app push notice', () => {
  afterEach(() => TestBed.inject(NotificationUiService).dismiss());
  it('shows the resource, title, message and close action without exposing appointment IDs', () => {
    TestBed.configureTestingModule({ imports: [NotificationToastComponent] });
    const fixture = TestBed.createComponent(NotificationToastComponent);
    const ui = TestBed.inject(NotificationUiService);
    ui.show('Cita confirmada', 'Ana confirmó su asistencia.', {
      type: 'appointments',
      idAppointment: 'private-internal-id',
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Agenda');
    expect(el.textContent).toContain('Cita confirmada');
    expect(el.textContent).toContain('Ana confirmó');
    expect(el.textContent).not.toContain('private-internal-id');
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    (el.querySelector('[aria-label="Cerrar notificación"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.notification-toast')).toBeNull();
  });
  it('restarts the lifetime bar for each new notification and retains the ten-second duration', () => {
    TestBed.configureTestingModule({ imports: [NotificationToastComponent] });
    const fixture = TestBed.createComponent(NotificationToastComponent);
    const ui = TestBed.inject(NotificationUiService);
    ui.show('Primera', 'Paciente agregado', { type: 'patients' });
    fixture.detectChanges();
    const first = fixture.nativeElement.querySelector('.notification-toast') as HTMLElement;
    expect(first.style.getPropertyValue('--toast-lifetime')).toBe('10000ms');
    ui.show('Segunda', 'Consultorio actualizado', { type: 'offices' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-toast')).not.toBe(first);
    expect(fixture.nativeElement.textContent).toContain('Consultorios');
  });
});
