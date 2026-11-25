import { Component, Input } from '@angular/core';
import { PAYMENT_PROVIDERS } from './pricing-providers';
@Component({
  selector: 'app-payment-provider-badge',
  standalone: true,
  template: `<img
    [class.stripe]="provider === 'stripe'"
    [src]="'/assets/payments/' + provider + '.svg'"
    [alt]="name"
    [title]="name"
  />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    img.stripe {
      width: 68px;
    }
    img {
      width: 96px;
      height: 28px;
      object-fit: contain;
      object-position: left center;
    }
  `,
})
export class PaymentProviderBadgeComponent {
  @Input() provider = 'stripe';
  get name() {
    return PAYMENT_PROVIDERS.find((p) => p.id === this.provider)?.name || this.provider;
  }
}
