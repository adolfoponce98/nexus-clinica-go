import { LucideAngularModule, Users, Building2, Stethoscope, ArrowUpRight } from 'lucide-angular';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BillingService, UsageModule } from './billing.service';
@Component({
  selector: 'app-plan-usage',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `@if (compact()) {
      <aside class="compact-usage" aria-live="polite">
        <span class="compact-icon"><lucide-icon [img]="moduleIcons[module()]" [size]="18" /></span>
        <div>
          <strong>{{ labels[module()] }}</strong
          ><span>
            @if (billing.state()) {
              {{ billing.active() ? billing.state()?.planName : 'FREE' }} ·
              <b
                >{{ billing.state()!.usage[module()] }} /
                {{
                  billing.active()
                    ? (billing.state()!.limits[module()] ?? 'Sin límite')
                    : limits[module()]
                }}</b
              >
              usados
            } @else {
              {{ billing.error() ? 'Consumo no disponible' : 'Consultando consumo…' }}
            }
          </span>
        </div>
        @if (billing.error()) {
          <button type="button" (click)="billing.refresh()">Reintentar</button>
        } @else if (!billing.active()) {
          <a routerLink="/planes" aria-label="Ver planes"
            ><lucide-icon [img]="arrow" [size]="16"
          /></a>
        }
      </aside>
    } @else {
      <aside class="usage" aria-live="polite">
        <span class="badge">{{ billing.active() ? billing.state()?.planName : 'FREE' }}</span>
        <div>
          <strong>{{ labels[module()] }}</strong>
          @if (billing.state()) {
            <span>
              {{ billing.state()!.usage[module()] }} /
              {{
                billing.active()
                  ? (billing.state()!.limits[module()] ?? 'Sin límite')
                  : limits[module()]
              }}
              usados en toda la cuenta</span
            >
          } @else {
            <span>{{
              billing.error() ? 'No se pudo consultar el consumo.' : 'Consultando consumo…'
            }}</span>
          }
        </div>
        @if (!billing.active()) {
          <a routerLink="/planes">Ver planes ↗</a>
        }
        @if (billing.error()) {
          <button type="button" (click)="billing.refresh()">Reintentar</button>
        }
      </aside>
    }`,
  styles: [
    `
      .usage {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding: 14px 18px;
        border: 1px solid var(--border-color);
        border-radius: 18px;
        background: var(--bg-secondary);
        color: var(--text-main);
        margin: 0 0 20px;
        font-size: 12px;
      }
      .badge {
        padding: 6px 10px;
        background: #0ea5e91a;
        color: #0284c7;
        border-radius: 10px;
        font-weight: 800;
      }
      .usage div {
        flex: 1;
      }
      .usage span:not(.badge) {
        display: block;
        color: var(--text-muted);
        margin-top: 3px;
      }
      a,
      button {
        color: #0284c7;
        font-weight: 700;
      }
      .compact-usage {
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 310px;
        padding: 11px 13px;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 15px;
        background: var(--bg-primary, #f8fafc);
        color: var(--text-main, #172033);
      }
      .compact-icon {
        display: grid;
        place-items: center;
        width: 35px;
        height: 35px;
        border-radius: 11px;
        background: #3b82f610;
        color: #458ac8;
        flex-shrink: 0;
      }
      .compact-usage > div {
        min-width: 0;
      }
      .compact-usage strong {
        font-size: 11px;
        display: block;
      }
      .compact-usage div > span {
        display: block;
        font-size: 9px;
        line-height: 1.7;
        color: var(--text-muted, #64748b);
        margin-top: 3px;
      }
      .compact-usage b {
        color: #458ac8;
        font-weight: 750;
      }
      .compact-usage a {
        display: grid;
        place-items: center;
        padding: 7px;
        border-radius: 9px;
        color: #458ac8;
        background: #3b82f60a;
      }
      .compact-usage button {
        font-size: 9px;
      }
      :host {
        display: block;
      }
    `,
  ],
})
export class PlanUsageComponent {
  readonly compact = input(false);
  readonly moduleIcons = {
    patients: Users,
    offices: Building2,
    services: Stethoscope,
    employees: Users,
  };
  readonly arrow = ArrowUpRight;
  readonly billing = inject(BillingService);
  readonly module = input.required<UsageModule>();
  readonly labels = {
    patients: 'Pacientes',
    offices: 'Consultorios',
    services: 'Servicios',
    employees: 'Empleados activos',
  };
  readonly limits = { patients: 5, offices: 1, services: 3, employees: 1 };
}
