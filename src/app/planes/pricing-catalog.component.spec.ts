import { TestBed } from '@angular/core/testing';
import { PricingCatalogComponent } from './pricing-catalog.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { pricingOwnerGuard } from '../app.routes';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { Router } from '@angular/router';

function setup() {
  const api = { post: vi.fn().mockResolvedValue({ products: [], environment: 'test' }) };
  TestBed.configureTestingModule({ providers: [{ provide: ClinicApiService, useValue: api }] });
  const component = TestBed.runInInjectionContext(() => new PricingCatalogComponent());
  return { component, api };
}

describe('Pricing catalog editor', () => {
  it('loads existing products and exposes all eight provider choices', async () => {
    const { component: c } = setup();
    await c.load();
    expect(c.loading()).toBe(false);
    expect(c.providers.map((p) => p.id)).toEqual([
      'stripe',
      'oxxo',
      'mercadopago',
      'openpay',
      'stp',
      'spei',
      'clip',
      'conekta',
    ]);
  });
  it('selects periods separately by provider and retains independent test/live prices', () => {
    const { component: c } = setup();
    c.create();
    c.toggleProvider('stripe', true);
    c.togglePeriod('stripe', 'annual', true);
    c.binding('stripe', 'monthly', 'test').amountCents = 1000;
    c.binding('stripe', 'monthly', 'live').amountCents = 2000;
    c.binding('stripe', 'monthly', 'test').enabled = false;
    expect(c.periodSelected('stripe', 'monthly')).toBe(true);
    expect(c.binding('stripe', 'monthly', 'live').amountCents).toBe(2000);
    expect(c.periodSelected('stripe', 'annual')).toBe(true);
    expect(c.toCents(12.34)).toBe(1234);
  });
  it('credit packages offer only a one-time period and store the configured credit quantity', async () => {
    const { component: c, api } = setup();
    c.create();
    c.changeKind('credits');
    c.selected.title = '200 créditos';
    c.selected.credits = 200;
    c.toggleProvider('stripe', true);
    expect(c.periods.map((p) => p.id)).toEqual(['once']);
    api.post.mockRejectedValueOnce(new Error('Prueba sin guardar'));
    await c.save();
    expect(api.post).toHaveBeenCalledWith(
      API_URLS.SAVE_PRICING_PRODUCT,
      expect.objectContaining({
        product: expect.objectContaining({ credits: 200, kind: 'credits' }),
        prices: [expect.objectContaining({ period: 'once' })],
      }),
    );
    expect(c.selected.credits).toBe(200);
    expect(c.error()).toBe('Prueba sin guardar');
  });
  it('preserves optimistic revisions and ignores double submission while saving', async () => {
    const { component: c, api } = setup();
    c.create();
    c.toggleProvider('stripe', true);
    let finish!: (value: any) => void;
    api.post.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = c.save();
    await c.save();
    expect(api.post).toHaveBeenCalledTimes(1);
    const product = { ...c.selected, id: 'saved', revision: 1 };
    finish({ product });
    await pending;
    expect(c.selected.revision).toBe(1);
    expect(c.notice()).toContain('guardado');
    expect(c.saving()).toBe(false);
  });
  it('lists only providers actually configured on each product', () => {
    const { component: c } = setup();
    c.create();
    c.toggleProvider('stripe', true);
    expect(c.productProviders(c.selected).map((p) => p.id)).toEqual(['stripe']);
  });
});

describe('Temporary pricing owner access', () => {
  for (const [session, allowed] of [
    [{ typeUser: 1, email: 'owner@example.test' }, true],
    [{ typeUser: 2, idDoctor: 'owner@example.test' }, false],
  ] as const) {
    it('checks the primary account role before opening the editor: ' + allowed, () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: AuthService, useValue: { getSession: () => session } },
          { provide: PermissionService, useValue: { firstRoute: () => '/calendario' } },
          { provide: Router, useValue: { createUrlTree: () => '/calendario' } },
        ],
      });
      expect(TestBed.runInInjectionContext(() => pricingOwnerGuard({} as any, {} as any))).toBe(
        allowed ? true : '/calendario',
      );
    });
  }
});

describe('Internal coupon references', () => {
  it('loads and saves title, description and coupon ID through the internal endpoint', async () => {
    const { component: c, api } = setup();
    const coupon = {
      id: 'test_1',
      couponId: 'coupon_test',
      title: 'Bienvenida',
      description: '20% de descuento',
      environment: 'test',
    };
    api.post.mockResolvedValueOnce({ products: [], coupons: [coupon], environment: 'test' });
    await c.load();
    expect(c.coupons()).toEqual([coupon]);
    c.editCoupon(coupon);
    c.couponForm.title = 'Bienvenida actualizada';
    api.post.mockResolvedValueOnce({ coupon: { ...coupon, title: c.couponForm.title } });
    await c.saveCoupon();
    expect(api.post).toHaveBeenLastCalledWith(API_URLS.SAVE_PRICING_COUPON, {
      coupon: {
        couponId: 'coupon_test',
        title: 'Bienvenida actualizada',
        description: '20% de descuento',
      },
    });
    expect(c.coupons()).toHaveLength(1);
    expect(c.couponForm.couponId).toBe('');
    expect(c.savingCoupon()).toBe(false);
  });
  it('retains the form when saving fails', async () => {
    const { component: c, api } = setup();
    c.couponForm = { couponId: 'id', title: 'Título', description: 'Descripción' };
    api.post.mockRejectedValueOnce(new Error('No se pudo guardar'));
    await c.saveCoupon();
    expect(c.couponError()).toBe('No se pudo guardar');
    expect(c.couponForm.couponId).toBe('id');
    expect(c.savingCoupon()).toBe(false);
  });
});
