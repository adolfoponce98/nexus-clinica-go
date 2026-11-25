import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BillingService, Entitlements } from './billing.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { AuthService } from '../auth/auth.service';
const free: Entitlements = {
  active: false,
  planId: 'FREE',
  planName: 'FREE',
  status: 'free',
  expiresAt: null,
  cancelAtPeriodEnd: false,
  limits: { patients: 5, offices: 1, services: 3, employees: 1 },
  usage: { patients: 5, offices: 1, services: 2, employees: 1 },
  features: { reports: false, charts: false, ai: false },
  aiCredits: 200,
};
function setup() {
  const api = {
      post: vi.fn(async () => ({
        success: true,
        entitlements: structuredClone(free),
        canManage: true,
      })),
    },
    auth = { sessionRevision: signal(0), getSession: () => ({ email: 'doctor' }) };
  TestBed.configureTestingModule({
    providers: [
      BillingService,
      { provide: ClinicApiService, useValue: api },
      { provide: AuthService, useValue: auth },
    ],
  });
  return { service: TestBed.inject(BillingService), api, auth };
}
describe('Authoritative billing state', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('shows remaining time through the grace end and expires access locally', () => {
    const { service } = setup();
    const day = 86400000,
      start = Date.now();
    service.accept({
      ...free,
      active: true,
      planName: 'Clínica Go Profesional',
      periodStartedAt: new Date(start).toISOString(),
      paidThrough: new Date(start + 30 * day).toISOString(),
      expiresAt: new Date(start + 33 * day).toISOString(),
      graceDays: 3,
    });
    service.now.set(start);
    expect(service.remainingPercent()).toBe(100);
    expect(service.remainingDays()).toBe(33);
    expect(service.inGracePeriod()).toBe(false);
    service.now.set(start + 31 * day);
    expect(service.inGracePeriod()).toBe(true);
    expect(service.remainingDays()).toBe(2);
    expect(service.remainingPercent()).toBeCloseTo((100 * 2) / 33);
    service.now.set(start + 33 * day);
    expect(service.active()).toBe(false);
    expect(service.remainingPercent()).toBe(0);
  });
  it('blocks premium features despite a positive credit balance on FREE', async () => {
    const { service } = setup();
    await service.refresh();
    expect(service.allows('ai')).toBe(false);
    expect(service.allows('charts')).toBe(false);
    expect(service.canCreate('patients')).toBe(false);
    expect(service.canCreate('offices')).toBe(false);
    expect(service.canCreate('services')).toBe(true);
  });
  it('expires paid access locally and restores FREE caps without waiting for a new login', () => {
    const { service } = setup();
    const expires = Date.now() + 1000;
    service.accept({
      ...free,
      active: true,
      expiresAt: new Date(expires).toISOString(),
      limits: { patients: null, offices: null, services: null, employees: null },
      features: { reports: true, charts: true, ai: true },
    });
    expect(service.allows('reports')).toBe(true);
    expect(service.canCreate('patients')).toBe(true);
    service.now.set(expires + 1);
    expect(service.allows('reports')).toBe(false);
    expect(service.canCreate('patients')).toBe(false);
  });
  it('coalesces concurrent refresh requests', async () => {
    const { service, api } = setup();
    await Promise.all([service.refresh(), service.refresh(), service.refresh()]);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('fails closed when server consumption cannot be verified and recovers on retry', async () => {
    const { service, api } = setup();
    await service.refresh();
    api.post.mockRejectedValueOnce(new Error('unavailable'));
    await service.refresh();
    expect(service.state()).toBeNull();
    expect(service.canCreate('services')).toBe(false);
    expect(service.error()).toBe('unavailable');
    await service.refresh();
    expect(service.canCreate('services')).toBe(true);
  });
  it('does not overwrite a newly verified balance with an older in-flight response', async () => {
    const { service, api } = setup();
    let finish!: (value: any) => void;
    api.post.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = service.refresh();
    service.accept({ ...free, aiCredits: 400 }, true);
    finish({ entitlements: free, canManage: true });
    await pending;
    expect(service.state()?.aiCredits).toBe(400);
  });

  it('keeps the local expiry clock running without polling billing every minute or on focus', async () => {
    vi.useFakeTimers();
    const { service, api, auth } = setup();
    await service.refresh();
    TestBed.tick();
    await Promise.resolve();
    api.post.mockClear();
    auth.sessionRevision.update((n) => n + 1);
    TestBed.tick();
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(29 * 60_000);
    expect(api.post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('refreshes immediately after a saved change even when the billing snapshot is fresh', async () => {
    const { service, api } = setup();
    await service.refresh();
    api.post.mockClear();
    window.dispatchEvent(new Event('clinic-billing-refresh'));
    await Promise.resolve();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
