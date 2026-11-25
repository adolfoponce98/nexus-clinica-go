import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { AuthService } from './auth.service';
import { OfficeSyncService } from './office-sync.service';
import { TokenInterceptorService } from './token-interceptor.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { ListaPacientesComponent } from '../patient/patient-list/lista-pacientes.component';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';

describe('Employee read-only data loading', () => {
  let auth: AuthService,
    calendar: CalendarComponent | undefined,
    patients: ListaPacientesComponent | undefined,
    fetchMock: ReturnType<typeof vi.fn<(url: string, options: any) => Promise<any>>>;
  const employee = {
    email: 'assistant@test.com',
    idDoctor: 'owner@test.com',
    idConsultorio: 'a',
    allowedOfficeIds: ['a', 'b'],
    typeUser: 2,
    sessionToken: 'access',
    sessionId: 'sid',
    permissions: { calendar: { read: true, write: false }, patients: { read: true, write: false } },
  };
  const envelope = (data: any) => ({
    ok: true,
    json: async () => ({
      encryptedData: CryptoJS.AES.encrypt(
        JSON.stringify({ success: true, ...data }),
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(),
    }),
  });
  const decode = (options: any) =>
    JSON.parse(
      CryptoJS.AES.decrypt(
        JSON.parse(options.body).encryptedData,
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(CryptoJS.enc.Utf8),
    );
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn<(url: string, options: any) => Promise<any>>();
    vi.stubGlobal('fetch', fetchMock);
    const executeWithAuth = (call: (token: string) => Promise<any>) => call('access');
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ChangeDetectorRef, useValue: { detectChanges() {} } },
        {
          provide: TokenInterceptorService,
          useValue: {
            executeWithAuth,
            authenticatedFetch: (url: string, options: any) => fetchMock(url, options),
          },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
    auth.saveSession(employee);
  });
  afterEach(() => {
    calendar?.ngOnDestroy();
    patients?.ngOnDestroy();
    calendar = undefined;
    patients = undefined;
    TestBed.inject(OfficeSyncService).stop();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('loads patients when an authorized office becomes available after opening the view', async () => {
    fetchMock.mockResolvedValue(
      envelope({
        patients: [{ idPaciente: 'p1', fichaDeIdentificacion: { nombreCompleto: 'Ana' } }],
      }),
    );
    patients = TestBed.runInInjectionContext(() => new ListaPacientesComponent());
    patients.ngOnInit();
    expect(fetchMock).not.toHaveBeenCalled();
    auth.saveSucursal({ idConsultorio: 'a' });
    await vi.waitFor(() => expect(patients!.pacientes()).toHaveLength(1));
    expect(decode(fetchMock.mock.calls[0][1]).idConsultorio).toBe('a');
    expect(patients.pacientes()[0].nombre).toBe('Ana');
    expect(patients.loadError()).toBe('');
  });
  it('loads calendar entries with read-only access and refreshes when the selected office changes', async () => {
    fetchMock.mockImplementation(async (_url, options) =>
      envelope({
        appointments: [
          {
            syncId: decode(options).idConsultorio,
            date: '2030-01-01',
            time: '09:00',
            patientName: decode(options).idConsultorio,
          },
        ],
      }),
    );
    vi.spyOn(TestBed.inject(OfficeSyncService), 'ensureOfficeContext').mockResolvedValue();
    localStorage.setItem('clinicago:calendar-practice:v1:assistant@test.com', 'seen');
    calendar = TestBed.runInInjectionContext(() => new CalendarComponent());
    calendar.ngOnInit();
    expect(fetchMock).not.toHaveBeenCalled();
    auth.saveSucursal({ idConsultorio: 'a' });
    await vi.waitFor(() => expect(calendar!.appointmentsList()[0]?.patientName).toBe('a'));
    calendar.openAppointmentModal('2030-01-01');
    expect(calendar.showAppointmentModal).toBe(false);
    auth.saveSucursal({ idConsultorio: 'b' });
    await vi.waitFor(() => expect(calendar!.appointmentsList()[0]?.patientName).toBe('b'));
    expect(auth.getCachedAppointments()).toHaveLength(1);
  });
  it('discards a late patient response from a previous office', async () => {
    let resolveOld!: (value: any) => void;
    fetchMock
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValue(envelope({ patients: [{ idPaciente: 'b', nombre: 'Paciente B' }] }));
    auth.saveSucursal({ idConsultorio: 'a' });
    patients = TestBed.runInInjectionContext(() => new ListaPacientesComponent());
    patients.ngOnInit();
    auth.saveSucursal({ idConsultorio: 'b' });
    await vi.waitFor(() => expect(patients!.pacientes()[0]?.nombre).toBe('Paciente B'));
    resolveOld(envelope({ patients: [{ idPaciente: 'a', nombre: 'Paciente A' }] }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(patients.pacientes()[0].nombre).toBe('Paciente B');
    expect(auth.getCachedPatients()[0].nombre).toBe('Paciente B');
  });
  it('loads allowed resources after resolving offices even if the presence endpoint is unavailable', async () => {
    const sync = TestBed.inject(OfficeSyncService),
      calls: string[] = [];
    vi.spyOn(sync, 'call').mockImplementation(async (url, payload) => {
      calls.push(url);
      if (url === API_URLS.CHECK_DEVICE_SESSION) throw new Error('Presence unavailable');
      if (url === API_URLS.GETDOCTORSOFFICE)
        return { success: true, consultorios: [{ idConsultorio: 'a', name: 'Office A' }] };
      expect(payload.idConsultorio).toBe('a');
      if (url === API_URLS.GETPATIENTS)
        return { success: true, patients: [{ idPaciente: 'p1', nombre: 'Ana' }] };
      if (url === API_URLS.SYNCFOLLOWINGAPPOINTMENTS)
        return {
          success: true,
          appointments: [{ date: '2030-01-01', time: '09:00', patientName: 'Ana' }],
        };
      return { success: true, notifications: [] };
    });
    await sync.reconcile();
    expect(auth.getSucursal().idConsultorio).toBe('a');
    expect(auth.getCachedPatients()[0].nombre).toBe('Ana');
    expect(auth.getCachedAppointments()).toHaveLength(1);
    expect(calls.indexOf(API_URLS.GETDOCTORSOFFICE)).toBeLessThan(
      calls.indexOf(API_URLS.GETPATIENTS),
    );
  });
  it('resolves full office metadata before opening a permitted menu and reuses it on subsequent navigation', async () => {
    auth.initializeEmployeeOffice();
    const sync = TestBed.inject(OfficeSyncService);
    const call = vi
      .spyOn(sync, 'call')
      .mockResolvedValue({
        success: true,
        consultorios: [
          { idConsultorio: 'a', name: 'Norte', services: [{ id: 's1', nombre: 'Consulta' }] },
        ],
      });
    await sync.ensureOfficeContext();
    expect(auth.getSucursal().services).toHaveLength(1);
    expect(auth.getSucursal().name).toBe('Norte');
    await sync.ensureOfficeContext();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('does not request data for a module without read permission', async () => {
    auth.saveSession({
      ...employee,
      permissions: { calendar: { read: false }, patients: { read: true } },
    });
    auth.saveSucursal({ idConsultorio: 'a' });
    const sync = TestBed.inject(OfficeSyncService),
      call = vi.spyOn(sync, 'call').mockResolvedValue({ success: true, patients: [] });
    await sync.refresh('appointments');
    expect(call).not.toHaveBeenCalled();
    await sync.refresh('patients');
    expect(call).toHaveBeenCalledExactlyOnceWith(API_URLS.GETPATIENTS, { idConsultorio: 'a' });
  });
  it('shares the in-flight office and resource requests between initial views and background synchronization', async () => {
    const sync = TestBed.inject(OfficeSyncService);
    let finishOffice!: (value: any) => void, finishPatients!: (value: any) => void;
    const call = vi.spyOn(sync, 'call').mockImplementation((url) => {
      if (url === API_URLS.GETDOCTORSOFFICE)
        return new Promise((resolve) => (finishOffice = resolve));
      if (url === API_URLS.GETPATIENTS) return new Promise((resolve) => (finishPatients = resolve));
      return Promise.resolve({ success: true, appointments: [], notifications: [] });
    });
    const officeJob = sync.refresh('offices', false),
      contextJob = sync.ensureOfficeContext();
    expect(call).toHaveBeenCalledTimes(1);
    finishOffice({ success: true, consultorios: [{ idConsultorio: 'a', name: 'Office A' }] });
    await Promise.all([officeJob, contextJob]);
    const patientJob = sync.refresh('patients', false),
      viewJob = sync.ensureResource('patients');
    expect(call.mock.calls.filter(([url]) => url === API_URLS.GETPATIENTS)).toHaveLength(1);
    finishPatients({ success: true, patients: [] });
    await Promise.all([patientJob, viewJob]);
    await sync.ensureResource('patients');
    expect(call.mock.calls.filter(([url]) => url === API_URLS.GETPATIENTS)).toHaveLength(1);
  });
});
