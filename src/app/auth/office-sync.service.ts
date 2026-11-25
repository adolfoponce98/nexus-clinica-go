import { SyncGatewayService, SyncResource } from './sync-gateway.service';
import { patientSummary } from '../patient/patient-summary';
import { PermissionService } from './permission.service';
import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { AuthService } from './auth.service';
import { TokenInterceptorService } from './token-interceptor.service';
import { NotificationUiService } from './notification-ui.service';
import { LocalNotificationsService } from './local-notifications.service';
import { API_URLS } from '../config/api-urls';
import { SECURITY_CONFIG } from '../config/security.config';
import { versionedFetch } from './sync-cache';
import { browserDevice } from './browser-device';
import { SYNC_POLICY } from '../config/sync-policy';

type OfficePush = Partial<
  Record<
    | 'originDeviceId'
    | 'eventId'
    | 'type'
    | 'deviceId'
    | 'sessionId'
    | 'idDoctor'
    | 'idConsultorio'
    | 'title'
    | 'body'
    | 'version',
    string
  >
>;
@Injectable({ providedIn: 'root' })
export class OfficeSyncService {
  private readonly gateway = inject(SyncGatewayService);
  private applyingBatch = false;
  private readonly permissions = inject(PermissionService);
  private readonly auth = inject(AuthService);
  private readonly tokens = inject(TokenInterceptorService);
  private readonly ui = inject(NotificationUiService);
  private readonly notifications = inject(LocalNotificationsService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly pending = new Map<string, Promise<void>>();
  private readonly dirty = new Set<string>();
  private readonly seen = new Set<string>();
  readonly updates = new Subject<string>();
  private heartbeat?: ReturnType<typeof setInterval>;
  private branchSubscription?: Subscription;
  private lastReconcile = 0;
  private reconciling?: Promise<void>;
  async call(url: string, payload: any = {}) {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECURITY_CONFIG.ENCRYPTION_KEY,
    ).toString();
    const response = await this.tokens.executeWithAuth((token) =>
      versionedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': SECURITY_CONFIG.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ encryptedData }),
      }),
    );
    const envelope = await response.json();
    const data = envelope.encryptedData
      ? JSON.parse(
          CryptoJS.AES.decrypt(envelope.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
            CryptoJS.enc.Utf8,
          ),
        )
      : envelope;
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación');
    if (!data.success) throw new Error(data.error || 'No se pudo completar la operación');
    return data;
  }
  constructor() {
    this.gateway.updates.subscribe(({ type, data, office, local }) => {
      if (local && (type === 'patients' || type === 'appointments' || type === 'notifications'))
        this.applyResource(type, data, office);
    });
  }
  start() {
    if (this.heartbeat) return;
    this.branchSubscription = this.auth.branchChanged$.subscribe(() => {
      if (this.applyingBatch) return;
      void Promise.allSettled(
        ['patients', 'appointments', 'notifications'].map((type) => this.refresh(type, false)),
      );
    });
    void this.reconcile().catch(() => {});
    this.heartbeat = setInterval(() => {
      if (
        this.auth.isLoggedIn() &&
        document.visibilityState === 'visible' &&
        Date.now() - this.lastReconcile >= SYNC_POLICY.officeFallbackMs
      )
        void this.reconcile().catch(() => {});
    }, SYNC_POLICY.officeFallbackMs);
    window.addEventListener('focus', this.onFocus);
  }
  stop() {
    this.branchSubscription?.unsubscribe();
    this.branchSubscription = undefined;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.lastReconcile = 0;
    window.removeEventListener('focus', this.onFocus);
  }
  private readonly onFocus = () => {
    if (this.auth.isLoggedIn() && Date.now() - this.lastReconcile >= SYNC_POLICY.officeFallbackMs)
      void this.reconcile().catch(() => {});
  };
  async check() {
    const data = await this.call(API_URLS.CHECK_DEVICE_SESSION, {
      idConsultorio: this.auth.getSucursal()?.idConsultorio,
    });
    if (data.authorization) {
      const current = this.auth.getSession();
      if (
        current &&
        Object.entries(data.authorization).some(
          ([key, value]) => JSON.stringify((current as any)[key]) !== JSON.stringify(value),
        )
      )
        this.auth.saveSession({ ...current, ...data.authorization });
    }
  }
  async ensureOfficeContext(): Promise<void> {
    const active = this.auth.getSucursal(),
      id = active?.idConsultorio || active?.id;
    if (id && this.auth.getAllBranches().some((b) => (b.idConsultorio || b.id) === id)) return;
    const pending = this.pendingResource('offices');
    await (pending || this.refresh('offices', false));
  }
  private pendingResource(type: string): Promise<void> | undefined {
    const session = this.auth.getSession(),
      office = this.auth.getSucursal()?.idConsultorio || this.auth.getSucursal()?.id;
    for (const [key, job] of this.pending) {
      const [email, doctor, id, branch, resource] = JSON.parse(key);
      if (
        email === (session?.email ?? null) &&
        doctor === (session?.idDoctor ?? null) &&
        id === (session?.sessionId ?? null) &&
        resource === type &&
        (type === 'offices' || branch === (office ?? null))
      )
        return job;
    }
    return undefined;
  }
  ensureResource(type: 'patients' | 'appointments'): Promise<void> {
    if (type === 'patients' ? this.auth.hasCachedPatients() : this.auth.hasCachedAppointments())
      return Promise.resolve();
    const pending = this.pendingResource(type);
    if (pending) return pending;
    return this.refresh(type, false);
  }
  reconcile(): Promise<void> {
    if (this.reconciling) return this.reconciling;
    this.lastReconcile = Date.now();
    this.reconciling = this.reconcileNow().finally(() => {
      this.reconciling = undefined;
    });
    return this.reconciling;
  }
  private async reconcileNow() {
    const resources: SyncResource[] = ['offices', 'billing'];
    if (this.permissions.can('patients')) resources.push('patients');
    if (this.permissions.can('calendar')) resources.push('appointments', 'notifications');
    if (this.permissions.can('config')) resources.push('profile');
    for (const type of ['calendar', 'reviews'] as SyncResource[])
      if (this.gateway.peek(type)) resources.push(type);
    const result = await this.gateway.load(resources, false, true);
    const current = this.auth.getSession();
    if (
      result.authorization &&
      current &&
      Object.entries(result.authorization).some(
        ([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value),
      )
    )
      this.auth.saveSession({ ...current, ...result.authorization });
    this.applyingBatch = true;
    try {
      for (const type of [
        'offices',
        'patients',
        'appointments',
        'notifications',
        'profile',
      ] as SyncResource[])
        if (result.resources[type])
          this.applyResource(type, result.resources[type], result.idConsultorio);
    } finally {
      this.applyingBatch = false;
    }
  }
  private applyResource(type: SyncResource, data: any, office: string) {
    if (data.unavailable) return;
    if (data.fromCache && ['patients', 'appointments', 'notifications'].includes(type)) return;
    const active = this.auth.getSucursal()?.idConsultorio || this.auth.getSucursal()?.id;
    if (!['offices', 'profile', 'billing'].includes(type) && office !== active) return;
    if (
      type === 'offices' &&
      JSON.stringify(this.auth.getAllBranches()) !== JSON.stringify(data.consultorios)
    )
      this.auth.saveAllBranches(data.consultorios);
    if (
      type === 'patients' &&
      (!data.lastUpdated || this.auth.getLastSyncDatePatients() !== data.lastUpdated)
    )
      this.auth.saveCachedPatients(data.patients.map(patientSummary), data.lastUpdated);
    if (
      type === 'appointments' &&
      (!data.lastUpdated || this.auth.getLastSyncDateAppointments() !== data.lastUpdated)
    )
      this.auth.saveCachedAppointments(data.appointments, true, data.lastUpdated);
    if (type === 'notifications') {
      const context = { user: this.auth.getSession()?.email, branch: office };
      this.notifications.save(
        context,
        this.notifications.merge(this.notifications.read(context) || [], data.notifications),
      );
    }
    if (type === 'profile' && !this.auth.getSession()?.idDoctor) {
      const session = this.auth.getSession();
      if (
        session &&
        data.profile &&
        Object.entries(data.profile).some(
          ([key, value]) => JSON.stringify(session[key]) !== JSON.stringify(value),
        )
      )
        this.auth.saveSession({ ...session, ...data.profile });
    }
    this.updates.next(type);
  }
  async register(token: string) {
    this.auth.saveFcmToken(token);
    await this.call(API_URLS.REGISTER_OFFICE_DEVICE, {
      idConsultorio: this.auth.getSucursal()?.idConsultorio,
      device: { ...browserDevice(), tokenFirebase: token },
    });
  }
  receive(data: OfficePush = {}, title?: string, body?: string) {
    this.zone.run(() => {
      if (data.eventId && this.seen.has(data.eventId)) return;
      if (data.eventId) {
        this.seen.add(data.eventId);
        if (this.seen.size > 300) this.seen.delete(this.seen.values().next().value!);
      }
      const session = this.auth.getSession();
      if (!session) return;
      if (data.type === 'session-revoked') {
        if (
          data.deviceId === browserDevice().id &&
          (!data.sessionId || data.sessionId === session.sessionId)
        ) {
          this.auth.clearSession();
          this.stop();
          this.ui.show('Sesión cerrada', 'Este dispositivo fue desconectado.');
          void this.router.navigate(['/login']);
        }
        return;
      }
      if (data.idDoctor && data.idDoctor !== (session.idDoctor || session.email)) return;
      if (data.type === 'employee-login') {
        if (!session.idDoctor) {
          this.ui.show(data.title || 'Empleado conectado', data.body || '');
          this.updates.next('devices');
        }
        return;
      }
      const resource = data.type as SyncResource;
      const localVersion = Date.parse(this.gateway.version(resource));
      if (Number(data.version) > 0 && localVersion >= Number(data.version)) return;
      if (
        data.type === 'appointments' &&
        data.originDeviceId === browserDevice().id &&
        !data.version
      )
        return;
      this.ui.show(
        title || data.title || 'Clínica Go',
        body || data.body || 'Hay nueva información disponible.',
        data,
      );
      const office = this.auth.getSucursal()?.idConsultorio || this.auth.getSucursal()?.id;
      if (['calendar', 'reviews'].includes(data.type || '') && data.idConsultorio !== office)
        this.gateway.invalidate(data.type as SyncResource, data.idConsultorio);
      if (
        data.type === 'offices' ||
        ['profile', 'billing'].includes(data.type || '') ||
        data.idConsultorio === office
      )
        void this.refresh(data.type || '').catch(() => {});
    });
  }
  refresh(type: string, invalidate = true): Promise<void> {
    const office = this.auth.getSucursal()?.idConsultorio || this.auth.getSucursal()?.id;
    if (!office && type !== 'offices') return Promise.resolve();
    const key = JSON.stringify([
      this.auth.getSession()?.email,
      this.auth.getSession()?.idDoctor,
      this.auth.getSession()?.sessionId,
      office,
      type,
    ]);
    if (this.pending.has(key)) {
      if (invalidate) this.dirty.add(key);
      return this.pending.get(key)!;
    }
    const job = this.refreshNow(type, office).finally(() => {
      this.pending.delete(key);
      if (this.dirty.delete(key)) void this.refresh(type).catch(() => {});
    });
    this.pending.set(key, job);
    return job;
  }
  private async refreshNow(type: string, office: string) {
    const session = this.auth.getSession(),
      owner = session?.idDoctor || session?.email;
    if (!session) return;
    const urls: Record<string, string> = {
      patients: API_URLS.GETPATIENTS,
      appointments: API_URLS.SYNCFOLLOWINGAPPOINTMENTS,
      offices: API_URLS.GETDOCTORSOFFICE,
      notifications: API_URLS.GETNOTIFICATIONS,
      profile: API_URLS.SYNC_CLINIC_DATA,
      billing: API_URLS.SYNC_CLINIC_DATA,
      calendar: API_URLS.SYNC_CLINIC_DATA,
      reviews: API_URLS.SYNC_CLINIC_DATA,
    };
    const module = (
      {
        patients: 'patients',
        appointments: 'calendar',
        notifications: 'calendar',
        followUps: 'followUps',
        profile: 'config',
        calendar: 'calendar',
        reviews: 'config',
      } as Record<string, string>
    )[type];
    if (module && !this.permissions.can(module)) return;
    if (!urls[type]) {
      this.updates.next(type);
      return;
    }
    const result = await this.gateway.load([type as SyncResource]);
    if (
      this.auth.getSession()?.email !== session.email ||
      this.auth.getSession()?.idDoctor !== session.idDoctor ||
      this.auth.getSession()?.sessionId !== session.sessionId
    )
      return;
    const data = result.resources[type];
    if (data) this.applyResource(type as SyncResource, data, result.idConsultorio || office);
  }
}
