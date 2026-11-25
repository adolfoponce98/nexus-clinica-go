import { SyncGatewayService } from '../auth/sync-gateway.service';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { GoogleCalendarConnectionComponent } from './google-calendar-connection.component';
function setup(employee = false, appearance: 'button' | 'card' = 'button') {
  const branch = new Subject<void>();
  const api = {
    branchId: () => 'office',
    post: vi.fn().mockResolvedValue({ connected: false, timeZone: 'America/Mexico_City' }),
  };
  TestBed.configureTestingModule({
    imports: [GoogleCalendarConnectionComponent],
    providers: [
      {
        provide: AuthService,
        useValue: {
          getSession: () =>
            employee
              ? { email: 'employee', idDoctor: 'doctor', typeUser: 2 }
              : { email: 'doctor', typeUser: 1 },
          getSucursal: () => ({ name: 'Clínica de prueba' }),
          branchChanged$: branch,
        },
      },
      { provide: ClinicApiService, useValue: api },
      {
        provide: SyncGatewayService,
        useValue: {
          updates: new Subject(),
          peek: () => null,
          invalidate: () => {},
          accept: () => {},
          load: () =>
            api
              .post(API_URLS.GET_GOOGLE_CALENDAR_CONNECTION, { idConsultorio: api.branchId() })
              .then((data: any) => ({ resources: { calendar: data } })),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(GoogleCalendarConnectionComponent);
  fixture.componentRef.setInput('appearance', appearance);
  fixture.detectChanges();
  const c = fixture.componentInstance;
  c.dialog.nativeElement.showModal = vi.fn();
  c.dialog.nativeElement.close = vi.fn();
  return { fixture, c, api, branch };
}
describe('Google Calendar connection', () => {
  it('does not poll or load status until the owner opens the connection dialog', async () => {
    const { c, api } = setup();
    expect(api.post).not.toHaveBeenCalled();
    await c.open();
    expect(api.post).toHaveBeenCalledWith(API_URLS.GET_GOOGLE_CALENDAR_CONNECTION, {
      idConsultorio: 'office',
    });
    expect(c.state().connected).toBe(false);
    expect(c.busy()).toBe(false);
  });
  it('does not expose Google account management to employees', async () => {
    const { c, fixture, api } = setup(true);
    expect(fixture.nativeElement.querySelector('.calendar-connect')).toBeNull();
    await c.open();
    await c.connect();
    expect(api.post).not.toHaveBeenCalled();
  });
  it('requires explicit consent and rejects unexpected authorization URLs', async () => {
    const { c, api } = setup();
    await c.connect();
    expect(api.post).not.toHaveBeenCalled();
    c.consent = true;
    api.post.mockResolvedValue({ authorizationUrl: 'https://attacker.test/oauth' } as any);
    await c.connect();
    expect(c.error()).toBe('Enlace de autorización inválido.');
    expect(c.busy()).toBe(false);
  });
  it('disconnects only after confirmation and invalidates a dialog when the active office changes', async () => {
    const { c, api, branch } = setup();
    await c.disconnect();
    expect(api.post).not.toHaveBeenCalled();
    c.confirmDisconnect = true;
    await c.disconnect();
    expect(api.post).toHaveBeenCalledWith(API_URLS.DISCONNECT_GOOGLE_CALENDAR, {
      idConsultorio: 'office',
    });
    expect(c.state().connected).toBe(false);
    branch.next();
    expect(c.state()).toBeNull();
    expect(c.dialog.nativeElement.close).toHaveBeenCalled();
  });
  it('shows the integration card and reuses the same office connection dialog', async () => {
    const { c, fixture, api } = setup(false, 'card');
    await fixture.whenStable();
    await vi.waitFor(() => expect(c.busy()).toBe(false));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.integration-card h3').textContent).toContain(
      'Conexión Google Calendar',
    );
    expect(fixture.nativeElement.querySelector('.integration-office').textContent).toContain(
      'Clínica de prueba',
    );
    expect(fixture.nativeElement.querySelector('.google-logo-tile img').getAttribute('src')).toBe(
      'assets/integrations/google-calendar.svg',
    );
    expect(api.post).toHaveBeenCalledTimes(1);
    api.post.mockResolvedValue({
      connected: true,
      timeZone: 'America/Mexico_City',
      calendarName: 'Clínica Go',
    } as any);
    await c.open();
    fixture.detectChanges();
    expect(c.dialog.nativeElement.showModal).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.integration-status').textContent).toContain(
      'Conectado',
    );
    expect(fixture.nativeElement.querySelector('.integration-manage').textContent).toContain(
      'Administrar conexión',
    );
  });
  it('styles the successful connection notice with the Calendar logo and clears it on office change', () => {
    const { c, fixture, branch } = setup();
    c.notice.set('Google Calendar se conectó correctamente.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.calendar-notice .notice-logo img')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.calendar-notice strong').textContent).toContain(
      'Google Calendar conectado',
    );
    branch.next();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.calendar-notice')).toBeNull();
  });
});
