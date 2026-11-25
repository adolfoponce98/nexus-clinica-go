import { ClinicalContentSkeletonComponent } from '../shared/clinical-content-skeleton.component';
import { PrescriptionBrandingComponent } from './prescription-branding.component';
import { SPECIALTIES_CATALOG } from '../utils/specialties.constants';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  UserRound,
  BadgeCheck,
  GraduationCap,
  Stethoscope,
  ShieldCheck,
  PenLine,
  Upload,
  ImagePlus,
  Sparkles,
  CheckCircle2,
  Save,
  Info,
  RefreshCw,
  X,
} from 'lucide-angular';
import { PermissionService } from '../auth/permission.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { SignaturePadComponent } from './signature-pad.component';
@Component({
  selector: 'app-clinical-identity',
  standalone: true,
  imports: [
    ClinicalContentSkeletonComponent,
    PrescriptionBrandingComponent,
    CommonModule,
    FormsModule,
    SignaturePadComponent,
    LucideAngularModule,
  ],
  templateUrl: './clinical-identity.component.html',
  styleUrl: './clinical-identity.component.css',
})
export class ClinicalIdentityComponent implements OnInit, OnDestroy {
  @Input() mode: 'identity' | 'signature' = 'identity';
  @Input() showHeading = true;
  readonly specialtyOptions = SPECIALTIES_CATALOG;
  private permissions = inject(PermissionService);
  private api = inject(ClinicApiService);
  private uploadSequence = 0;
  private destroyed = false;
  private storedSignature = '';
  @Output() identitySaved = new EventEmitter<void>();
  readonly icons = {
    UserRound,
    BadgeCheck,
    GraduationCap,
    Stethoscope,
    ShieldCheck,
    PenLine,
    Upload,
    ImagePlus,
    Sparkles,
    CheckCircle2,
    Save,
    Info,
    RefreshCw,
    X,
  };
  profile: any = {};
  busy = signal(false);
  imageBusy = signal(false);
  saving = signal(false);
  loaded = signal(false);
  error = signal('');
  saved = signal(false);
  drawing = signal(false);
  drawingSignature = '';
  fileName = signal('');
  get canManageBranding() {
    return this.permissions.can('prescriptions') || this.permissions.can('followUps');
  }
  get canEdit() {
    return (
      this.permissions.can('followUps', 'write') ||
      this.permissions.can('prescriptions', 'write') ||
      this.permissions.can('nursing', 'write')
    );
  }
  get hasSignature() {
    return typeof this.profile.signatureImage === 'string' && !!this.profile.signatureImage.trim();
  }
  get signatureIsSaved() {
    return this.hasSignature && this.profile.signatureImage === this.storedSignature;
  }
  get disabled() {
    return this.busy() || this.imageBusy() || !this.canEdit || !this.loaded();
  }
  async ngOnInit() {
    await this.load();
  }
  async load() {
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.post(API_URLS.GET_CLINICAL_IDENTITY, {});
      if (this.destroyed) return;
      this.profile = result.profile || {};
      this.storedSignature = this.profile.signatureImage || '';
      this.loaded.set(true);
    } catch (e: any) {
      if (!this.destroyed) this.error.set(e.message || 'No se pudo cargar tu identidad.');
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file || this.disabled) return;
    input.value = '';
    this.error.set('');
    this.saved.set(false);
    const seq = ++this.uploadSequence;
    this.imageBusy.set(true);
    let url = '';
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
        throw new Error('Selecciona una imagen PNG, JPG o WebP.');
      if (file.size > 5 * 1024 * 1024) throw new Error('La imagen debe pesar como máximo 5 MB.');
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (
        !image.naturalWidth ||
        !image.naturalHeight ||
        image.naturalWidth > 8000 ||
        image.naturalHeight > 8000
      )
        throw new Error('La imagen es demasiado grande o no es válida.');
      const canvas = document.createElement('canvas');
      let ratio = Math.min(1, 1000 / image.naturalWidth, 400 / image.naturalHeight),
        value = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo preparar la vista previa.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        value = canvas.toDataURL('image/png');
        if (value.length <= 400000) break;
        ratio *= 0.75;
      }
      if (value.length > 400000)
        throw new Error('Usa una imagen más sencilla o recortada de tu firma.');
      if (seq !== this.uploadSequence || this.destroyed) return;
      this.profile.signatureImage = value;
      this.profile.signatureAcknowledged = false;
      this.fileName.set(file.name);
      this.drawing.set(false);
    } catch (e: any) {
      if (seq === this.uploadSequence && !this.destroyed)
        this.error.set(e.message || 'No se pudo cargar la imagen.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (seq === this.uploadSequence && !this.destroyed) this.imageBusy.set(false);
    }
  }
  startDrawing() {
    if (this.disabled) return;
    this.drawingSignature = '';
    this.drawing.set(true);
  }
  useDrawing() {
    if (!this.drawingSignature || this.disabled) return;
    this.profile.signatureImage = this.drawingSignature;
    this.profile.signatureAcknowledged = false;
    this.fileName.set('Firma dibujada en pantalla');
    this.saved.set(false);
    this.drawing.set(false);
    this.drawingSignature = '';
  }
  async save() {
    if (this.disabled || !this.profile.signatureAcknowledged || !this.hasSignature) return;
    this.busy.set(true);
    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      const result = await this.api.post(API_URLS.SAVE_CLINICAL_IDENTITY, this.profile);
      if (this.destroyed) return;
      this.profile = result.profile;
      this.storedSignature = this.profile.signatureImage || '';
      this.fileName.set('');
      this.saved.set(true);
      this.identitySaved.emit();
    } catch (e: any) {
      if (!this.destroyed) this.error.set(e.message || 'No se pudo guardar tu identidad.');
    } finally {
      if (!this.destroyed) {
        this.busy.set(false);
        this.saving.set(false);
      }
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.uploadSequence++;
    this.drawingSignature = '';
  }
}
