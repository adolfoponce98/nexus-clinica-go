import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { PhysicalTemplateDialogComponent } from './physical-template-dialog.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { PermissionService } from '../auth/permission.service';
import { BillingService } from '../planes/billing.service';
import { AuthService } from '../auth/auth.service';
import { API_URLS } from '../config/api-urls';
function setup() {
  let branch = 'a';
  const api = {
      branchId: () => branch,
      post: vi
        .fn()
        .mockResolvedValue({
          doctor: { fullName: 'Doctor' },
          office: { name: 'Consultorio' },
          settings: { revision: 2 },
          customTemplate: null,
        }),
    },
    ref = { close: vi.fn() },
    auth = { getSucursal: () => ({ idConsultorio: 'a' }), saveSucursal: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: ClinicApiService, useValue: api },
      { provide: MatDialogRef, useValue: ref },
      { provide: AuthService, useValue: auth },
      { provide: PermissionService, useValue: { can: () => true } },
      { provide: BillingService, useValue: { active: () => true, refresh: vi.fn() } },
    ],
  });
  return {
    c: TestBed.runInInjectionContext(() => new PhysicalTemplateDialogComponent()),
    api,
    auth,
    ref,
    switchOffice: (value: string) => (branch = value),
  };
}
const proposal = {
  draftId: 'draft',
  customTemplate: {
    id: 'physical-custom',
    design: { orientation: 'portrait', blocks: [] },
    html: 'safe-layout',
  },
};
describe('Physical prescription digitizer', () => {
  it('shows initial loading and rejects unsupported files without sending them', async () => {
    const { c, api } = setup();
    expect(c.loading()).toBe(true);
    await c.load();
    await c.upload({
      target: {
        files: [new File(['bad'], 'test.exe', { type: 'application/octet-stream' })],
        value: '',
      },
    } as any);
    expect(c.error()).toContain('fotografía');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('separates generation from explicit acceptance and shows progress', async () => {
    const { c, api, auth } = setup();
    await c.load();
    c.source = 'image-source';
    let finish!: (v: any) => void;
    api.post.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const pending = c.generate();
    expect(c.generating()).toBe(true);
    expect(c.busy).toBe(true);
    expect(auth.saveSucursal).not.toHaveBeenCalled();
    finish(proposal);
    await pending;
    expect(c.proposal()).toBe(proposal);
    expect(c.preview?.example).toBe(true);
    expect(c.generating()).toBe(false);
    api.post.mockResolvedValueOnce({
      customTemplate: proposal.customTemplate,
      settings: { templateId: 'physical-custom', revision: 3 },
    });
    await c.accept();
    expect(api.post).toHaveBeenLastCalledWith(API_URLS.ACCEPT_PHYSICAL_PRESCRIPTION_TEMPLATE, {
      idConsultorio: 'a',
      draftId: 'draft',
      expectedRevision: 2,
      expectedTemplateRevision: 0,
    });
    expect(auth.saveSucursal).toHaveBeenCalled();
    expect(c.proposal()).toBeNull();
    expect(c.notice()).toContain('predeterminada');
  });
  it('preserves proposal on save failure and blocks writes after switching office', async () => {
    const { c, api, switchOffice } = setup();
    await c.load();
    c.proposal.set(proposal);
    api.post.mockRejectedValueOnce(new Error('Sin conexión'));
    await c.accept();
    expect(c.proposal()).toBe(proposal);
    expect(c.error()).toBe('Sin conexión');
    const count = api.post.mock.calls.length;
    switchOffice('b');
    await c.accept();
    expect(api.post).toHaveBeenCalledTimes(count);
    expect(c.error()).toContain('Cambió el consultorio');
  });
  it('does not save automatically, close while pending or apply responses after destruction', async () => {
    const { c, api, ref } = setup();
    await c.load();
    c.source = 'image';
    let finish!: (v: any) => void;
    api.post.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const pending = c.generate();
    c.close();
    expect(ref.close).not.toHaveBeenCalled();
    c.ngOnDestroy();
    finish(proposal);
    await pending;
    expect(c.proposal()).toBeNull();
    expect(
      api.post.mock.calls.some(([url]) => url === API_URLS.ACCEPT_PHYSICAL_PRESCRIPTION_TEMPLATE),
    ).toBe(false);
  });
});
