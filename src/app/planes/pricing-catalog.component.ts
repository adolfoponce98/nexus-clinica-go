import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Plus,
  Settings2,
  Save,
  ArrowLeft,
  LoaderCircle,
  Package,
  Check,
  Info,
  TicketPercent,
} from 'lucide-angular';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import {
  PAYMENT_PROVIDERS,
  PRICE_PERIODS,
  emptyPrice,
  emptyProviderBinding,
} from './pricing-providers';
import { PaymentProviderBadgeComponent } from './payment-provider-badge.component';
@Component({
  selector: 'app-pricing-catalog',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, PaymentProviderBadgeComponent],
  templateUrl: './pricing-catalog.component.html',
  styleUrl: './pricing-catalog.component.css',
})
export class PricingCatalogComponent implements OnInit {
  private api = inject(ClinicApiService);
  readonly icons = {
    Plus,
    Settings2,
    Save,
    ArrowLeft,
    LoaderCircle,
    Package,
    Check,
    Info,
    TicketPercent,
  };
  readonly providers = PAYMENT_PROVIDERS;
  readonly environments = [
    { id: 'test', label: 'Pruebas' },
    { id: 'live', label: 'Producción' },
  ];
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  notice = signal('');
  products = signal<any[]>([]);
  coupons = signal<any[]>([]);
  savingCoupon = signal(false);
  couponError = signal('');
  couponNotice = signal('');
  couponForm = { couponId: '', title: '', description: '' };
  editCoupon(coupon: any) {
    this.couponForm = {
      couponId: coupon.couponId,
      title: coupon.title,
      description: coupon.description,
    };
    this.couponNotice.set('');
    this.couponError.set('');
  }
  async saveCoupon() {
    if (this.savingCoupon()) return;
    this.savingCoupon.set(true);
    this.couponError.set('');
    this.couponNotice.set('');
    try {
      const { coupon } = await this.api.post(API_URLS.SAVE_PRICING_COUPON, {
        coupon: { ...this.couponForm },
      });
      this.coupons.update((items) =>
        [...items.filter((item) => item.id !== coupon.id), coupon].sort((a, b) =>
          a.title.localeCompare(b.title, 'es'),
        ),
      );
      this.couponForm = { couponId: '', title: '', description: '' };
      this.couponNotice.set('Referencia guardada. El descuento se administra en Stripe.');
    } catch (error: any) {
      this.couponError.set(error.message);
    } finally {
      this.savingCoupon.set(false);
    }
  }
  environment = signal('test');
  selected: any = null;
  selectedProviders: string[] = [];
  selectedPeriods: string[] = [];
  benefitsText = '';
  ngOnInit() {
    void this.load();
  }
  async load() {
    if (this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.post(API_URLS.GET_PRICING_CATALOG, {});
      this.products.set(result.products || []);
      this.coupons.set(result.coupons || []);
      this.environment.set(result.environment || 'test');
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.loading.set(false);
    }
  }
  create() {
    this.edit({
      id: '',
      title: '',
      description: '',
      kind: 'subscription',
      credits: 100,
      active: true,
      benefits: [],
      limits: {},
      revision: 0,
      priceOptions: [],
    });
  }
  edit(product: any) {
    if (this.saving()) return;
    this.selected = structuredClone(product);
    this.selected.priceOptions ??= [];
    for (const price of this.selected.priceOptions) {
      price.providers ??= {};
      for (const provider of this.providers)
        price.providers[provider.id] = {
          test: { ...emptyProviderBinding(), ...price.providers[provider.id]?.test },
          live: { ...emptyProviderBinding(), ...price.providers[provider.id]?.live },
        };
    }
    this.selectedProviders = this.providers
      .filter((provider) =>
        this.selected.priceOptions.some(
          (price: any) =>
            price.providers[provider.id].test.enabled || price.providers[provider.id].live.enabled,
        ),
      )
      .map((p) => p.id);
    this.selectedPeriods = this.selected.priceOptions.flatMap((price: any) =>
      this.providers
        .filter(
          (provider) =>
            price.providers[provider.id].test.enabled || price.providers[provider.id].live.enabled,
        )
        .map((provider) => provider.id + ':' + price.period),
    );
    this.benefitsText = (product.benefits || []).join('\n');
    this.error.set('');
    this.notice.set('');
  }
  back() {
    if (!this.saving()) this.selected = null;
  }
  changeKind(kind: string) {
    if (this.selected.revision || this.selected.legacy) return;
    this.selected.kind = kind;
    this.selected.priceOptions = [];
    this.selectedProviders = [];
    this.selectedPeriods = [];
  }
  get periods() {
    return PRICE_PERIODS.filter((period) =>
      this.selected?.kind === 'credits' ? period.id === 'once' : period.id !== 'once',
    );
  }
  providerSelected(key: string) {
    return this.selectedProviders.includes(key);
  }
  periodSelected(key: string, period: string) {
    return this.selectedPeriods.includes(key + ':' + period);
  }
  productProviders(product: any) {
    return this.providers.filter((provider) =>
      (product.priceOptions || []).some(
        (price: any) =>
          price.providers?.[provider.id]?.test?.enabled ||
          price.providers?.[provider.id]?.live?.enabled,
      ),
    );
  }
  toggleProvider(key: string, checked: boolean) {
    if (checked) {
      this.selectedProviders = [...new Set([...this.selectedProviders, key])];
      if (!this.selected.priceOptions.some((p: any) => this.periodSelected(key, p.period)))
        this.togglePeriod(key, this.selected.kind === 'credits' ? 'once' : 'monthly', true);
    } else {
      this.selectedProviders = this.selectedProviders.filter((p) => p !== key);
      this.selectedPeriods = this.selectedPeriods.filter((value) => !value.startsWith(key + ':'));
      for (const price of this.selected.priceOptions)
        for (const environment of this.environments)
          price.providers[key][environment.id].enabled = false;
    }
  }
  togglePeriod(key: string, period: string, checked: boolean) {
    const token = key + ':' + period;
    this.selectedPeriods = checked
      ? [...new Set([...this.selectedPeriods, token])]
      : this.selectedPeriods.filter((value) => value !== token);
    let price = this.selected.priceOptions.find((p: any) => p.period === period);
    if (!price) {
      price = emptyPrice(period);
      this.selected.priceOptions.push(price);
    }
    if (checked) price.providers[key].test.enabled = true;
    else
      for (const environment of this.environments)
        price.providers[key][environment.id].enabled = false;
  }
  priceFor(period: string) {
    return this.selected.priceOptions.find((p: any) => p.period === period);
  }
  binding(key: string, period: string, environment: string) {
    return this.priceFor(period).providers[key][environment];
  }
  toCents(value: any) {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  }
  money(cents: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
      (cents || 0) / 100,
    );
  }
  summary(product: any) {
    return (
      (product.priceOptions || [])
        .filter((p: any) => p.active !== false)
        .map((p: any) => PRICE_PERIODS.find((period) => period.id === p.period)?.name || p.period)
        .join(' · ') || 'Sin periodos configurados'
    );
  }
  async save() {
    if (!this.selected || this.saving()) return;
    if (!this.selected.id) this.selected.id = 'p_' + crypto.randomUUID().replaceAll('-', '');
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const prices = this.selected.priceOptions.filter((price: any) =>
        this.providers.some(
          (provider) =>
            price.providers[provider.id].test.enabled || price.providers[provider.id].live.enabled,
        ),
      );
      const result = await this.api.post(API_URLS.SAVE_PRICING_PRODUCT, {
        product: {
          id: this.selected.id,
          title: this.selected.title,
          description: this.selected.description,
          kind: this.selected.kind,
          credits: Number(this.selected.credits),
          active: this.selected.active,
          benefits: this.benefitsText
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean),
          limits: this.selected.limits || {},
        },
        prices,
        expectedRevision: this.selected.revision || 0,
      });
      const product = result.product;
      this.products.update((items) => [...items.filter((p) => p.id !== product.id), product]);
      this.saving.set(false);
      this.edit(product);
      this.notice.set(
        'Producto guardado. Sus periodos ya están disponibles en Planes según el entorno y la pasarela configurados.',
      );
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.saving.set(false);
    }
  }
}
