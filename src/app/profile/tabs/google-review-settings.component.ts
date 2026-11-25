import { SyncGatewayService } from '../../auth/sync-gateway.service';
import { GoogleReviewGuideComponent } from './google-review-guide.component';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  MapPin,
  MessageCircle,
  Star,
  Clock3,
  Link2,
  ShieldCheck,
  Save,
  LoaderCircle,
  CheckCircle2,
  CircleAlert,
} from 'lucide-angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { API_URLS } from '../../config/api-urls';
@Component({
  selector: 'app-google-review-settings',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, GoogleReviewGuideComponent],
  templateUrl: './google-review-settings.component.html',
  styleUrl: './google-review-settings.component.css',
})
export class GoogleReviewSettingsComponent implements OnInit, OnDestroy {
  readonly icons = {
    MapPin,
    MessageCircle,
    Star,
    Clock3,
    Link2,
    ShieldCheck,
    Save,
    LoaderCircle,
    CheckCircle2,
    CircleAlert,
  };
  private gateway = inject(SyncGatewayService);
  private auth = inject(AuthService);
  private api = inject(ClinicApiService);
  loading = signal(true);
  loaded = signal(false);
  saving = signal(false);
  error = signal('');
  notice = signal('');
  enabled = false;
  reviewUrl = '';
  reviewLink = '';
  delayMinutes = 30;
  private savedEnabled = false;
  private sequence = 0;
  private branch?: Subscription;
  private updates?: Subscription;
  private savedUrl = '';
  private savedDelay = 30;
  constructor() {
    this.updates = this.gateway.updates.subscribe(({ type, data, office }) => {
      if (
        type === 'reviews' &&
        office === this.api.branchId() &&
        !this.loading() &&
        !this.saving() &&
        this.reviewUrl === this.savedUrl &&
        this.delayMinutes === this.savedDelay &&
        this.enabled === this.savedEnabled
      )
        this.applySettings(data.settings);
    });
  }
  private applySettings(settings: any) {
    this.loaded.set(true);
    this.enabled = this.savedEnabled = settings.enabled;
    this.reviewUrl = this.savedUrl = settings.reviewUrl;
    this.reviewLink = settings.reviewLink || '';
    this.delayMinutes = this.savedDelay = settings.delayMinutes;
  }

  readonly delays = [
    { value: 0, label: 'Al cerrar la primera consulta' },
    { value: 15, label: '15 minutos después' },
    { value: 30, label: '30 minutos después' },
    { value: 60, label: '1 hora después' },
    { value: 120, label: '2 horas después' },
  ];
  get owner() {
    const session = this.auth.getSession();
    return !!session && !session.idDoctor && Number(session.typeUser ?? session.role) === 1;
  }
  get officeName() {
    return this.auth.getSucursal()?.name || 'Selecciona un consultorio';
  }
  ngOnInit() {
    this.branch = this.auth.branchChanged$.subscribe(() => void this.load());
    void this.load();
  }
  async load() {
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.loaded.set(false);
    this.saving.set(false);
    this.error.set('');
    this.notice.set('');
    this.enabled = false;
    this.savedEnabled = false;
    this.reviewUrl = '';
    this.reviewLink = '';
    this.delayMinutes = 30;
    try {
      if (!this.owner || !this.api.branchId())
        throw new Error('Selecciona un consultorio para configurar las invitaciones.');
      const response =
        this.gateway.peek('reviews') || (await this.gateway.load(['reviews'])).resources.reviews;
      if (sequence !== this.sequence) return;
      this.loaded.set(true);
      this.applySettings(response.settings);
    } catch (e: any) {
      if (sequence === this.sequence) this.error.set(e.message);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  async save() {
    if (!this.owner || !this.loaded() || this.loading() || this.saving() || !this.api.branchId())
      return;
    const sequence = this.sequence;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const response = await this.api.post(API_URLS.SAVE_GOOGLE_REVIEW_SETTINGS, {
        idConsultorio: this.api.branchId(),
        enabled: this.enabled,
        reviewUrl: this.reviewUrl.trim(),
        delayMinutes: Number(this.delayMinutes),
      });
      if (sequence !== this.sequence) return;
      this.gateway.accept('reviews', { settings: response.settings, version: '' });
      this.applySettings(response.settings);
      this.notice.set(
        this.enabled
          ? 'Preferencia activada y guardada. El envío queda pendiente de integrar la plantilla aprobada.'
          : 'Invitaciones deshabilitadas para este consultorio.',
      );
    } catch (e: any) {
      if (sequence === this.sequence) {
        this.enabled = this.savedEnabled;
        this.error.set(e.message);
      }
    } finally {
      if (sequence === this.sequence) this.saving.set(false);
    }
  }
  async copyReviewLink() {
    if (!this.reviewLink) return;
    try {
      await navigator.clipboard.writeText(this.reviewLink);
      this.notice.set('Enlace de reseñas copiado.');
    } catch {
      this.error.set('No se pudo copiar. Selecciona y copia el enlace manualmente.');
    }
  }
  ngOnDestroy() {
    this.sequence++;
    this.branch?.unsubscribe();
    this.updates?.unsubscribe();
  }
}
