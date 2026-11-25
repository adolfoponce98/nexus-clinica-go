import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlansComponent } from './planes.component';
import { BillingService } from './billing.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';

describe('Credit top-ups for all account plans', () => {
  function setup(active: boolean) {
    const plan = {
      id: 'creditos',
      kind: 'credits',
      title: 'Recarga IA',
      aiCredits: 100,
      amount: 500,
      available: true,
      taxBehavior: 'inclusive',
      benefits: [],
    };
    const billing = {
      active: () => active,
      canManage: signal(true),
      state: signal({ planName: active ? 'Profesional' : 'FREE', aiCredits: 7 }),
      accept: vi.fn(),
    };
    const api = { post: vi.fn().mockResolvedValue({ subscriptions: [plan], canManage: true }) };
    TestBed.configureTestingModule({
      providers: [
        { provide: BillingService, useValue: billing },
        { provide: ClinicApiService, useValue: api },
        { provide: Router, useValue: {} },
      ],
    });
    const c = TestBed.runInInjectionContext(() => new PlansComponent());
    c.confirmation = { nativeElement: { showModal: vi.fn(), close: vi.fn() } } as any;
    return { c, api, plan };
  }
  for (const paid of [false, true])
    it(`allows an owner to select and submit a credit purchase regardless of subscription: ${paid}`, async () => {
      const { c, api, plan } = setup(paid);
      await c.load();
      c.category.set('credits');
      expect(c.visiblePlans()).toEqual([plan]);
      c.choose(plan);
      expect(c.selected()).toBe(plan);
      expect(c.confirmation!.nativeElement.showModal).toHaveBeenCalled();
      const open = vi.spyOn(c as any, 'openStripe').mockImplementation(() => {});
      api.post.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/c/test' });
      await c.checkout();
      expect(api.post).toHaveBeenLastCalledWith(API_URLS.CREATESTRIPECHECKOUTSESSION, {
        planId: 'creditos',
        requestId: expect.any(String),
      });
      expect(open).toHaveBeenCalled();
    });
  it('defaults to monthly and only offers the four billing periods', () => {
    const { c } = setup(false);
    c.plans.set([
      { id: 'monthly', kind: 'subscription', interval: 'month', intervalCount: 1, amount: 88900 },
      { id: 'annual', kind: 'subscription', interval: 'month', intervalCount: 12, amount: 889000 },
    ]);
    expect(c.selectedInterval()).toBe(1);
    expect(c.intervalOptions().map((p) => p.months)).toEqual([1, 3, 6, 12]);
    expect(c.visiblePlans().map((p) => p.id)).toEqual(['monthly']);
    c.selectedInterval.set(12);
    expect(c.visiblePlans().map((p) => p.id)).toEqual(['annual']);
  });
  it('uses progressively distinct icons for higher prices and preserves equal-price levels', () => {
    const { c } = setup(false);
    const plans = [100, 200, 300, 400, 200].map((amount, index) => ({
      id: String(index),
      kind: 'subscription',
      interval: 'month',
      amount,
    }));
    c.plans.set(plans);
    expect(plans.map((p) => c.priceLevel(p))).toEqual([0, 1, 2, 3, 1]);
    expect(new Set(plans.slice(0, 4).map((p) => c.planIcon(p))).size).toBe(4);
  });
  it('explains missing credit configuration without claiming the feature is unavailable', () => {
    const { c } = setup(false);
    expect(
      c.unavailableMessage({
        kind: 'credits',
        configurationErrorCode: 'CREDIT_AMOUNT_NOT_CONFIGURED',
      }),
    ).toContain('cantidad de créditos');
  });
});

describe('Catalog price validation messages', () => {
  it('shows the server price difference instead of a generic failure', () => {
    const message = 'El catálogo indica 100.00 MXN y el precio de Stripe indica 25.00 MXN.';
    expect(
      PlansComponent.prototype.unavailableMessage({
        configurationErrorCode: 'STRIPE_AMOUNT_MISMATCH',
        configurationError: message,
      }),
    ).toBe(message);
  });
});
