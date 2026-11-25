import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import {
  LucideAngularModule,
  FileImage,
  Upload,
  Sparkles,
  Check,
  X,
  FileText,
} from 'lucide-angular';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { PermissionService } from '../auth/permission.service';
import { AuthService } from '../auth/auth.service';
import { BillingService } from '../planes/billing.service';
import { API_URLS } from '../config/api-urls';
import { ClinicalContentSkeletonComponent } from '../shared/clinical-content-skeleton.component';
import { PrescriptionDocumentComponent } from './prescription-document.component';
import { examplePrescription } from './prescription-templates';
@Component({
  selector: 'app-physical-template-dialog',
  standalone: true,
  imports: [LucideAngularModule, ClinicalContentSkeletonComponent, PrescriptionDocumentComponent],
  templateUrl: './physical-template-dialog.component.html',
  styleUrl: './physical-template-dialog.component.css',
})
export class PhysicalTemplateDialogComponent implements OnInit, OnDestroy {
  private api = inject(ClinicApiService);
  private ref = inject(MatDialogRef<PhysicalTemplateDialogComponent>);
  private auth = inject(AuthService);
  readonly billing = inject(BillingService);
  readonly permissions = inject(PermissionService);
  readonly icons = { FileImage, Upload, Sparkles, Check, X, FileText };
  loading = signal(true);
  reading = signal(false);
  generating = signal(false);
  saving = signal(false);
  error = signal('');
  notice = signal('');
  proposal = signal<any>(null);
  settings: any = {};
  doctor: any = {};
  office: any = {};
  current: any = null;
  fileName = '';
  source = '';
  imagePreview = '';
  private officeId = this.api.branchId();
  private requestId = '';
  private destroyed = false;
  get busy() {
    return this.loading() || this.reading() || this.generating() || this.saving();
  }
  get canEdit() {
    return this.permissions.can('prescriptions', 'write');
  }
  get preview() {
    const t = this.proposal()?.customTemplate || this.current;
    return t
      ? {
          ...examplePrescription(this.doctor, this.office, 'physical-custom', t.design.orientation),
          customTemplate: t,
        }
      : null;
  }
  ngOnInit() {
    void this.load();
  }
  ngOnDestroy() {
    this.destroyed = true;
  }
  private assertOffice() {
    if (this.api.branchId() !== this.officeId)
      throw new Error('Cambió el consultorio. Cierra este diálogo y vuelve a abrirlo.');
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.api.post(API_URLS.GET_PRESCRIPTION_SETTINGS, {
        idConsultorio: this.officeId,
      });
      if (this.destroyed) return;
      this.assertOffice();
      this.settings = r.settings;
      this.doctor = r.doctor;
      this.office = r.office;
      this.current = r.customTemplate || null;
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      if (!this.destroyed) this.loading.set(false);
    }
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || this.busy || !this.canEdit) return;
    this.error.set('');
    this.reading.set(true);
    try {
      this.assertOffice();
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))
        throw new Error('Selecciona una fotografía JPG, PNG, WebP o un PDF.');
      if (file.size > 5 * 1024 * 1024) throw new Error('El archivo debe pesar como máximo 5 MB.');
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        r.readAsDataURL(file);
      });
      if (this.destroyed) return;
      this.assertOffice();
      this.source = data;
      this.fileName = file.name;
      this.imagePreview = file.type.startsWith('image/') ? data : '';
      this.requestId = crypto.randomUUID();
      this.proposal.set(null);
      this.notice.set('');
    } catch (e: any) {
      if (!this.destroyed) this.error.set(e.message);
    } finally {
      if (!this.destroyed) this.reading.set(false);
    }
  }
  async generate() {
    if (this.busy || !this.source || !this.canEdit) return;
    this.generating.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      this.assertOffice();
      const r = await this.api.post(API_URLS.PREPARE_PRESCRIPTION_LOGO, {
        idConsultorio: this.officeId,
        target: 'doctor',
        documentType: 'prescription-template',
        templateExtractionVersion: 2,
        imageData: this.source,
        requestId: this.requestId,
      });
      if (this.destroyed) return;
      this.assertOffice();
      if (!r.draftId || !r.customTemplate?.design)
        throw new Error('La IA no devolvió una plantilla válida.');
      this.proposal.set(r);
      this.notice.set(
        'Revisa que los textos impresos y el diseño coincidan con tu original. Solo el paciente y los medicamentos mostrados son de ejemplo.',
      );
      void this.billing.refresh();
    } catch (e: any) {
      if (!this.destroyed) this.error.set(e.message);
    } finally {
      if (!this.destroyed) this.generating.set(false);
    }
  }
  async accept() {
    if (this.busy || !this.proposal() || !this.canEdit) return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.assertOffice();
      const r = await this.api.post(API_URLS.ACCEPT_PHYSICAL_PRESCRIPTION_TEMPLATE, {
        idConsultorio: this.officeId,
        draftId: this.proposal().draftId,
        expectedRevision: this.settings.revision || 0,
        expectedTemplateRevision: this.current?.revision || 0,
      });
      if (this.destroyed) return;
      this.assertOffice();
      this.current = r.customTemplate;
      this.settings = r.settings;
      const office = this.auth.getSucursal();
      if (office) this.auth.saveSucursal({ ...office, prescriptionSettings: r.settings });
      this.proposal.set(null);
      this.source = '';
      this.fileName = '';
      this.imagePreview = '';
      this.notice.set(
        'Plantilla guardada en tu perfil y activada como predeterminada para este consultorio.',
      );
    } catch (e: any) {
      if (!this.destroyed) this.error.set(e.message);
    } finally {
      if (!this.destroyed) this.saving.set(false);
    }
  }
  close() {
    if (!this.busy) this.ref.close();
  }
}
