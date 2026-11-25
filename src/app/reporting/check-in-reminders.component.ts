import { LucideAngularModule, X, Trash2, Bell } from 'lucide-angular';
import { PermissionDirective } from '../auth/permission.directive';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AppointmentHistoryService } from '../appointment-history/appointment-history.service';
import { localDateKey } from '../appointment-history/appointment-history.utils';
import { API_URLS } from '../config/api-urls';
import { ClinicApiService } from './clinic-api.service';
import { pendingCheckIns, reminderId, soundBucket } from './check-in.utils';
import { SYNC_POLICY } from '../config/sync-policy';

@Component({
  selector: 'app-check-in-reminders',
  standalone: true,
  imports: [PermissionDirective, CommonModule, LucideAngularModule],
  template: ` @if (queue().length && closed()) {
      <button
        type="button"
        (click)="closed.set(false)"
        class="fixed right-4 bottom-4 z-[65] flex items-center gap-2 rounded-2xl border shadow-lg px-4 py-3 text-xs font-bold"
        style="background:var(--bg-secondary);border-color:var(--border-color);color:var(--text-main)"
      >
        <lucide-icon [img]="icons.Bell" [size]="16" />Check-in pendientes · {{ queue().length }}
      </button>
    }
    @if (queue().length && !closed()) {
      <aside
        aria-label="Check-in de pacientes"
        class="fixed right-4 bottom-4 z-[65] w-96 max-w-[calc(100vw-2rem)] rounded-3xl border shadow-2xl p-4 space-y-3"
        style="background:var(--bg-secondary);border-color:var(--border-color);color:var(--text-main)"
      >
        <div class="flex justify-between items-center gap-2">
          <h2 class="font-black text-sm">Check-in pendiente · {{ queue().length }}</h2>
          <button
            type="button"
            (click)="refresh()"
            [disabled]="!!busy()"
            class="text-xs text-blue-500 disabled:opacity-50"
          >
            Actualizar</button
          ><button
            type="button"
            (click)="close()"
            [disabled]="!!busy()"
            aria-label="Cerrar check-in"
            class="p-2 rounded-xl border disabled:opacity-50"
            style="border-color:var(--border-color)"
          >
            <lucide-icon [img]="icons.X" [size]="16" />
          </button>
        </div>
        <p class="text-xs" style="color:var(--text-muted)">
          Confirma si el paciente asistió. Puedes cerrar el panel o limpiar los avisos actuales sin
          cambiar la asistencia.
        </p>
        @if (soundBlocked()) {
          <button type="button" (click)="enableSound()" class="text-xs text-blue-500 font-bold">
            Activar sonido de recordatorios
          </button>
        }
        @if (error()) {
          <p role="status" class="text-xs text-amber-500">{{ error() }}</p>
        }
        @if (clearRequested()) {
          <div
            class="rounded-2xl border p-3 space-y-3"
            style="border-color:var(--border-color);background:var(--bg-primary)"
          >
            <p class="text-xs">
              Los avisos actuales ya no se mostrarán en este dispositivo, incluso al recargar. La
              asistencia no se modificará y las citas nuevas seguirán notificándose.
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                (click)="clearAlerts()"
                [disabled]="!!busy()"
                class="rounded-xl bg-blue-600 text-white text-xs px-3 py-2 disabled:opacity-50"
              >
                Limpiar alertas</button
              ><button type="button" (click)="clearRequested.set(false)" class="text-xs px-3 py-2">
                Cancelar
              </button>
            </div>
          </div>
        }
        <div class="space-y-3 overflow-y-auto max-h-[min(50dvh,28rem)]" aria-live="polite">
          @for (item of queue(); track id(item)) {
            <article
              [attr.aria-busy]="busy() === id(item)"
              class="p-3 border rounded-2xl space-y-2"
              style="border-color:var(--border-color);background:var(--bg-primary)"
            >
              <h3 class="text-sm font-bold break-words">
                {{ item.patientName || item.name || 'Paciente' }}
              </h3>
              <p class="text-xs">
                {{ item.date }} · {{ item.time }}{{ item.endTime ? ' a ' + item.endTime : '' }}
              </p>
              <p class="text-xs break-words" style="color:var(--text-muted)">{{ item.reason }}</p>
              <div class="flex gap-2">
                <button
                  type="button"
                  [appPermissionDisabled]="!!busy()"
                  (click)="confirm(item, 3)"
                  class="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white disabled:opacity-50"
                  appPermission="calendar:write"
                >
                  Sí asistió</button
                ><button
                  type="button"
                  [appPermissionDisabled]="!!busy()"
                  (click)="confirm(item, 4)"
                  class="flex-1 py-2 rounded-xl text-xs font-bold border disabled:opacity-50"
                  style="border-color:var(--border-color)"
                  appPermission="calendar:write"
                >
                  No asistió
                </button>
              </div>
              @if (busy() === id(item)) {
                <p
                  role="status"
                  class="flex items-center justify-center gap-2 py-1 text-xs font-semibold"
                  style="color:var(--text-muted)"
                >
                  <span
                    aria-hidden="true"
                    class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                  ></span>
                  Guardando asistencia…
                </p>
              }
            </article>
          }
        </div>
        <div
          class="flex items-center justify-between gap-3 border-t pt-3"
          style="border-color:var(--border-color)"
        >
          <button
            type="button"
            (click)="clearRequested.set(true)"
            [disabled]="!!busy()"
            class="flex items-center gap-2 text-xs font-bold text-blue-500 disabled:opacity-50"
          >
            <lucide-icon [img]="icons.Trash2" [size]="15" />Limpiar alertas</button
          ><button
            type="button"
            (click)="close()"
            [disabled]="!!busy()"
            class="text-xs font-bold px-3 py-2 rounded-xl border disabled:opacity-50"
            style="border-color:var(--border-color)"
          >
            Cerrar
          </button>
        </div>
      </aside>
    }`,
})
export class CheckInRemindersComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly history = inject(AppointmentHistoryService);
  private readonly api = inject(ClinicApiService);
  private readonly subs = new Subscription();
  private interval?: ReturnType<typeof setInterval>;
  private poll?: ReturnType<typeof setInterval>;
  private request?: AbortController;
  private serial = 0;
  private items: any[] = [];
  private sounded: Record<string, number> = {};
  private key = '';
  readonly queue = signal<any[]>([]);
  readonly busy = signal('');
  readonly error = signal('');
  readonly soundBlocked = signal(false);
  readonly id = reminderId;
  readonly icons = { X, Trash2, Bell };
  readonly closed = signal(false);
  readonly clearRequested = signal(false);
  private dismissed = new Set<string>();
  private dismissalId(a: any): string {
    return JSON.stringify([
      a.appointmentId || '',
      reminderId(a),
      a.patientName || a.name || '',
      a.phone || '',
    ]);
  }
  close(): void {
    if (!this.busy()) {
      this.closed.set(true);
      this.clearRequested.set(false);
    }
  }
  clearAlerts(): void {
    if (this.busy()) return;
    for (const item of this.queue()) this.dismissed.add(this.dismissalId(item));
    this.clearRequested.set(false);
    this.tick();
  }
  private lastRefresh = 0;
  private focus = () => {
    if (Date.now() - this.lastRefresh >= SYNC_POLICY.appointmentFallbackMs) void this.refresh();
    this.tick();
  };
  ngOnInit(): void {
    this.restore();
    this.tick();
    void this.refresh();
    this.subs.add(
      this.auth.branchChanged$.subscribe(() => {
        this.request?.abort();
        this.restore();
        this.tick();
        void this.refresh();
      }),
    );
    this.subs.add(
      this.auth.appointmentsUpdated$.subscribe(() => {
        const merged = new Map(this.items.map((a) => [reminderId(a), a]));
        for (const a of this.auth.getCachedAppointments()) {
          const old = merged.get(reminderId(a));
          if (
            (a.date === localDateKey() || old) &&
            (!old ||
              String(a.updatedAt || '') > String(old.updatedAt || '') ||
              ([3, 4, 2].includes(Number(a.status)) && ![3, 4, 2].includes(Number(old.status))))
          )
            merged.set(reminderId(a), a);
        }
        this.items = [...merged.values()];
        this.tick();
      }),
    );
    this.interval = setInterval(() => this.tick(), 15000);
    this.poll = setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - this.lastRefresh >= SYNC_POLICY.appointmentFallbackMs
      )
        void this.refresh();
    }, SYNC_POLICY.appointmentFallbackMs);
    window.addEventListener('focus', this.focus);
  }
  ngOnDestroy(): void {
    this.serial++;
    this.request?.abort();
    this.subs.unsubscribe();
    clearInterval(this.interval);
    clearInterval(this.poll);
    window.removeEventListener('focus', this.focus);
  }
  private restore(): void {
    this.serial++;
    this.busy.set('');
    this.error.set('');
    this.sounded = {};
    this.items = [];
    this.dismissed = new Set();
    this.closed.set(false);
    this.clearRequested.set(false);
    this.key =
      'nexus-check-in:v1:' + JSON.stringify([this.auth.getSession()?.email, this.api.branchId()]);
    try {
      const saved = JSON.parse(localStorage.getItem(this.key) || '{}');
      this.items = Array.isArray(saved.items) ? saved.items : [];
      this.sounded = saved.sounded || {};
      this.dismissed = new Set(Array.isArray(saved.dismissed) ? saved.dismissed : []);
    } catch {}
    const merged = new Map(this.items.map((a) => [reminderId(a), a]));
    for (const a of this.auth.getCachedAppointments()) {
      const old = merged.get(reminderId(a));
      if (
        (a.date === localDateKey() || old) &&
        (!old ||
          String(a.updatedAt || '') > String(old.updatedAt || '') ||
          ([3, 4, 2].includes(Number(a.status)) && ![3, 4, 2].includes(Number(old.status))))
      )
        merged.set(reminderId(a), a);
    }
    this.items = [...merged.values()];
  }
  private persist(): void {
    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({
          items: this.queue(),
          sounded: this.sounded,
          dismissed: [...this.dismissed],
        }),
      );
    } catch {
      this.error.set('No se pudo guardar la lista local de check-in.');
    }
  }
  tick(now = Date.now()): void {
    const previous = new Set(this.queue().map((a) => this.dismissalId(a)));
    const queue = pendingCheckIns(this.items, now).filter(
      (a) => !this.dismissed.has(this.dismissalId(a)),
    );
    if (queue.some((a) => !previous.has(this.dismissalId(a)))) this.closed.set(false);
    this.queue.set(queue);
    let ring = false;
    for (const a of queue) {
      const bucket = soundBucket(a, now),
        id = reminderId(a);
      if (bucket !== null && this.sounded[id] !== bucket) {
        this.sounded[id] = bucket;
        ring = true;
      }
    }
    const active = new Set(queue.map(reminderId));
    this.sounded = Object.fromEntries(
      Object.entries(this.sounded).filter(([id]) => active.has(id)),
    );
    this.persist();
    if (ring) void this.ring();
  }
  private async ring(): Promise<void> {
    try {
      await new Audio('assets/sounds/notification.mp3').play();
      this.soundBlocked.set(false);
    } catch {
      this.soundBlocked.set(true);
    }
  }
  enableSound(): void {
    void this.ring();
  }
  async refresh(): Promise<void> {
    if (!this.api.branchId()) return;
    this.lastRefresh = Date.now();
    const serial = ++this.serial;
    this.request?.abort();
    const request = (this.request = new AbortController());
    const dates = [...new Set([localDateKey(), ...this.queue().map((a) => a.date)])];
    try {
      const result = (
        await Promise.all(
          dates.map((date) =>
            this.history.load({ startDate: date, endDate: date }, request.signal),
          ),
        )
      ).flat();
      if (serial !== this.serial) return;
      this.items = result;
      this.error.set('');
      const existing = this.auth.getCachedAppointments(),
        map = new Map(existing.map((a) => [reminderId(a), a]));
      for (const a of result) map.set(reminderId(a), { ...map.get(reminderId(a)), ...a });
      const merged = [...map.values()];
      if (JSON.stringify(existing) !== JSON.stringify(merged))
        this.auth.saveCachedAppointments(merged, true);
      this.tick();
    } catch {
      if (serial === this.serial && !request.signal.aborted)
        this.error.set(
          'Sin conexión con la agenda. Los check-in pendientes se conservan localmente.',
        );
    }
  }
  async confirm(item: any, status: number): Promise<void> {
    if (this.busy()) return;
    const branch = this.api.branchId(),
      key = this.key;
    this.busy.set(reminderId(item));
    this.error.set('');
    // Invalidate an older poll before applying the decision.
    this.serial++;
    this.request?.abort();
    try {
      const data = await this.api.post(API_URLS.RECORD_APPOINTMENT_VISIT, {
        idConsultorio: branch,
        appointmentId: item.appointmentId,
        date: item.date,
        time: item.time,
        operation: 'attendance',
        status,
        expectedStatus: Number(item.status ?? 0),
      });
      if (key !== this.key) return;
      this.items = this.items.map((a) =>
        reminderId(a) === reminderId(item) ? data.appointment : a,
      );
      this.api.mergeAppointment(data.appointment, branch);
      this.tick();
    } catch (error: any) {
      if (key === this.key) this.error.set(error.message || 'No se pudo guardar el check-in.');
    } finally {
      if (key === this.key) this.busy.set('');
    }
  }
}
