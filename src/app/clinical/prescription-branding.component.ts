import { ClinicalContentSkeletonComponent } from '../shared/clinical-content-skeleton.component';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ImagePlus,
  Upload,
  Sparkles,
  Save,
  Building2,
  UserRound,
  CheckCircle2,
  Info,
  Trash2,
} from 'lucide-angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { BillingService } from '../planes/billing.service';
import { API_URLS } from '../config/api-urls';
@Component({
  selector: 'app-prescription-branding',
  standalone: true,
  imports: [ClinicalContentSkeletonComponent, FormsModule, LucideAngularModule],
  templateUrl: './prescription-branding.component.html',
  styleUrl: './prescription-branding.component.css',
})
export class PrescriptionBrandingComponent implements OnInit, OnDestroy {
  private api = inject(ClinicApiService);
  private auth = inject(AuthService);
  private permissions = inject(PermissionService);
  readonly billing = inject(BillingService);
  readonly icons = {
    ImagePlus,
    Upload,
    Sparkles,
    Save,
    Building2,
    UserRound,
    CheckCircle2,
    Info,
    Trash2,
  };
  readonly loading = signal(false);
  readonly preparing = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly preview = signal('');
  readonly ready = signal(false);
  target: 'doctor' | 'office' = 'doctor';
  doctorLogo = '';
  officeLogo = '';
  officeName = '';
  canEditOffice = false;
  fileName = '';
  imageData = '';
  assetId = '';
  private sequence = 0;
  private destroyed = false;
  private attempt?: { content: string; id: string };
  private branch?: Subscription;
  get canEdit() {
    return (
      this.permissions.can('prescriptions', 'write') || this.permissions.can('followUps', 'write')
    );
  }
  get disabled() {
    return (
      this.loading() ||
      this.preparing() ||
      this.saving() ||
      this.uploading() ||
      !this.canEdit ||
      (this.target === 'office' && !this.canEditOffice)
    );
  }
  get dirty() {
    return !!this.imageData || !!this.assetId;
  }
  get savedLogo() {
    return this.target === 'office' ? this.officeLogo : this.doctorLogo;
  }
  ngOnInit() {
    void this.load();
    this.branch = this.auth.branchChanged$.subscribe(() => void this.load());
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.sequence++;
    this.branch?.unsubscribe();
  }
  async load() {
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.preparing.set(false);
    this.saving.set(false);
    this.uploading.set(false);
    this.reset();
    this.error.set('');
    this.doctorLogo = '';
    this.officeLogo = '';
    this.officeName = '';
    try {
      const r = await this.api.post(API_URLS.GET_PRESCRIPTION_BRANDING, {
        idConsultorio: this.api.branchId(),
      });
      if (sequence !== this.sequence || this.destroyed) return;
      this.doctorLogo = r.doctorLogoUrl || '';
      this.officeLogo = r.officeLogoUrl || '';
      this.officeName = r.officeName || '';
      this.canEditOffice = !!r.canEditOffice;
      this.preview.set(this.savedLogo);
      this.ready.set(!!this.savedLogo);
    } catch (e: any) {
      if (sequence === this.sequence && !this.destroyed) this.error.set(e.message);
    } finally {
      if (sequence === this.sequence && !this.destroyed) this.loading.set(false);
    }
  }
  reset() {
    this.imageData = '';
    this.assetId = '';
    this.fileName = '';
    this.attempt = undefined;
    this.notice.set('');
    this.preview.set('');
    this.ready.set(false);
  }
  selectTarget(target: 'doctor' | 'office') {
    if (this.loading() || this.preparing() || this.saving() || this.uploading()) return;
    this.target = target;
    this.reset();
    this.error.set('');
    this.preview.set(this.savedLogo);
    this.ready.set(!!this.savedLogo);
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || this.disabled) return;
    const sequence = this.sequence;
    this.error.set('');
    this.uploading.set(true);
    let url = '';
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
        throw new Error('Solo se permiten imágenes PNG, JPG o WebP.');
      if (file.size > 5 * 1024 * 1024) throw new Error('El logo debe pesar como máximo 5 MB.');
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.naturalWidth * image.naturalHeight > 20_000_000)
        throw new Error('La imagen es demasiado grande. Usa un logo de hasta 20 megapíxeles.');
      const ratio = Math.min(1, 1200 / image.naturalWidth, 1200 / image.naturalHeight),
        canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = false,
        visible = false;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 20) transparent = true;
        if (pixels[i] > 200) visible = true;
      }
      if (!visible) throw new Error('La imagen está vacía. Selecciona un logo visible.');
      const data = canvas.toDataURL('image/png');
      if (data.length > 6_990_000) throw new Error('Usa una imagen de logo más sencilla.');
      if (sequence !== this.sequence || this.destroyed) return;
      this.reset();
      this.imageData = data;
      this.preview.set(data);
      this.fileName = file.name;
      this.ready.set(transparent);
    } catch (e: any) {
      if (sequence === this.sequence && !this.destroyed)
        this.error.set(e.message || 'No se pudo abrir la imagen.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (sequence === this.sequence && !this.destroyed) this.uploading.set(false);
    }
  }
  async prepare() {
    if (this.disabled || !this.imageData) return;
    this.error.set('');
    if (!this.billing.state() || this.billing.error()) {
      this.error.set(
        'No se pudo verificar tu cuenta. Actualiza los datos antes de preparar el logo.',
      );
      return;
    }
    if (!this.billing.active() && this.billing.state()!.aiCredits < 1) {
      this.error.set('Necesitas 1 crédito IA en FREE. Con suscripción activa está incluido.');
      return;
    }
    const sequence = this.sequence,
      payload = {
        idConsultorio: this.api.branchId(),
        target: this.target,
        imageData: this.imageData,
      },
      content = JSON.stringify(payload);
    if (this.attempt?.content !== content) this.attempt = { content, id: crypto.randomUUID() };
    this.preparing.set(true);
    this.notice.set('');
    try {
      const r = await this.api.post(API_URLS.PREPARE_PRESCRIPTION_LOGO, {
        ...payload,
        requestId: this.attempt.id,
      });
      if (sequence !== this.sequence || this.destroyed) return;
      if (!r.assetId || !r.logoUrl) throw new Error('La IA no devolvió un logo válido.');
      this.assetId = r.assetId;
      this.preview.set(r.logoUrl);
      this.ready.set(true);
      this.notice.set(
        'Fondo eliminado. Revisa el resultado y guarda el logo para usarlo en tus recetas.',
      );
      void this.billing.refresh();
    } catch (e: any) {
      if (sequence === this.sequence && !this.destroyed)
        this.error.set(e.message || 'No se pudo preparar el logo. Se conserva la imagen original.');
    } finally {
      if (sequence === this.sequence && !this.destroyed) this.preparing.set(false);
    }
  }
  async save(clear = false) {
    if (this.disabled || (!clear && (!this.dirty || !this.ready()))) return;
    const sequence = this.sequence;
    this.saving.set(true);
    this.error.set('');
    try {
      const r = await this.api.post(API_URLS.SAVE_PRESCRIPTION_BRANDING, {
        idConsultorio: this.api.branchId(),
        target: this.target,
        ...(clear
          ? { clear: true }
          : this.assetId
            ? { assetId: this.assetId }
            : { imageData: this.imageData }),
      });
      if (sequence !== this.sequence || this.destroyed) return;
      if (this.target === 'office') this.officeLogo = r.logoUrl || '';
      else this.doctorLogo = r.logoUrl || '';
      this.reset();
      this.preview.set(this.savedLogo);
      this.ready.set(!!this.savedLogo);
      this.notice.set(
        clear
          ? 'Logo desactivado para las próximas recetas.'
          : 'Logo guardado. Se utilizará en las próximas recetas.',
      );
    } catch (e: any) {
      if (sequence === this.sequence && !this.destroyed) this.error.set(e.message);
    } finally {
      if (sequence === this.sequence && !this.destroyed) this.saving.set(false);
    }
  }
}
