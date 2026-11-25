import { SyncGatewayService } from '../auth/sync-gateway.service';
import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { SYNC_POLICY } from '../config/sync-policy';
export type UsageModule = 'patients' | 'offices' | 'services' | 'employees';
export interface Entitlements {
  active: boolean;
  planId: string;
  planName: string;
  status: string;
  expiresAt: string | null;
  paidThrough?: string | null;
  periodStartedAt?: string | null;
  startedAt?: string | null;
  graceDays?: number;
  inGracePeriod?: boolean;
  cancelAtPeriodEnd: boolean;
  limits: Record<UsageModule, number | null>;
  usage: Record<UsageModule, number>;
  features: Record<'reports' | 'charts' | 'ai', boolean>;
  aiCredits: number;
}
@Injectable({ providedIn: 'root' })
export class BillingService implements OnDestroy {
  private readonly gateway = inject(SyncGatewayService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ClinicApiService);
  readonly state = signal<Entitlements | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly canManage = signal(false);
  readonly now = signal(Date.now());
  readonly remainingDays = computed(() => {
    const end = Date.parse(this.state()?.expiresAt || '');
    return Number.isFinite(end) ? Math.max(0, Math.ceil((end - this.now()) / 86400000)) : 0;
  });
  readonly remainingPercent = computed(() => {
    const state = this.state();
    const start = Date.parse(state?.periodStartedAt || state?.startedAt || '');
    const end = Date.parse(state?.expiresAt || '');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Math.max(0, Math.min(100, (100 * (end - this.now())) / (end - start)));
  });
  readonly inGracePeriod = computed(() => {
    const paid = Date.parse(this.state()?.paidThrough || '');
    return this.active() && Number.isFinite(paid) && this.now() >= paid;
  });
  private pending: Promise<void> | null = null;
  private generation = 0;
  private accepted = 0;
  private scope = '';
  private lastChecked = 0;
  private readonly update = () => {
    const pending = this.pending;
    if (pending) void pending.then(() => this.refresh());
    else void this.refresh();
  };
  private readonly onFocus = () => {
    this.now.set(Date.now());
    void this.ensureFresh();
  };
  private readonly timer = setInterval(() => {
    this.now.set(Date.now());
    if (document.visibilityState === 'visible') void this.ensureFresh();
  }, 60000);
  constructor() {
    effect(() => {
      this.auth.sessionRevision();
      const session = this.auth.getSession(),
        scope = session
          ? String(session.email) +
            '|' +
            String(session.idDoctor || '') +
            '|' +
            String(session.sessionId || '')
          : '';
      if (scope !== this.scope) {
        this.scope = scope;
        this.generation++;
        this.pending = null;
        this.state.set(null);
        this.canManage.set(false);
        this.lastChecked = 0;
      }
      if (scope) {
        const cached = this.gateway.peek('billing');
        if (cached?.entitlements) this.accept(cached.entitlements, cached.canManage, true);
        void this.ensureFresh();
      }
    });
    this.gateway.updates.subscribe(({ type, data }) => {
      if (type === 'billing') this.accept(data.entitlements, data.canManage, true);
    });
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('clinic-billing-refresh', this.update);
  }
  active(): boolean {
    const state = this.state();
    return !!state?.active && Date.parse(state.expiresAt || '') > this.now();
  }
  allows(feature: 'reports' | 'charts' | 'ai'): boolean {
    return this.active() && !!this.state()?.features[feature];
  }
  canCreate(module: UsageModule): boolean {
    const s = this.state();
    if (!s || this.error()) return false;
    const limit = this.active()
      ? s.limits[module]
      : { patients: 5, offices: 1, services: 3, employees: 1 }[module];
    return limit === null || s.usage[module] < limit;
  }
  accept(state: Entitlements, canManage?: boolean, fromGateway = false): void {
    if (!fromGateway)
      this.gateway.accept('billing', {
        entitlements: state,
        canManage: canManage ?? this.canManage(),
        version: '',
      });
    this.accepted++;
    this.lastChecked = Date.now();
    this.state.set(state);
    this.error.set('');
    this.now.set(Date.now());
    if (canManage !== undefined) this.canManage.set(canManage);
  }
  ensureFresh(): Promise<void> {
    if (Date.now() - this.lastChecked < SYNC_POLICY.billingFallbackMs) return Promise.resolve();
    return this.refresh();
  }
  refresh(): Promise<void> {
    if (!this.auth.getSession()) return Promise.resolve();
    if (this.pending) return this.pending;
    this.lastChecked = Date.now();
    const generation = this.generation,
      accepted = this.accepted;
    this.loading.set(true);
    const task = this.gateway
      .load(['billing'])
      .then((r) => {
        if (generation === this.generation && accepted === this.accepted)
          this.accept(r.resources.billing.entitlements, r.resources.billing.canManage, true);
      })
      .catch((e) => {
        if (generation === this.generation && accepted === this.accepted) {
          this.state.set(null);
          this.error.set(e.message);
        }
      })
      .finally(() => {
        if (generation === this.generation) {
          this.loading.set(false);
          this.pending = null;
        }
      });
    this.pending = task;
    return task;
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    window.removeEventListener('focus', this.onFocus);
    window.removeEventListener('clinic-billing-refresh', this.update);
  }
}
