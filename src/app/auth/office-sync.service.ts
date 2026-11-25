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
  start() {
    if (this.heartbeat) return;
    this.branchSubscription = this.auth.branchChanged$.subscribe(() => {
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
    const pending = this.pendingResource(type);
    if (pending) return pending;
    if (type === 'patients' ? this.auth.hasCachedPatients() : this.auth.hasCachedAppointments())
      return Promise.resolve();
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
    // Resolve real office context before resource reads. Presence failures must not block authorized data.
    await Promise.allSettled([this.check(), this.refresh('offices', false)]);
    if (!this.auth.isLoggedIn()) return;
    await Promise.allSettled(
      ['patients', 'appointments', 'notifications'].map((type) => this.refresh(type, false)),
    );
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
      if (data.type === 'appointments' && data.originDeviceId === browserDevice().id) return;
      this.ui.show(
        title || data.title || 'Clínica Go',
        body || data.body || 'Hay nueva información disponible.',
        data,
      );
      const office = this.auth.getSucursal()?.idConsultorio || this.auth.getSucursal()?.id;
      if (data.type === 'offices' || data.idConsultorio === office)
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
    };
    const module = (
      {
        patients: 'patients',
        appointments: 'calendar',
        notifications: 'calendar',
        followUps: 'followUps',
      } as Record<string, string>
    )[type];
    if (module && !this.permissions.can(module)) return;
    if (!urls[type]) {
      this.updates.next(type);
      return;
    }
    const data = await this.call(urls[type], type === 'offices' ? {} : { idConsultorio: office });
    if (
      this.auth.getSession()?.email !== session.email ||
      this.auth.getSession()?.idDoctor !== session.idDoctor ||
      this.auth.getSession()?.sessionId !== session.sessionId
    )
      return;
    const active = this.auth.getSucursal()?.idConsultorio || this.auth.getSucursal()?.id;
    if (type !== 'offices' && active !== office) return;
    if (type === 'patients')
      this.auth.saveCachedPatients(data.patients.map(patientSummary), data.lastUpdated);
    if (type === 'appointments')
      this.auth.saveCachedAppointments(data.appointments, true, data.lastUpdated);
    if (type === 'offices') this.auth.saveAllBranches(data.consultorios);
    if (type === 'notifications') {
      const context = { user: session.email, branch: office };
      this.notifications.save(
        context,
        this.notifications.merge(this.notifications.read(context) || [], data.notifications),
      );
    }
    this.updates.next(type);
  }
}
