import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RegistrationLinkComponent } from './registration-link.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { API_URLS } from '../config/api-urls';
vi.mock('qrcode', () => {
  const toDataURL = vi.fn().mockResolvedValue('data:image/png;base64,QR_TEST');
  return { default: { toDataURL }, toDataURL };
});
function setup() {
  const changed = new Subject<string>();
  let office = 'office-a';
  const api = { branchId: () => office, post: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: ClinicApiService, useValue: api },
      {
        provide: AuthService,
        useValue: {
          branchChanged$: changed.asObservable(),
          getSucursal: () => ({ idConsultorio: office, name: 'Consultorio de prueba' }),
        },
      },
      { provide: PermissionService, useValue: { can: () => true } },
    ],
  });
  const c = TestBed.runInInjectionContext(() => new RegistrationLinkComponent());
  return { c, api, changed, setOffice: (v: string) => (office = v) };
}
describe('Patient registration invitation confirmation', () => {
  it('opens an explanation without creating any link or consuming an hour of validity', () => {
    const { c, api } = setup();
    c.open();
    expect(c.opened()).toBe(true);
    expect(c.confirming()).toBe(true);
    expect(c.link()).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
    c.close();
    expect(api.post).not.toHaveBeenCalled();
  });
  it('generates only after confirmation and asks again before generating for another patient', async () => {
    const { c, api } = setup(),
      now = Date.now();
    api.post.mockResolvedValue({
      url: 'https://clinica-go.com/autogestion/test',
      serverNow: new Date(now).toISOString(),
      expiresAt: new Date(now + 3600000).toISOString(),
    });
    c.open();
    await c.generate();
    expect(api.post).toHaveBeenCalledWith(
      API_URLS.CREATE_PATIENT_REGISTRATION_LINK,
      expect.objectContaining({ idConsultorio: 'office-a' }),
    );
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(c.confirming()).toBe(false);
    expect(c.qr()).toContain('data:image/png');
    c.prepareAnother();
    expect(c.confirming()).toBe(true);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('does not display an in-flight invitation after the doctor changes offices', async () => {
    const { c, api, changed, setOffice } = setup();
    let resolve!: (value: any) => void;
    api.post.mockImplementation(() => new Promise((r) => (resolve = r)));
    c.open();
    const pending = c.generate();
    setOffice('office-b');
    changed.next('office-b');
    resolve({
      url: 'old-office-link',
      serverNow: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    await pending;
    expect(c.link()).toBeNull();
    expect(c.opened()).toBe(false);
    expect(c.loading()).toBe(false);
  });
});
