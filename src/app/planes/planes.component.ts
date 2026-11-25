import { PaymentProviderBadgeComponent } from './payment-provider-badge.component';
import {
  LucideAngularModule,
  Crown,
  Gem,
  Sparkles,
  Zap,
  Check,
  ArrowUpRight,
  LoaderCircle,
  ShieldCheck,
  CreditCard,
  RefreshCw,
} from 'lucide-angular';
import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BillingService } from './billing.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [PaymentProviderBadgeComponent, CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './planes.component.html',
  styleUrl: './billing.css',
})
export class PlansComponent implements OnInit {
  readonly billing = inject(BillingService);
  private readonly api = inject(ClinicApiService);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly plans = signal<any[]>([]);
  readonly pending = signal<any>(null);
  readonly selected = signal<any>(null);
  readonly category = signal<'subscription' | 'credits'>('subscription');
  readonly selectedInterval = signal(1);
  readonly intervalOptions = signal([
    { months: 1, label: 'Mensual' },
    { months: 3, label: 'Trimestral' },
    { months: 6, label: 'Semestral' },
    { months: 12, label: 'Anual' },
  ]);
  readonly visiblePlans = computed(() =>
    this.plans().filter(
      (p) =>
        p.kind === this.category() &&
        (this.category() === 'credits' || this.months(p) === this.selectedInterval()),
    ),
  );
  months(plan: any) {
    return (plan.interval === 'year' ? 12 : 1) * (plan.intervalCount || 1);
  }
  readonly icons = {
    Crown,
    Gem,
    Sparkles,
    Zap,
    Check,
    ArrowUpRight,
    LoaderCircle,
    ShieldCheck,
    CreditCard,
    RefreshCw,
  };
  // Compare prices within the selected period and category, not annual totals against monthly ones.
  priceLevel(plan: any): number {
    const amount = Number(plan.amount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const prices = [
      ...new Set(
        this.visiblePlans()
          .map((item) => Number(item.amount))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    ].sort((a, b) => a - b);
    return Math.min(3, Math.max(0, prices.indexOf(amount)));
  }
  planIcon(plan: any) {
    const level = this.priceLevel(plan);
    return [plan.kind === 'credits' ? Zap : ShieldCheck, Sparkles, Crown, Gem][level];
  }
  private requestId = '';
  @ViewChild('confirmation') confirmation?: ElementRef<HTMLDialogElement>;
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.api.post(API_URLS.GETSUBSCRIPTIONS, {});
      this.plans.set(r.subscriptions || []);
      this.pending.set(r.pendingCheckout);
      this.billing.accept(r.entitlements, r.canManage);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }
  money(cents: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
      (cents || 0) / 100,
    );
  }
  period(p: any) {
    if (p.kind === 'credits') return 'Pago único · sin vencimiento';
    const count = p.intervalCount || 1;
    const months = this.months(p);
    const labels: Record<number, string> = {
      1: 'Mensual',
      3: 'Trimestral',
      6: 'Semestral',
      12: 'Anual',
    };
    if (['month', 'year'].includes(p.interval) && labels[months])
      return (
        labels[months] + ' · cobro ' + (months === 1 ? 'cada mes' : 'cada ' + months + ' meses')
      );
    const units: Record<string, string[]> = {
      day: ['día', 'días'],
      week: ['semana', 'semanas'],
      month: ['mes', 'meses'],
      year: ['año', 'años'],
    };
    return 'Cada ' + count + ' ' + (units[p.interval]?.[count === 1 ? 0 : 1] || p.interval);
  }

  unavailableMessage(plan: any): string {
    if (plan.configurationErrorCode === 'STRIPE_AMOUNT_MISMATCH') return plan.configurationError;
    if (plan.configurationErrorCode === 'NO_CHECKOUT_PROVIDER')
      return 'Proveedor configurado. El cobro por esta opción estará disponible cuando se conecte su integración.';
    if (plan.configurationErrorCode === 'CREDIT_AMOUNT_NOT_CONFIGURED') {
      return 'Esta recarga no tiene configurada la cantidad de créditos que incluye. Contacta a soporte.';
    }
    return plan.kind === 'credits'
      ? 'No se pudo verificar esta recarga. Actualiza las opciones o contacta a soporte.'
      : 'No se pudo verificar este plan. Actualiza las opciones o contacta a soporte.';
  }
  choose(p: any) {
    if (this.busy() || !p.available || !this.billing.canManage()) return;
    this.error.set('');
    this.selected.set(p);
    this.requestId = crypto.randomUUID();
    this.confirmation?.nativeElement.showModal();
  }
  close() {
    if (!this.busy()) this.confirmation?.nativeElement.close();
  }
  async checkout() {
    const p = this.selected();
    if (!p || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await this.api.post(API_URLS.CREATESTRIPECHECKOUTSESSION, {
        planId: p.id,
        requestId: this.requestId,
      });
      this.openStripe(r.url, 'checkout.stripe.com');
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async resume() {
    const p = this.pending();
    if (!p || this.busy()) return;
    if (p.url) {
      this.openStripe(p.url, 'checkout.stripe.com');
      return;
    }
    this.selected.set(this.plans().find((x) => x.id === p.planId));
    this.requestId = p.requestId;
    await this.checkout();
  }
  async portal() {
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await this.api.post(API_URLS.CREATE_STRIPE_BILLING_PORTAL, {});
      this.openStripe(r.url, 'billing.stripe.com');
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  private openStripe(value: string, host: string) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== host)
      throw new Error('Enlace de pago no válido.');
    window.location.assign(url.href);
  }
}
