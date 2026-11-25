import { SyncGatewayService } from '../auth/sync-gateway.service';
import {
  AfterViewInit,
  Input,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  CalendarDays,
  Link2,
  ShieldCheck,
  X,
  LoaderCircle,
  Unplug,
  CheckCircle2,
  MapPin,
} from 'lucide-angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
@Component({
  selector: 'app-google-calendar-connection',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './google-calendar-connection.component.html',
  styleUrl: './google-calendar-connection.component.css',
})
export class GoogleCalendarConnectionComponent implements AfterViewInit, OnDestroy {
  @Input() appearance: 'button' | 'card' = 'button';
  readonly noticeTone = signal<'success' | 'info' | 'warning'>('success');
  readonly icons = {
    CalendarDays,
    Link2,
    ShieldCheck,
    X,
    LoaderCircle,
    Unplug,
    CheckCircle2,
    MapPin,
  };
  private gateway = inject(SyncGatewayService);
  private auth = inject(AuthService);
  private api = inject(ClinicApiService);
  @ViewChild('connectionDialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  readonly busy = signal(false);
  readonly state = signal<any>(null);
  readonly error = signal('');
  readonly notice = signal('');
  consent = false;
  timeZone = 'America/Mexico_City';
  confirmDisconnect = false;
  private scope = 0;
  private branch?: Subscription;
  private updates?: Subscription;
  constructor() {
    this.updates = this.gateway.updates.subscribe(({ type, data, office }) => {
      if (type === 'calendar' && office === this.api.branchId() && !this.busy())
        this.state.set(data);
    });
  }
  get owner() {
    const s = this.auth.getSession();
    return !!s && !s.idDoctor && Number(s.typeUser ?? s.role) === 1;
  }
  get officeName() {
    return this.auth.getSucursal()?.name || 'Consultorio seleccionado';
  }
  readonly zones = [
    ['America/Mexico_City', 'Ciudad de México / centro'],
    ['America/Cancun', 'Quintana Roo'],
    ['America/Merida', 'Mérida'],
    ['America/Monterrey', 'Monterrey'],
    ['America/Chihuahua', 'Chihuahua'],
    ['America/Ciudad_Juarez', 'Ciudad Juárez'],
    ['America/Hermosillo', 'Sonora'],
    ['America/Mazatlan', 'Mazatlán'],
    ['America/Tijuana', 'Tijuana'],
    ['America/Matamoros', 'Matamoros'],
    ['America/Ojinaga', 'Ojinaga'],
  ];
  ngAfterViewInit() {
    this.branch = this.auth.branchChanged$.subscribe(() => {
      this.scope++;
      this.state.set(null);
      this.busy.set(false);
      this.notice.set('');
      this.error.set('');
      this.dialog.nativeElement.close();
      if (this.appearance === 'card' && this.owner) void this.loadStatus();
    });
    const query = new URLSearchParams(location.search),
      result = query.get('googleCalendar');
    if (!result || !this.owner) {
      if (this.appearance === 'card' && this.owner) void this.loadStatus();
      return;
    }
    this.noticeTone.set(result === 'connected' ? 'success' : 'warning');
    const office = query.get('googleCalendarOffice');
    if (office) this.gateway.invalidate('calendar', office);
    query.delete('googleCalendar');
    query.delete('googleCalendarOffice');
    history.replaceState(
      history.state,
      '',
      location.pathname + (query.size ? '?' + query : '') + location.hash,
    );
    if (result === 'connected')
      this.notice.set(
        'Google Calendar se conectó correctamente.' +
          (office !== this.api.branchId()
            ? ' Selecciona el consultorio que vinculaste para ver su conexión.'
            : ''),
      );
    else
      this.notice.set(
        result === 'cancelled'
          ? 'La autorización fue cancelada. Tus citas no cambiaron.'
          : 'No se completó la conexión. Revisa la configuración y vuelve a autorizar.',
      );
    if (office === this.api.branchId()) void this.open();
    else if (this.appearance === 'card') void this.loadStatus();
  }
  async open() {
    if (!this.owner || this.busy()) return;
    this.error.set('');
    this.consent = false;
    this.confirmDisconnect = false;
    this.dialog.nativeElement.showModal();
    await this.loadStatus();
  }
  async loadStatus() {
    if (!this.owner || this.busy()) return;
    if (!this.api.branchId()) {
      this.error.set('Selecciona un consultorio para administrar la conexión.');
      return;
    }
    this.busy.set(true);
    const scope = ++this.scope;
    try {
      const state =
        this.gateway.peek('calendar') || (await this.gateway.load(['calendar'])).resources.calendar;
      if (scope === this.scope) {
        this.state.set(state);
        this.timeZone = state.timeZone;
      }
    } catch (e: any) {
      if (scope === this.scope) this.error.set(e.message);
    } finally {
      if (scope === this.scope) this.busy.set(false);
    }
  }
  async connect() {
    if (!this.owner || !this.consent || this.busy() || !this.api.branchId()) return;
    this.busy.set(true);
    this.error.set('');
    const scope = this.scope;
    try {
      const result = await this.api.post(API_URLS.CONNECT_GOOGLE_CALENDAR, {
        idConsultorio: this.api.branchId(),
        origin: location.origin,
        timeZone: this.timeZone,
        consent: true,
      });
      if (scope !== this.scope) return;
      const url = new URL(result.authorizationUrl);
      if (url.origin !== 'https://accounts.google.com')
        throw new Error('Enlace de autorización inválido.');
      location.assign(url.toString());
    } catch (e: any) {
      if (scope === this.scope) this.error.set(e.message);
    } finally {
      if (scope === this.scope) this.busy.set(false);
    }
  }
  async disconnect() {
    if (!this.owner || this.busy() || !this.confirmDisconnect) return;
    this.busy.set(true);
    this.error.set('');
    const scope = this.scope;
    try {
      await this.api.post(API_URLS.DISCONNECT_GOOGLE_CALENDAR, {
        idConsultorio: this.api.branchId(),
      });
      if (scope === this.scope) {
        this.state.set({ connected: false, timeZone: this.timeZone });
        this.gateway.accept('calendar', { connected: false, timeZone: this.timeZone, version: '' });
        this.consent = false;
        this.confirmDisconnect = false;
        this.noticeTone.set('info');
        this.notice.set(
          'Sincronización desconectada. Las citas existentes en Google se conservan.',
        );
      }
    } catch (e: any) {
      if (scope === this.scope) this.error.set(e.message);
    } finally {
      if (scope === this.scope) this.busy.set(false);
    }
  }
  ngOnDestroy() {
    this.scope++;
    this.branch?.unsubscribe();
    this.updates?.unsubscribe();
  }
}
