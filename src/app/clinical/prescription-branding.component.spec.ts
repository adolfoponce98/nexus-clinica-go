import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { PrescriptionBrandingComponent } from './prescription-branding.component';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { BillingService } from '../planes/billing.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
function setup() {
  const changed = new Subject<string>();
  let office = 'a';
  const api = {
      branchId: () => office,
      post: vi
        .fn()
        .mockResolvedValue({
          doctorLogoUrl: 'https://example.test/doctor.png',
          officeLogoUrl: 'https://example.test/office.png',
          officeName: 'Clínica',
          canEditOffice: true,
        }),
    },
    billing = {
      active: () => true,
      state: signal({ aiCredits: 0 }),
      error: signal(''),
      refresh: vi.fn().mockResolvedValue(undefined),
    };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { branchChanged$: changed } },
      { provide: PermissionService, useValue: { can: () => true } },
      { provide: ClinicApiService, useValue: api },
      { provide: BillingService, useValue: billing },
    ],
  });
  return {
    c: TestBed.runInInjectionContext(() => new PrescriptionBrandingComponent()),
    api,
    billing,
    changed,
    switchOffice: (v: string) => (office = v),
  };
}
describe('Prescription logo branding', () => {
  it('keeps separate doctor and office logos with a deliberate target selection', async () => {
    const { c } = setup();
    await c.load();
    expect(c.preview()).toContain('doctor.png');
    c.selectTarget('office');
    expect(c.preview()).toContain('office.png');
    expect(c.officeName).toBe('Clínica');
  });
  it('rejects non-image uploads without replacing the saved logo', async () => {
    const { c, api } = setup();
    await c.load();
    await c.upload({
      target: {
        files: [new File(['PDF'], 'file.pdf', { type: 'application/pdf' })],
        value: 'file',
      },
    } as any);
    expect(c.error()).toContain('imágenes');
    expect(c.preview()).toContain('doctor.png');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('shows AI progress and saves only the prepared asset after the user reviews it', async () => {
    const { c, api } = setup();
    await c.load();
    c.imageData = 'data:image/png;base64,SOURCE';
    c.ready.set(false);
    let finish!: (value: any) => void;
    api.post.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const pending = c.prepare();
    expect(c.preparing()).toBe(true);
    expect(c.disabled).toBe(true);
    finish({ assetId: 'asset', logoUrl: 'https://example.test/transparent.png' });
    await pending;
    expect(c.ready()).toBe(true);
    expect(c.preview()).toContain('transparent.png');
    api.post.mockResolvedValueOnce({ logoUrl: 'https://example.test/transparent.png' });
    await c.save();
    expect(api.post).toHaveBeenLastCalledWith(API_URLS.SAVE_PRESCRIPTION_BRANDING, {
      idConsultorio: 'a',
      target: 'doctor',
      assetId: 'asset',
    });
    expect(c.dirty).toBe(false);
  });
  it('does not save an opaque image until background preparation succeeds', async () => {
    const { c, api } = setup();
    await c.load();
    c.imageData = 'opaque';
    c.ready.set(false);
    await c.save();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('retains the source and request ID on AI failure and ignores results from another office', async () => {
    const { c, api, switchOffice } = setup();
    await c.load();
    c.imageData = 'source';
    api.post.mockRejectedValueOnce(new Error('offline'));
    await c.prepare();
    const first = (api.post.mock.calls[1] as any)[1].requestId;
    expect(c.imageData).toBe('source');
    let finish!: (value: any) => void;
    api.post.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const pending = c.prepare();
    expect((api.post.mock.calls[2] as any)[1].requestId).toBe(first);
    switchOffice('b');
    await c.load();
    finish({ assetId: 'old', logoUrl: 'https://example.test/old.png' });
    await pending;
    expect(c.assetId).toBe('');
    expect(c.preview()).not.toContain('old.png');
  });
});
