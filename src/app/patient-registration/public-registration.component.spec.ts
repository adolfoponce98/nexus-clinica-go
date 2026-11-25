import { PRIVACY_NOTICE_VERSION } from '../privacy-notice/privacy-notice.content';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PublicRegistrationComponent } from './public-registration.component';
import {
  PublicRegistrationApiService,
  PublicRegistrationError,
} from './public-registration-api.service';
import { API_URLS } from '../config/api-urls';
function setup() {
  const api = {
    post: vi.fn().mockResolvedValue({
      doctorName: 'Doctora de prueba',
      officeName: 'Consultorio',
      privacyNoticeUrl: 'https://example.test/privacy',
      serverNow: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: PublicRegistrationApiService, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ token: 'signed-test-token' }) } },
      },
    ],
  });
  const c = TestBed.runInInjectionContext(() => new PublicRegistrationComponent());
  return { c, api };
}
function fill(c: PublicRegistrationComponent) {
  c.form.patchValue({
    firstName: 'Paciente',
    paternalSurname: 'Prueba',
    birthDate: '1990-01-01',
    gender: 'Femenino',
    streetAndNumber: 'Domicilio',
    privacyAccepted: true,
  });
}
describe('Public self-registration without login', () => {
  afterEach(() => vi.useRealTimers());
  it('requires personal data, privacy acceptance and signature before sending', async () => {
    const { c } = setup();
    await c.ngOnInit();
    expect(c.canSubmit).toBe(false);
    fill(c);
    expect(c.canSubmit).toBe(false);
    c.signature.set('data:image/png;base64,signature');
    expect(c.canSubmit).toBe(true);
    c.form.patchValue({ privacyAccepted: false });
    expect(c.canSubmit).toBe(false);
    c.ngOnDestroy();
  });
  it('sends consent and history once and clears personal information after success', async () => {
    const { c, api } = setup();
    await c.ngOnInit();
    fill(c);
    c.form.get('familyBackground.diabetes')?.setValue(true);
    c.signature.set('data:image/png;base64,signature');
    api.post.mockResolvedValueOnce({ registered: true });
    await c.submit();
    expect(api.post.mock.calls[1][0]).toBe(API_URLS.SUBMIT_PATIENT_REGISTRATION);
    expect(api.post.mock.calls[1][1]).toMatchObject({
      token: 'signed-test-token',
      privacyAccepted: true,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      secondaryPurposesDeclined: false,
      form: { familyBackground: { diabetes: true } },
    });
    expect(api.post.mock.calls[1][1].form.privacyAccepted).toBeUndefined();
    expect(c.state()).toBe('success');
    expect(c.signature()).toBe('');
    expect(c.form.get('firstName')?.value).toBeNull();
    c.ngOnDestroy();
  });
  it('shows used and expired states without redirecting to an authenticated page', async () => {
    const { c, api } = setup();
    api.post.mockRejectedValueOnce(new PublicRegistrationError('Usado', 'LINK_USED'));
    await c.ngOnInit();
    expect(c.state()).toBe('used');
    c.ngOnDestroy();
  });
  it('expires the displayed form using the server deadline', async () => {
    vi.useFakeTimers();
    const { c } = setup();
    await c.ngOnInit();
    vi.advanceTimersByTime(3600000);
    expect(c.state()).toBe('expired');
    expect(c.canSubmit).toBe(false);
    c.ngOnDestroy();
  });
});
