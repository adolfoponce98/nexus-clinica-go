import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PrescriptionWorkspaceComponent } from './prescription-workspace.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { API_URLS } from '../config/api-urls';
import { PRESCRIPTION_TEMPLATES, examplePrescription } from './prescription-templates';
function fixture() {
  const changed = new Subject<string>();
  let branch = 'a';
  const api = { branchId: () => branch, post: vi.fn() };
  const auth = {
    branchChanged$: changed.asObservable(),
    getSucursal: () => ({ idConsultorio: branch }),
    saveSucursal: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: ClinicApiService, useValue: api },
      { provide: AuthService, useValue: auth },
      { provide: PermissionService, useValue: { can: () => true } },
    ],
  });
  const component = TestBed.runInInjectionContext(() => new PrescriptionWorkspaceComponent());
  return { component, api, auth, changed, setBranch: (value: string) => (branch = value) };
}
const settings = (id = 'a', templateId = 'ocean') => ({
  office: { idConsultorio: id, name: 'Consultorio ' + id },
  doctor: { fullName: 'Médica real de prueba' },
  settings: { templateId, revision: 0 },
});
describe('Prescription template workspace', () => {
  it('offers ten distinct compositions and explicitly fictional prescription content', () => {
    expect(PRESCRIPTION_TEMPLATES.length).toBe(10);
    expect(new Set(PRESCRIPTION_TEMPLATES.map((t) => t.layout)).size).toBe(10);
    const sample = examplePrescription(
      { fullName: 'Médica real' },
      { name: 'Consultorio real' },
      'rose',
    );
    expect(sample.header.author.fullName).toBe('Médica real');
    expect(sample.example).toBe(true);
    expect(sample.medications[0].genericName).toContain('ejemplo');
  });
  it('saves the default only to the selected office with its current server revision', async () => {
    const { component: c, api, auth } = fixture();
    api.post
      .mockResolvedValueOnce(settings())
      .mockResolvedValueOnce({ settings: { templateId: 'rose', revision: 1 } });
    await c.load();
    c.select('rose');
    await c.setDefault();
    expect(api.post.mock.calls[1]).toEqual([
      API_URLS.SAVE_PRESCRIPTION_SETTINGS,
      { idConsultorio: 'a', templateId: 'rose', orientation: 'portrait', expectedRevision: 0 },
    ]);
    expect(auth.saveSucursal).toHaveBeenCalledWith({
      idConsultorio: 'a',
      prescriptionSettings: { templateId: 'rose', revision: 1 },
    });
  });
  it('ignores late responses from another office', async () => {
    const { component: c, api, setBranch } = fixture();
    let resolve!: (value: any) => void;
    api.post
      .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
      .mockResolvedValueOnce(settings('b', 'amber'));
    const first = c.load();
    setBranch('b');
    await c.load(true);
    resolve(settings('a', 'rose'));
    await first;
    expect(c.office().idConsultorio).toBe('b');
    expect(c.selected()).toBe('amber');
  });
  it('queries the encrypted QR through the same authenticated lookup tool', async () => {
    const { component: c, api } = fixture();
    api.post.mockResolvedValue({ prescription: { folio: 'RX-test' }, integrityHash: 'verified' });
    c.lookupFolio = 'CG-RX1:encrypted-test';
    await c.lookup();
    expect(api.post).toHaveBeenCalledWith(API_URLS.GET_ISSUED_PRESCRIPTION, {
      idConsultorio: 'a',
      qrData: 'CG-RX1:encrypted-test',
    });
    expect(c.mode()).toBe('issued');
  });
  it('loads and saves horizontal orientation separately from the template selection', async () => {
    const { component: c, api } = fixture();
    const initial = settings();
    initial.settings = { ...initial.settings, orientation: 'landscape' } as any;
    api.post
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        settings: { templateId: 'ocean', orientation: 'portrait', revision: 1 },
      });
    await c.load();
    expect(c.orientation()).toBe('landscape');
    expect(c.isDefault).toBe(true);
    expect(c.example.orientation).toBe('landscape');
    c.orientation.set('portrait');
    expect(c.isDefault).toBe(false);
    await c.setDefault();
    expect(api.post.mock.calls[1][1].orientation).toBe('portrait');
  });
});

describe('Personalized template gallery', () => {
  it('inserts the saved physical template first and preserves ten standard options', async () => {
    const { component: c, api } = fixture();
    const t = { id: 'physical-custom', design: { orientation: 'portrait', blocks: [] } };
    api.post.mockResolvedValue({ ...settings('a', 'physical-custom'), customTemplate: t });
    await c.load();
    expect(c.templates).toHaveLength(11);
    expect(c.templates[0].name).toBe('PLANTILLA FÍSICA PERSONALIZADA');
    expect(c.example.customTemplate).toEqual(t);
    expect(c.isDefault).toBe(true);
  });
});
