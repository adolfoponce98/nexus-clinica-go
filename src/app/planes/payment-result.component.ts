import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { BillingService } from './billing.service';
@Component({
  standalone: true,
  imports: [RouterLink],
  styleUrl: './billing.css',
  template: `<main class="billing-page">
    <section class="panel result" aria-live="polite">
      <div class="result-icon">
        {{ status() === 'success' ? '✓' : status() === 'checking' ? '◌' : '◈' }}
      </div>
      <h1>{{ title() }}</h1>
      <p>{{ message() }}</p>
      @if (status() === 'checking') {
        <p role="status">Consultando el estado real con Stripe…</p>
      }
      @if (error()) {
        <p role="alert" class="error">{{ error() }}</p>
      }
      <div class="actions">
        <a routerLink="/planes">Volver a planes</a>
        @if (status() !== 'checking' && status() !== 'success') {
          <button (click)="check()">Comprobar nuevamente</button>
        }
      </div>
    </section>
  </main>`,
})
export class PaymentResultComponent implements OnInit, OnDestroy {
  private readonly api = inject(ClinicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly billing = inject(BillingService);
  readonly status = signal('checking');
  readonly title = signal('Verificando tu pago');
  readonly message = signal('Espera mientras confirmamos la operación.');
  readonly error = signal('');
  private timer: any;
  private attempts = 0;
  private destroyed = false;
  ngOnInit() {
    void this.check();
  }
  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.timer);
  }
  async check() {
    clearTimeout(this.timer);
    this.status.set('checking');
    this.error.set('');
    const p = this.route.snapshot.queryParamMap;
    try {
      const r = await this.api.post(API_URLS.GET_STRIPE_CHECKOUT_RESULT, {
        requestId: p.get('request_id'),
        sessionId: p.get('session_id'),
        outcome: p.get('outcome'),
      });
      if (this.destroyed) return;
      this.billing.accept(r.entitlements);
      this.status.set(r.status || 'processing');
      if (r.status === 'success') {
        this.title.set('Pago confirmado');
        this.message.set(
          r.kind === 'credits'
            ? `Se añadieron ${r.credits} créditos IA a tu cuenta, sin vencimiento.`
            : r.entitlements?.active
              ? 'Tu suscripción está activa. Ya puedes utilizar sus funciones.'
              : 'El pago está confirmado. La suscripción se está sincronizando; consulta Planes para ver su estado.',
        );
      } else if (r.status === 'canceled') {
        this.title.set('Pago cancelado');
        this.message.set(
          'La sesión de pago está cerrada. Puedes volver a Planes e iniciar otra cuando lo necesites.',
        );
      } else if (r.status === 'failed') {
        this.title.set('El pago no se completó');
        this.message.set(
          'Stripe no confirmó este pago. Revisa tu método de pago y vuelve a intentarlo desde Planes.',
        );
      } else if (r.status === 'refunded') {
        this.title.set('Pago reembolsado');
        this.message.set(
          'Esta operación se registra como reembolsada. Consulta el saldo actual en Planes.',
        );
      } else {
        this.title.set('Pago pendiente de confirmación');
        this.message.set('Aún no hay confirmación de pago. No necesitas iniciar otra compra.');
        if (++this.attempts < 8) this.timer = setTimeout(() => void this.check(), 3000);
      }
    } catch (e: any) {
      if (this.destroyed) return;
      this.status.set('error');
      this.title.set('No pudimos verificar el pago');
      this.message.set(
        'El enlace por sí solo no acredita un pago. Comprueba nuevamente su estado.',
      );
      this.error.set(e.message);
    }
  }
}
