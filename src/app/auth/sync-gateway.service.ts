import { patientSummary } from '../patient/patient-summary';
import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { AuthService } from './auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { SECURITY_CONFIG } from '../config/security.config';
export type SyncResource =
  | 'offices'
  | 'patients'
  | 'appointments'
  | 'notifications'
  | 'profile'
  | 'billing'
  | 'calendar'
  | 'reviews';
const fields: Record<string, string> = {
  offices: 'consultorios',
  patients: 'patients',
  appointments: 'appointments',
  notifications: 'notifications',
};
export function resourceId(type: string, row: any): string {
  return String(
    type === 'offices'
      ? row.idConsultorio || row.id
      : type === 'patients'
        ? row.idPaciente || row.id
        : type === 'appointments'
          ? row.syncId || row.searchDocId || row.appointmentId
          : row.id,
  );
}
export function mergeResource(type: string, current: any, incoming: any): any {
  if (incoming.notModified) {
    if (!current) throw new Error('No existe copia local de ' + type);
    return { ...current, fromCache: true };
  }
  if (!incoming.delta) {
    const field = fields[type],
      version = Number(incoming.version) || Date.parse(incoming.lastUpdated || '');
    const pending = (current?.[field] || []).filter(
      (row: any) => Number(row._syncVersion) > version,
    );
    if (!field || !pending.length) return incoming;
    const rows = new Map<string, any>(
      (incoming[field] || []).map((row: any) => [resourceId(type, row), row]),
    );
    for (const row of pending) rows.set(resourceId(type, row), row);
    return { ...incoming, [field]: [...rows.values()] };
  }
  if (!current) throw new Error('Se recibió un cambio incremental sin copia local');
  const field = fields[type],
    incomingVersion = Number(incoming.version) || Date.parse(incoming.lastUpdated || ''),
    removed = new Set(incoming.removedIds || []),
    rows = new Map<string, any>(
      (current[field] || [])
        .filter(
          (row: any) =>
            !removed.has(resourceId(type, row)) || Number(row._syncVersion) > incomingVersion,
        )
        .map((row: any) => [resourceId(type, row), row]),
    );
  for (const row of incoming[field] || []) {
    const id = resourceId(type, row);
    if (Number(rows.get(id)?._syncVersion) > incomingVersion) continue;
    rows.set(id, row);
  }
  return { ...incoming, delta: false, [field]: [...rows.values()] };
}
@Injectable({ providedIn: 'root' })
export class SyncGatewayService implements OnDestroy {
  private serial = 0;
  private applied = new Map<string, number>();
  ngOnDestroy() {
    window.removeEventListener('clinic-local-mutation', this.onMutation);
    this.updates.complete();
  }
  private readonly auth = inject(AuthService);
  private readonly api = inject(ClinicApiService);
  readonly updates = new Subject<{
    type: SyncResource;
    data: any;
    office: string;
    local?: boolean;
  }>();
  constructor() {
    window.addEventListener('clinic-local-mutation', this.onMutation);
  }
  private readonly onMutation = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail || detail.office !== this.office()) return;
    const type = detail.type as SyncResource,
      current = this.peek(type);
    if (!current) return;
    const data = detail.data,
      raw = type === 'patients' ? data.patient : data.appointment;
    if (!raw) return;
    const version = Number(raw._syncVersion || 0),
      previous = Number(raw._syncPreviousVersion || 0),
      cursor = Date.parse(current.lastUpdated || '');
    if (version && version < cursor) return;
    const row =
      type === 'patients'
        ? {
            idPaciente: data.idPaciente || data.patientId,
            expedienteId: data.expedienteId,
            numeroDeExpediente: data.numeroDeExpediente,
            fichaDeIdentificacion: Object.fromEntries(
              ['nombreCompleto', 'telefono', 'correo', 'edad', 'sexo'].map((key) => [
                key,
                raw.fichaDeIdentificacion?.[key] || '',
              ]),
            ),
            consultationCount: 0,
            _syncVersion: version,
          }
        : raw;
    const next = mergeResource(type, current, {
      delta: true,
      removedIds: [],
      [fields[type]]: [row],
    });
    next.lastUpdated = current.lastUpdated;
    next.version = current.version;
    if (version && cursor === previous) {
      this.applied.set(this.key(type, detail.office), ++this.serial);
      next.version = version;
      next.lastUpdated = new Date(version).toISOString();
    }
    this.save(type, next, detail.office);
    this.updates.next({ type, data: next, office: detail.office, local: true });
  };
  private active = new Map<
    string,
    { resources: Set<SyncResource>; presence: boolean; promise: Promise<any> }
  >();
  private queue = new Map<
    string,
    {
      resources: Set<SyncResource>;
      force: Set<SyncResource>;
      presence: boolean;
      waiters: { resolve: (value: any) => void; reject: (error: any) => void }[];
    }
  >();
  private identity() {
    const s = this.auth.getSession();
    return JSON.stringify([
      s?.email,
      s?.idDoctor || s?.email,
      s?.permissions || null,
      s?.allowedOfficeIds || null,
      s?.clinicalRole || null,
    ]);
  }
  private office() {
    const o = this.auth.getSucursal();
    return o?.idConsultorio || o?.id || '';
  }
  private key(type: string, office = this.office()) {
    return (
      'cliniq-sync:v3:' +
      this.identity() +
      ':' +
      (type === 'offices' || type === 'profile' || type === 'billing' ? 'account' : office) +
      ':' +
      type
    );
  }
  peek(type: SyncResource, office = this.office()): any {
    try {
      const raw = localStorage.getItem(this.key(type, office));
      if (!raw) return null;
      const data = JSON.parse(
        CryptoJS.AES.decrypt(raw, SECURITY_CONFIG.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8),
      );
      if (data.displaySnapshot) {
        if (type === 'patients') {
          if (!this.auth.hasCachedPatients(office)) return null;
          data.patients = this.auth.getCachedPatients(office);
        }
        if (type === 'appointments') {
          if (!this.auth.hasCachedAppointments(office)) return null;
          data.appointments = this.auth.getCachedAppointments(office);
        }
      }
      return data;
    } catch {
      return null;
    }
  }
  version(type: SyncResource): string {
    return String(this.peek(type)?.lastUpdated || this.peek(type)?.version || '');
  }
  invalidate(type: SyncResource, office = this.office()) {
    localStorage.removeItem(this.key(type, office));
  }
  accept(type: SyncResource, data: any, office = this.office()) {
    this.applied.set(this.key(type, office), ++this.serial);
    this.save(type, data, office);
    this.updates.next({ type, data, office, local: true });
  }
  private save(type: SyncResource, data: any, office: string) {
    try {
      let snapshot = data;
      if (type === 'patients') {
        this.auth.saveCachedPatients(data.patients.map(patientSummary), data.lastUpdated, office);
        const { patients, ...metadata } = data;
        snapshot = { ...metadata, displaySnapshot: true };
      }
      if (type === 'appointments') {
        this.auth.saveCachedAppointments(data.appointments, true, data.lastUpdated, office);
        const { appointments, ...metadata } = data;
        snapshot = { ...metadata, displaySnapshot: true };
      }
      localStorage.setItem(
        this.key(type, office),
        CryptoJS.AES.encrypt(JSON.stringify(snapshot), SECURITY_CONFIG.ENCRYPTION_KEY).toString(),
      );
    } catch {
      /* Data is written before its cursor; quota errors cannot mark missing data as synchronized. */
    }
  }
  load(resources: SyncResource[], force = false, presence = false): Promise<any> {
    const session = this.auth.getSession(),
      office = this.office(),
      key = JSON.stringify([this.identity(), session?.sessionId, office]);
    const active = this.active.get(key);
    if (
      !force &&
      (!presence || active?.presence) &&
      active &&
      resources.every((type) => active.resources.has(type))
    )
      return active.promise;
    return new Promise((resolve, reject) => {
      let batch = this.queue.get(key);
      if (!batch) {
        batch = { resources: new Set(), force: new Set(), presence: false, waiters: [] };
        this.queue.set(key, batch);
        setTimeout(() => void this.flush(key, session, office), 0);
      }
      batch.presence ||= presence;
      resources.forEach((type) => {
        batch!.resources.add(type);
        if (force) batch!.force.add(type);
      });
      batch.waiters.push({ resolve, reject });
    });
  }
  private async flush(key: string, session: any, office: string) {
    const batch = this.queue.get(key);
    if (!batch) return;
    this.queue.delete(key);
    const shared = new Promise<any>((resolve, reject) => batch.waiters.push({ resolve, reject }));
    shared.catch(() => {});
    const active = { resources: batch.resources, presence: batch.presence, promise: shared };
    this.active.set(key, active);
    const identity = this.identity(),
      authKey = 'cliniq-sync:v3:authorization:' + identity;
    const order = ++this.serial;
    const resources = [...batch.resources],
      versions = Object.fromEntries(
        resources
          .filter((type) => !batch.force.has(type))
          .map((type) => [
            type,
            String(this.peek(type, office)?.lastUpdated || this.peek(type, office)?.version || ''),
          ]),
      );
    try {
      const response = await this.api.post(API_URLS.SYNC_CLINIC_DATA, {
        idConsultorio: office,
        presence: batch.presence,
        resources,
        versions,
        authorizationVersion: localStorage.getItem(authKey) || '',
      });
      const current = this.auth.getSession();
      if (
        !current ||
        current.email !== session?.email ||
        current.idDoctor !== session?.idDoctor ||
        current.sessionId !== session?.sessionId ||
        this.identity() !== identity
      )
        throw new Error('La sesión cambió durante la sincronización');
      const result: any = {
        ...response,
        idConsultorio: response.idConsultorio || office,
        resources: {},
      };
      for (const [resource, incoming] of Object.entries(response.resources || {})) {
        const type = resource as SyncResource;
        if ((incoming as any).unavailable) {
          result.resources[type] = incoming;
          continue;
        }
        const targetOffice = response.idConsultorio || office;
        const resourceKey = this.key(type, targetOffice);
        if ((this.applied.get(resourceKey) || 0) > order) {
          result.resources[type] = this.peek(type, targetOffice);
          continue;
        }
        const data = mergeResource(type, this.peek(type, targetOffice), incoming);
        // A late response may not roll a newer data snapshot back.
        const latest = this.peek(type, targetOffice),
          oldVersion = Date.parse(latest?.lastUpdated || ''),
          newVersion = Date.parse(data.lastUpdated || '');
        if (Number.isFinite(oldVersion) && Number.isFinite(newVersion) && oldVersion > newVersion) {
          result.resources[type] = latest;
          continue;
        }
        this.applied.set(resourceKey, order);
        if (!(incoming as any).notModified) this.save(type, data, targetOffice);
        result.resources[type] = data;
        if (!(incoming as any).notModified || type === 'billing')
          this.updates.next({ type, data, office: targetOffice });
      }
      try {
        localStorage.setItem(authKey, response.authorizationVersion);
      } catch {}
      batch.waiters.forEach((waiter) => waiter.resolve(result));
    } catch (error) {
      batch.waiters.forEach((waiter) => waiter.reject(error));
    } finally {
      if (this.active.get(key) === active) this.active.delete(key);
    }
  }
}
