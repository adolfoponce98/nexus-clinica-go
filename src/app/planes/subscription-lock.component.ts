import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  LockKeyhole,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-angular';
@Component({
  selector: 'app-subscription-lock',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `<div class="feature-shell" [class.is-locked]="locked()">
    <div
      class="feature-content"
      [attr.inert]="locked() ? '' : null"
      [attr.aria-hidden]="locked() ? 'true' : null"
    >
      <ng-content />
    </div>
    @if (locked()) {
      <div class="lock-veil">
        <section class="lock-message" role="group" [attr.aria-label]="title()">
          <div class="lock-symbol">
            <lucide-icon [img]="icons.LockKeyhole" [size]="22" /><span
              ><lucide-icon [img]="icons.Sparkles" [size]="12"
            /></span>
          </div>
          <p class="premium-label">
            <lucide-icon [img]="icons.ShieldCheck" [size]="13" /> INCLUIDO CON TU SUSCRIPCIÓN
          </p>
          <h3>{{ title() }}</h3>
          <p class="lock-description">{{ description() }}</p>
          <a routerLink="/planes"
            >Conocer planes<lucide-icon [img]="icons.ArrowUpRight" [size]="16"
          /></a>
        </section>
      </div>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .feature-shell {
        position: relative;
        isolation: isolate;
        border-radius: 24px;
      }
      .is-locked {
        overflow: clip;
        min-height: 340px;
      }
      .is-locked > .feature-content {
        pointer-events: none;
        user-select: none;
        filter: blur(0.5px);
        opacity: 0.7;
      }
      .lock-veil {
        position: absolute;
        inset: 0;
        z-index: 1;
        padding: 20px;
        background: color-mix(in srgb, var(--bg-primary) 30%, transparent);
        backdrop-filter: blur(1px);
        border: 1px solid var(--border-color);
        border-radius: inherit;
      }
      .lock-message {
        position: sticky;
        top: 100px;
        width: min(100%, 350px);
        margin: 26px auto;
        padding: 22px;
        text-align: center;
        border: 1px solid color-mix(in srgb, var(--border-color) 75%, #60a5fa);
        border-radius: 22px;
        background: color-mix(in srgb, var(--bg-secondary) 90%, transparent);
        box-shadow: 0 16px 44px #02061720;
        color: var(--text-main);
      }
      .lock-symbol {
        position: relative;
        display: grid;
        place-items: center;
        margin: 0 auto 12px;
        width: 48px;
        height: 48px;
        border-radius: 16px;
        color: #60a5fa;
        background: linear-gradient(135deg, #3b82f622, #6366f122);
        border: 1px solid #3b82f633;
      }
      .lock-symbol span {
        position: absolute;
        right: -4px;
        bottom: -3px;
        border-radius: 7px;
        padding: 4px;
        background: var(--bg-secondary);
        color: #a78bfa;
      }
      .premium-label {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 5px;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 1px;
        color: #60a5fa;
        margin-bottom: 8px;
      }
      h3 {
        font-size: 16px;
        font-weight: 850;
        line-height: 1.3;
      }
      .lock-description {
        font-size: 11px;
        line-height: 1.6;
        color: var(--text-muted);
        margin: 9px 0 15px;
      }
      a {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 12px;
        background: linear-gradient(110deg, #2563eb, #6366f1);
        color: white;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 5px 16px #2563eb25;
      }
      @media (prefers-reduced-motion: reduce) {
        * {
          scroll-behavior: auto;
        }
      }
    `,
  ],
})
export class SubscriptionLockComponent {
  readonly locked = input(false);
  readonly title = input('Descubre todo el potencial de tu clínica');
  readonly description = input(
    'Activa una suscripción para utilizar este módulo y acompañar el crecimiento de tu práctica.',
  );
  readonly icons = { LockKeyhole, Sparkles, ArrowUpRight, ShieldCheck };
}
