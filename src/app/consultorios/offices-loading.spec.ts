import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ClinicsComponent } from './clinics-tab.component';
import { ClinicsTabComponent } from '../profile/tabs/clinics-tab.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { AuthService } from '../auth/auth.service';
import { OfficeSyncService } from '../auth/office-sync.service';
import { BillingService } from '../planes/billing.service';
import { API_URLS } from '../config/api-urls';
function setup(type: typeof ClinicsComponent, post: any) {
  TestBed.configureTestingModule({
    providers: [
      { provide: ClinicApiService, useValue: { post } },
      {
        provide: BillingService,
        useValue: { refresh: vi.fn(async () => {}), canCreate: () => true },
      },
      {
        provide: OfficeSyncService,
        useValue: {
          updates: new Subject<string>(),
          ensureOfficeContext: async () => {
            if (!TestBed.inject(AuthService).getAllBranches().length) {
              const data = await post(API_URLS.GETDOCTORSOFFICE, {});
              TestBed.inject(AuthService).saveAllBranches(data.consultorios);
            }
          },
          refresh: async () => {
            const data = await post(API_URLS.GETDOCTORSOFFICE, {});
            TestBed.inject(AuthService).saveAllBranches(data.consultorios);
          },
        },
      },
    ],
  });
  const auth = TestBed.inject(AuthService);
  auth.saveSession({ email: 'owner@test.com', typeUser: 1, sessionToken: 'access' });
  return { component: TestBed.runInInjectionContext(() => new type()), auth };
}
describe.each([
  ['Consultorios', ClinicsComponent],
  ['Configuración / Consultorios', ClinicsTabComponent],
] as const)('%s: carga de consultorios', (_name, type) => {
  beforeEach(() => localStorage.clear());
  it('loads every active office through the authenticated API and synchronizes selection', async () => {
    const offices = [
      { idConsultorio: 'one', name: 'Norte' },
      { idConsultorio: 'two', name: 'Sur', city: 'Zapopan' },
      { idConsultorio: 'disabled', name: 'Inactivo', active: false },
    ];
    const post = vi.fn(async () => ({ success: true, consultorios: offices }));
    const { component, auth } = setup(type, post);
    await component.cargarConsultorios();
    expect(post).toHaveBeenCalledWith(API_URLS.GETDOCTORSOFFICE, {});
    expect(component.consultorios().map((c) => c.id)).toEqual(['one', 'two']);
    expect(component.filteredConsultorios()).toHaveLength(2);
    expect(auth.getAllBranches()).toEqual(offices.slice(0, 2));
    expect(component.loadError()).toBe('');
  });
  it('reports an API failure instead of presenting it as an empty successful response', async () => {
    const { component } = setup(type, vi.fn().mockRejectedValue(new Error('Método no permitido')));
    await component.cargarConsultorios();
    expect(component.loadError()).toBe('Método no permitido');
    expect(component.isLoading()).toBe(false);
  });
});
describe('Clinic disabling confirmation', () => {
  it('does not remove a clinic visually when its server request fails', async () => {
    const post = vi.fn().mockRejectedValue(new Error('No autorizado'));
    const { component } = setup(ClinicsComponent, post);
    component.consultorios.set([{ id: 'one', name: 'Norte' }]);
    component.disableTarget.set({ id: 'one', name: 'Norte' });
    await component.confirmDisable();
    expect(component.consultorios()).toHaveLength(1);
    expect(component.operationError()).toBe('No autorizado');
    expect(component.busy()).toBe(false);
  });
  it('disables first, then refreshes the list and leaves stored records to the server', async () => {
    let disabled = false;
    const post = vi.fn(async (url: string) => {
      if (url === API_URLS.DEACTIVATE_OFFICE) {
        disabled = true;
        return { success: true, active: false };
      }
      return {
        success: true,
        consultorios: disabled ? [] : [{ idConsultorio: 'one', name: 'Norte' }],
      };
    });
    const { component, auth } = setup(ClinicsComponent, post);
    component.consultorios.set([{ id: 'one', name: 'Norte' }]);
    component.disableTarget.set({ id: 'one', name: 'Norte' });
    await component.confirmDisable();
    expect(post.mock.calls[0][0]).toBe(API_URLS.DEACTIVATE_OFFICE);
    expect(component.consultorios()).toEqual([]);
    expect(auth.getAllBranches()).toEqual([]);
    expect(component.disableTarget()).toBeNull();
  });
});

describe('WhatsApp appointment reminder configuration', () => {
  beforeEach(() => localStorage.clear());
  it('loads safe defaults for an existing office without mutating its cached data', () => {
    const { component } = setup(ClinicsComponent, vi.fn());
    const office = { id: 'one', name: 'Centro' };
    component.editarConsultorio(office);
    expect(component.selectedConsultorio().appointmentReminders).toEqual({
      enabled: true,
      daysBefore: 1,
      sendTime: '08:00',
      timeZone: 'America/Mexico_City',
    });
    expect(office).not.toHaveProperty('appointmentReminders');
  });
  it('saves required reminders with the selected lead time and office time zone through the existing office endpoint', async () => {
    const post = vi.fn(async () => ({ success: true, consultorios: [] }));
    const { component } = setup(ClinicsComponent, post);
    component.editarConsultorio({
      id: 'one',
      name: 'Centro',
      appointmentReminders: { enabled: false, daysBefore: 3, timeZone: 'America/Tijuana' },
    });
    await component.guardarConsultorioIndividual();
    expect(post).toHaveBeenCalledWith(
      API_URLS.SAVEORUPDATECONSULTORIO,
      expect.objectContaining({
        idConsultorio: 'one',
        appointmentReminders: {
          enabled: true,
          daysBefore: 3,
          sendTime: '08:00',
          timeZone: 'America/Tijuana',
        },
      }),
    );
  });
});
