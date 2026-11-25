import { uniqueAppointments } from './appointment-cache';
import { browserDevice } from './browser-device';
import { clearSyncCache } from './sync-cache';
import { versionedFetch } from './sync-cache';
import { API_URLS } from '../config/api-urls';
import { SECURITY_CONFIG } from '../config/security.config';
import * as CryptoJS from 'crypto-js';
import { Injectable, signal, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  constructor() {
    window.addEventListener('storage', this.onCacheStorage);
  }
  ngOnDestroy() {
    window.removeEventListener('storage', this.onCacheStorage);
  }
  private readonly onCacheStorage = (event: StorageEvent) => {
    if (event.key === this.scopedKey(this.STORAGE_PATIENTS)) this.patientsUpdatedSource.next();
    if (event.key === this.scopedKey(this.STORAGE_APPOINTMENTS)) this.notifyAppointmentsUpdated();
  };

  readonly sessionRevision = signal(0);
  private readonly STORAGE_KEY = 'cliniq-go-session';
  private readonly STORAGE_SUCURSAL = 'cliniq-go-sucursal_data';
  private readonly STORAGE_PATIENTS = 'cliniq-go-patients_cache:v2';
  private readonly STORAGE_SYNC_DATE = 'cliniq-go-patients_sync_date:v2';

  // 🆕 Nuevas constantes para el manejo local de próximas citas
  private readonly STORAGE_APPOINTMENTS = 'cliniq-go-appointments_cache';
  private readonly STORAGE_APPOINTMENTS_SYNC_DATE = 'cliniq-go-appointments_sync_date';
  // 🆕 Constante para la caché del listado completo de consultorios
  private readonly STORAGE_ALL_BRANCHES = 'cliniq-go-all_branches_cache';

  // 🆕 Constante para almacenar localmente el token FCM del navegador
  private readonly STORAGE_FCM_TOKEN = 'cliniq-go-fcm_token';

  private patientsUpdatedSource = new Subject<void>();
  readonly patientsUpdated$ = this.patientsUpdatedSource.asObservable();

  private appointmentsUpdatedSource = new Subject<void>();
  appointmentsUpdated$ = this.appointmentsUpdatedSource.asObservable();

  private branchChangedSource = new Subject<string>();
  branchChanged$ = this.branchChangedSource.asObservable();

  // 🆕 Actualizar los servicios dentro de la sucursal activa actual
  saveServicesToActiveSucursal(services: any[]) {
    const sucursal = this.getSucursal();
    if (sucursal) {
      sucursal.services = services;
      this.saveSucursal(sucursal);
    }
  }

  // 🆕 Actualizar los servicios dentro de un consultorio específico en la lista general de sucursales
  updateServicesInBranch(branchId: string, services: any[]) {
    const branches = this.getAllBranches();
    const updatedBranches = branches.map((b) => {
      const currentId = b.idConsultorio || b.id;
      if (currentId === branchId) {
        return { ...b, services: services };
      }
      return b;
    });
    this.saveAllBranches(updatedBranches);
  }

  notifyAppointmentsUpdated() {
    this.appointmentsUpdatedSource.next();
  }

  // 🆕 Guardar el listado completo de consultorios
  saveAllBranches(branches: any[]) {
    branches = branches.filter((branch) => branch.active !== false && branch.status !== 'disabled');
    localStorage.setItem(this.STORAGE_ALL_BRANCHES, JSON.stringify(branches));
    this.selectAvailableBranch(branches);
  }

  // 🆕 Obtener el listado completo de consultorios de la caché
  getAllBranches(): any[] {
    const data = localStorage.getItem(this.STORAGE_ALL_BRANCHES);
    return data ? JSON.parse(data) : [];
  }

  // 🔄 Sustituye este método en tu AuthService
  saveCachedAppointments(
    appointments: any[],
    overwrite: boolean = false,
    serverVersion?: string,
    officeId?: string,
  ) {
    const appointmentsToStore = uniqueAppointments(
      overwrite ? appointments : [...this.getCachedAppointments(officeId), ...appointments],
    );
    localStorage.setItem(
      this.scopedKey(this.STORAGE_APPOINTMENTS, officeId),
      JSON.stringify(appointmentsToStore),
    );

    // 🚀 Notificar a todos los componentes suscritos que la caché cambió
    if (serverVersion)
      localStorage.setItem(
        this.scopedKey(this.STORAGE_APPOINTMENTS_SYNC_DATE, officeId),
        serverVersion,
      );
    this.notifyAppointmentsUpdated();
  }

  private scopedKey(key: string, officeId?: string): string {
    const raw = localStorage.getItem(this.STORAGE_KEY),
      session = raw ? JSON.parse(raw) : {};
    const office = this.getSucursal();
    return (
      key +
      ':' +
      JSON.stringify([
        session.email || '',
        session.idDoctor || session.email || '',
        officeId || office?.idConsultorio || office?.id || '',
      ])
    );
  }

  clearBranchCache() {
    localStorage.removeItem(this.scopedKey(this.STORAGE_PATIENTS));
    localStorage.removeItem(this.scopedKey(this.STORAGE_SYNC_DATE));
    localStorage.removeItem(this.scopedKey(this.STORAGE_APPOINTMENTS));
    localStorage.removeItem(this.scopedKey(this.STORAGE_APPOINTMENTS_SYNC_DATE));
    // Nota: Mantenemos STORAGE_KEY (sesión) y STORAGE_SUCURSAL (se actualizará con la nueva)
  }

  hasCachedAppointments(officeId?: string): boolean {
    return localStorage.getItem(this.scopedKey(this.STORAGE_APPOINTMENTS, officeId)) !== null;
  }
  hasCachedPatients(officeId?: string): boolean {
    return localStorage.getItem(this.scopedKey(this.STORAGE_PATIENTS, officeId)) !== null;
  }
  getCachedAppointments(officeId?: string): any[] {
    const data = localStorage.getItem(this.scopedKey(this.STORAGE_APPOINTMENTS, officeId));
    return data ? uniqueAppointments(JSON.parse(data)) : [];
  }

  getLastSyncDateAppointments(officeId?: string): string {
    return (
      localStorage.getItem(this.scopedKey(this.STORAGE_APPOINTMENTS_SYNC_DATE, officeId)) || ''
    );
  }

  private accessToken = '';
  private refreshInFlight: Promise<string> | null = null;
  private restoreAttempted = false;
  private sessionVersion = 0;
  private sessionQueue: Promise<unknown> = Promise.resolve();

  // Tokens never persist in Web Storage. Metadata is not an authentication credential.
  saveSession(userData: any) {
    const { sessionToken, accessToken, refreshToken, ...metadata } = userData;
    const previous = this.getSession();
    if (
      previous &&
      ['permissions', 'clinicalRole', 'allowedOfficeIds', 'idDoctor'].some(
        (key) =>
          Object.hasOwn(metadata, key) &&
          JSON.stringify(previous[key]) !== JSON.stringify(metadata[key]),
      )
    ) {
      this.clearBranchCache();
      clearSyncCache();
      localStorage.removeItem(this.STORAGE_ALL_BRANCHES);
    }
    if (previous?.email && metadata.email && previous.email !== metadata.email) {
      this.clearBranchCache();
      localStorage.removeItem(this.STORAGE_SUCURSAL);
      localStorage.removeItem(this.STORAGE_ALL_BRANCHES);
      localStorage.removeItem(this.STORAGE_FCM_TOKEN);
    }
    this.accessToken = sessionToken || accessToken || this.accessToken;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
    this.restoreAttempted = true;
    this.sessionRevision.update((v) => v + 1);
  }

  private withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
    // Serialize within this tab even on browsers without Web Locks.
    const run = this.sessionQueue.then(async (): Promise<T> => {
      if (navigator.locks) return await navigator.locks.request('cliniq-go-session', operation);
      return await operation();
    });
    this.sessionQueue = run.catch(() => {});
    return run;
  }

  login(url: string, encryptedData: string): Promise<Response> {
    const payload = JSON.parse(
      CryptoJS.AES.decrypt(encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
        CryptoJS.enc.Utf8,
      ),
    );
    payload.device = browserDevice();
    encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECURITY_CONFIG.ENCRYPTION_KEY,
    ).toString();
    if (url !== API_URLS.LOGINUSER && url !== API_URLS.LOGINEMPLOYEE)
      throw new Error('URL de login inválida');
    this.sessionVersion++;
    return this.withSessionLock(() =>
      versionedFetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this.sessionHeaders(),
        body: JSON.stringify({ encryptedData }),
      }),
    );
  }

  async ensureSession(): Promise<boolean> {
    if (!this.getSession()) {
      this.accessToken = '';
      return false;
    }
    if (this.accessToken) return true;
    if (this.restoreAttempted || !this.getSession()) return false;
    this.restoreAttempted = true;
    try {
      await this.refreshAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  refreshAccessToken(): Promise<string> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const version = this.sessionVersion;
    this.refreshInFlight = this.withSessionLock(async () => {
      if (version !== this.sessionVersion) throw new Error('Sesión cerrada');
      const response = await versionedFetch(API_URLS.REFRESHTOKEN, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this.sessionHeaders(),
        body: JSON.stringify({
          encryptedData: CryptoJS.AES.encrypt(
            JSON.stringify({ deviceId: browserDevice().id }),
            SECURITY_CONFIG.ENCRYPTION_KEY,
          ).toString(),
        }),
      });
      if (!response.ok) {
        const error = new Error(
          response.status === 401 || response.status === 403
            ? 'La sesión expiró. Inicia sesión nuevamente.'
            : 'No se pudo renovar la sesión. Intenta nuevamente.',
        );
        error.name =
          response.status === 401 || response.status === 403
            ? 'SessionExpiredError'
            : 'SessionUnavailableError';
        throw error;
      }
      const json = await response.json();
      const data = JSON.parse(
        CryptoJS.AES.decrypt(json.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
          CryptoJS.enc.Utf8,
        ),
      );
      if (!data.success || !data.accessToken || version !== this.sessionVersion) {
        const error = new Error('Sesión inválida o cerrada');
        error.name = 'SessionExpiredError';
        throw error;
      }
      this.updateSessionToken(data.accessToken);
      return this.accessToken;
    }).finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private sessionHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-app-signature': SECURITY_CONFIG.APP_SECRET_HEADER,
      'x-client-source': 'angular',
      'x-session-request': '1',
    };
  }

  clearSession() {
    this.sessionRevision.update((v) => v + 1);
    clearSyncCache();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        [
          'cliniq-go-patients_cache:',
          'cliniq-go-patients_sync_date:',
          'cliniq-go-appointments_cache:',
          'cliniq-go-appointments_sync_date:',
        ].some((prefix) => key.startsWith(prefix))
      )
        localStorage.removeItem(key);
    }
    this.sessionVersion++;
    this.accessToken = '';
    this.restoreAttempted = true;
    for (const key of [
      this.STORAGE_KEY,
      this.STORAGE_PATIENTS,
      this.STORAGE_SUCURSAL,
      this.STORAGE_SYNC_DATE,
      this.STORAGE_ALL_BRANCHES,
      this.STORAGE_APPOINTMENTS,
      this.STORAGE_APPOINTMENTS_SYNC_DATE,
      this.STORAGE_FCM_TOKEN,
    ])
      localStorage.removeItem(key);
  }

  async logout(): Promise<void> {
    const session = this.getSession(),
      office = this.getSucursal();
    const logoutPayload = {
      deviceId: browserDevice().id,
      idDoctor: session?.idDoctor || session?.email,
      idConsultorio: office?.idConsultorio || office?.id,
    };
    this.clearSession();
    await this.withSessionLock(async () => {
      const response = await versionedFetch(API_URLS.LOGOUT_SESSION, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this.sessionHeaders(),
        body: JSON.stringify({
          encryptedData: CryptoJS.AES.encrypt(
            JSON.stringify(logoutPayload),
            SECURITY_CONFIG.ENCRYPTION_KEY,
          ).toString(),
        }),
      });
      if (!response.ok)
        throw new Error('No se pudo cerrar la sesión en el servidor. Intenta nuevamente.');
    });
  }

  private preferredOfficeKey(): string | null {
    const session = this.getSession();
    return session?.email
      ? 'cliniq-go-preferred-office:' +
          JSON.stringify([session.email, session.idDoctor || session.email])
      : null;
  }

  initializeEmployeeOffice(): void {
    const session = this.getSession();
    if (!session?.idDoctor) return;
    const allowed: string[] = session.allowedOfficeIds || [session.idConsultorio].filter(Boolean);
    const key = this.preferredOfficeKey(),
      preferred = key ? localStorage.getItem(key) : null;
    const id = preferred && allowed.includes(preferred) ? preferred : allowed[0];
    if (id) this.saveSucursal({ idConsultorio: id });
  }

  private selectAvailableBranch(branches: any[]): void {
    const session = this.getSession();
    if (!session) return;
    const allowed = session.idDoctor ? session.allowedOfficeIds || [session.idConsultorio] : null;
    const available = branches.filter((b) => !allowed || allowed.includes(b.idConsultorio || b.id));
    const key = this.preferredOfficeKey(),
      preferred = key ? localStorage.getItem(key) : null;
    const current = this.getSucursal(),
      currentId = current?.idConsultorio || current?.id;
    const selected =
      available.find((b) => (b.idConsultorio || b.id) === preferred) ||
      available.find((b) => (b.idConsultorio || b.id) === currentId) ||
      available[0];
    if (selected) this.saveSucursal(selected);
    else {
      this.clearBranchCache();
      localStorage.removeItem(this.STORAGE_SUCURSAL);
      if (currentId) this.branchChangedSource.next('');
    }
  }

  saveSucursal(userData: any) {
    const previous = this.getSucursal(),
      previousId = previous?.idConsultorio || previous?.id;
    localStorage.setItem(this.STORAGE_SUCURSAL, JSON.stringify(userData));
    const branchId = userData?.idConsultorio || userData?.id;
    if (branchId) {
      const key = this.preferredOfficeKey();
      if (key) localStorage.setItem(key, branchId);
      if (branchId !== previousId) this.branchChangedSource.next(branchId);
    }
  }

  getSucursal() {
    const data = localStorage.getItem(this.STORAGE_SUCURSAL);
    return data ? JSON.parse(data) : null;
  }

  // 🔄 Actualizar únicamente el token de la sesión existente manteniendo el resto de datos
  updateSessionToken(newToken: string) {
    const currentSession = this.getSession();
    if (currentSession) {
      currentSession.sessionToken = newToken; // Actualiza solo el campo del JWT
      this.saveSession(currentSession);
    }
  }

  updateSessionTokens(newToken: string, _newRefreshToken?: string) {
    this.updateSessionToken(newToken);
  }

  // 🆕 Gestión local del Token FCM
  saveFcmToken(token: string) {
    localStorage.setItem(this.STORAGE_FCM_TOKEN, token);
  }

  getFcmToken(): string | null {
    return localStorage.getItem(this.STORAGE_FCM_TOKEN);
  }

  // 🔄 Gestión de caché de pacientes y fecha de sincronización
  saveCachedPatients(patients: any[], serverVersion?: string, officeId?: string) {
    localStorage.setItem(this.scopedKey(this.STORAGE_PATIENTS, officeId), JSON.stringify(patients));
    if (serverVersion)
      localStorage.setItem(this.scopedKey(this.STORAGE_SYNC_DATE, officeId), serverVersion);
    this.patientsUpdatedSource.next();
  }

  getCachedPatients(officeId?: string): any[] {
    const data = localStorage.getItem(this.scopedKey(this.STORAGE_PATIENTS, officeId));
    return data ? JSON.parse(data) : [];
  }

  getLastSyncDatePatients(officeId?: string): string {
    return localStorage.getItem(this.scopedKey(this.STORAGE_SYNC_DATE, officeId)) || ''; // Si está vacío, el servidor sabrá que debe mandar todo
  }

  getSession() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    try {
      const { sessionToken, accessToken, refreshToken, ...metadata } = JSON.parse(raw);
      if (sessionToken || accessToken || refreshToken)
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
      return { ...metadata, sessionToken: this.accessToken };
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.accessToken;
  }
}
