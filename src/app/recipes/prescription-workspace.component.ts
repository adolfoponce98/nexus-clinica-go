import { ClinicalContentSkeletonComponent } from '../shared/clinical-content-skeleton.component';
import { PrescriptionThumbnailComponent } from './prescription-thumbnail.component';
import { Component, OnInit, DestroyRef, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { API_URLS } from '../config/api-urls';
import { PrescriptionDocumentComponent } from './prescription-document.component';
import {
  PRESCRIPTION_TEMPLATES,
  PHYSICAL_TEMPLATE,
  examplePrescription,
  prescriptionTemplate,
} from './prescription-templates';
@Component({
  selector: 'app-prescription-workspace',
  standalone: true,
  imports: [
    ClinicalContentSkeletonComponent,
    PrescriptionThumbnailComponent,
    FormsModule,
    PrescriptionDocumentComponent,
  ],
  templateUrl: './prescription-workspace.component.html',
  styleUrl: './prescription-workspace.component.css',
})
export class PrescriptionWorkspaceComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  private api = inject(ClinicApiService);
  private auth = inject(AuthService);
  readonly permissions = inject(PermissionService);
  private destroy = inject(DestroyRef);
  customTemplate = signal<any>(null);
  get templates() {
    const d = this.customTemplate()?.design;
    return d
      ? [
          {
            ...PHYSICAL_TEMPLATE,
            color: d.color,
            accent: d.accent,
            officeLogo: d.officeLogo,
            watermark: d.watermark,
          },
          ...PRESCRIPTION_TEMPLATES,
        ]
      : PRESCRIPTION_TEMPLATES;
  }
  mode = signal<'templates' | 'issued'>('templates');
  doctor = signal<any>({});
  office = signal<any>({});
  settings = signal<any>({ templateId: 'ocean', revision: 0 });
  selected = signal('ocean');
  orientation = signal<'portrait' | 'landscape'>('portrait');
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  notice = signal('');
  issued = signal<any>(null);
  hash = signal('');
  lookupFolio = '';
  private loadSequence = 0;
  private destroyed = false;
  constructor() {
    this.auth.branchChanged$
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => void this.load(true));
    this.destroy.onDestroy(() => {
      this.destroyed = true;
      this.loadSequence++;
      this.issued.set(null);
    });
  }
  ngOnInit() {
    void this.load(true);
  }
  get example() {
    return {
      ...examplePrescription(this.doctor(), this.office(), this.selected(), this.orientation()),
      ...(this.selected() === PHYSICAL_TEMPLATE.id
        ? { customTemplate: this.customTemplate() }
        : {}),
    };
  }
  get isDefault() {
    return (
      this.settings().templateId === this.selected() &&
      (this.settings().orientation || 'portrait') === this.orientation()
    );
  }
  get chosen() {
    return prescriptionTemplate(this.selected());
  }
  private sameOffice(id: string) {
    return !this.destroyed && id === this.api.branchId();
  }
  async load(reset = true) {
    const seq = ++this.loadSequence,
      id = this.api.branchId();
    this.loading.set(true);
    this.error.set('');
    this.notice.set('');
    if (reset) {
      this.mode.set('templates');
      this.doctor.set({});
      this.office.set({});
      this.issued.set(null);
      this.hash.set('');
      this.lookupFolio = '';
    }
    try {
      if (!id) throw new Error('Selecciona un consultorio para configurar sus recetas.');
      const r = await this.api.post(API_URLS.GET_PRESCRIPTION_SETTINGS, { idConsultorio: id });
      if (seq !== this.loadSequence || !this.sameOffice(id)) return;
      this.customTemplate.set(r.customTemplate || null);
      this.doctor.set(r.doctor);
      this.office.set(r.office);
      this.settings.set(r.settings);
      if (reset) {
        this.selected.set(r.settings.templateId);
        this.orientation.set(r.settings.orientation === 'landscape' ? 'landscape' : 'portrait');
      }
    } catch (e: any) {
      if (seq === this.loadSequence) this.error.set(e.message);
    } finally {
      if (seq === this.loadSequence) this.loading.set(false);
    }
  }
  async setDefault() {
    if (this.saving() || !this.permissions.can('prescriptions', 'write')) return;
    const id = this.api.branchId(),
      selected = this.selected();
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const r = await this.api.post(API_URLS.SAVE_PRESCRIPTION_SETTINGS, {
        idConsultorio: id,
        templateId: selected,
        orientation: this.orientation(),
        expectedRevision: this.settings().revision,
      });
      if (!this.sameOffice(id)) return;
      this.settings.set(r.settings);
      const office = this.auth.getSucursal();
      if (office) this.auth.saveSucursal({ ...office, prescriptionSettings: r.settings });
      this.notice.set(
        'Plantilla ' +
          prescriptionTemplate(selected).name +
          ' guardada para ' +
          this.office().name +
          '.',
      );
    } catch (e: any) {
      if (this.sameOffice(id)) this.error.set(e.message);
    } finally {
      this.saving.set(false);
    }
  }
  select(id: string) {
    this.selected.set(id);
    this.notice.set('');
  }
  async lookup() {
    const id = this.api.branchId(),
      folio = this.lookupFolio.trim();
    if (!folio || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.api.post(API_URLS.GET_ISSUED_PRESCRIPTION, {
        idConsultorio: id,
        ...(folio.startsWith('CG-RX1:') ? { qrData: folio } : { folio }),
      });
      if (!this.sameOffice(id)) return;
      this.issued.set(r.prescription);
      this.hash.set(r.integrityHash);
      this.mode.set('issued');
      this.notice.set('Integridad verificada contra el registro original del consultorio.');
    } catch (e: any) {
      if (this.sameOffice(id)) this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }
  async print() {
    try {
      await this.api.post(API_URLS.GET_ISSUED_PRESCRIPTION, {
        idConsultorio: this.api.branchId(),
        folio: this.issued()?.folio,
        purpose: 'PRINT',
      });
    } catch (e: any) {
      this.error.set(e.message);
      return;
    }
    const sheet = document.querySelector('#issued-prescription app-prescription-document');
    if (!sheet || !this.issued()) return;
    const frame = document.createElement('iframe');
    frame.title = 'Impresión de receta emitida';
    frame.style.cssText = 'position:fixed;left:-10000px;width:900px;height:1000px;border:0';
    document.body.appendChild(frame);
    const target = frame.contentDocument;
    if (!target) {
      frame.remove();
      return;
    }
    const styles = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('');
    target.open();
    target.write(
      '<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Receta médica</title>' +
        styles +
        '<style>body{margin:0;background:white}app-prescription-document{display:block}@page{size:letter ' +
        (this.issued()?.orientation === 'landscape' ? 'landscape' : 'portrait') +
        ';margin:12mm}</style></head><body>' +
        sheet.outerHTML +
        '</body></html>',
    );
    target.close();
    try {
      await target.fonts.ready;
      await Promise.all(Array.from(target.images).map((img) => img.decode().catch(() => {})));
      frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true });
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      frame.remove();
      this.error.set('No se pudo abrir la impresión.');
    }
  }
}
