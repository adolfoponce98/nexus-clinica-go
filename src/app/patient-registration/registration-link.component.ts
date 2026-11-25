import QRCode from 'qrcode';
import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  Link2,
  QrCode,
  Clock3,
  ShieldCheck,
  X,
  Copy,
  Share2,
  Sparkles,
  Building2,
  Download,
} from 'lucide-angular';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { API_URLS } from '../config/api-urls';
@Component({
  selector: 'app-patient-registration-link',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './registration-link.component.html',
  styleUrl: './registration-link.component.css',
})
export class RegistrationLinkComponent {
  @ViewChild('modal') private modal?: ElementRef<HTMLDialogElement>;
  readonly icons = {
    Link2,
    QrCode,
    Clock3,
    ShieldCheck,
    X,
    Copy,
    Share2,
    Sparkles,
    Building2,
    Download,
  };
  confirming = signal(true);
  get officeName() {
    return this.auth.getSucursal()?.name || 'Consultorio seleccionado';
  }
  close() {
    this.opened.set(false);
    this.modal?.nativeElement.close();
  }
  backdrop(event: MouseEvent) {
    const dialog = this.modal?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      this.close();
  }
  prepareAnother() {
    this.confirming.set(true);
    this.error.set('');
    this.notice.set('');
  }

  readonly permissions = inject(PermissionService);
  private api = inject(ClinicApiService);
  private auth = inject(AuthService);
  private destroy = inject(DestroyRef);
  opened = signal(false);
  loading = signal(false);
  link = signal<any>(null);
  qr = signal('');
  error = signal('');
  notice = signal('');
  remaining = signal(0);
  private sequence = 0;
  private offset = 0;
  private timer = setInterval(() => this.tick(), 1000);
  private destroyed = false;
  constructor() {
    this.auth.branchChanged$.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.sequence++;
      this.loading.set(false);
      this.close();
      this.link.set(null);
      this.qr.set('');
    });
    this.destroy.onDestroy(() => {
      this.destroyed = true;
      this.close();
      this.sequence++;
      clearInterval(this.timer);
      this.link.set(null);
      this.qr.set('');
    });
  }
  get clock() {
    return Math.floor(this.remaining() / 60) + ':' + String(this.remaining() % 60).padStart(2, '0');
  }
  private tick() {
    if (this.link())
      this.remaining.set(
        Math.min(
          3600,
          Math.max(
            0,
            Math.ceil((Date.parse(this.link().expiresAt) - Date.now() - this.offset) / 1000),
          ),
        ),
      );
  }
  open() {
    if (!this.permissions.can('patients', 'write')) return;
    this.opened.set(true);
    this.confirming.set(!this.link());
    this.tick();
    const dialog = this.modal?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  }
  async generate() {
    if (this.loading() || !this.permissions.can('patients', 'write')) return;
    const id = this.api.branchId(),
      seq = ++this.sequence;
    this.loading.set(true);
    this.error.set('');
    this.notice.set('');
    this.link.set(null);
    this.qr.set('');
    try {
      if (!id) throw new Error('Selecciona un consultorio.');
      const r = await this.api.post(API_URLS.CREATE_PATIENT_REGISTRATION_LINK, {
        idConsultorio: id,
        publicOrigin: window.location.origin,
      });
      if (this.destroyed || seq !== this.sequence || id !== this.api.branchId()) return;
      this.offset = Date.parse(r.serverNow) - Date.now();
      this.link.set(r);
      this.confirming.set(false);
      this.tick();
      const qr = await QRCode.toDataURL(r.url, {
        width: 480,
        margin: 4,
        errorCorrectionLevel: 'M',
      });
      if (seq === this.sequence && !this.destroyed) this.qr.set(qr);
    } catch (e: any) {
      if (seq === this.sequence) this.error.set(e.message || 'No se pudo generar el enlace.');
    } finally {
      if (seq === this.sequence) this.loading.set(false);
    }
  }
  downloadQr() {
    if (!this.qr() || this.remaining() === 0) return;
    const anchor = document.createElement('a');
    anchor.href = this.qr();
    anchor.download = 'registro-paciente-qr.png';
    anchor.click();
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.link().url);
      this.notice.set('Enlace copiado.');
    } catch {
      this.notice.set('Selecciona el enlace y cópialo para compartirlo.');
    }
  }
  async share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Registro de paciente · Clínica Go', url: this.link().url });
      } catch (e: any) {
        if (e.name !== 'AbortError')
          this.notice.set('Puedes copiar el enlace y enviarlo al paciente.');
      }
    } else await this.copy();
  }
}
