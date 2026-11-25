import {
  LucideAngularModule,
  FileCheck2,
  Eye,
  Download,
  X,
  ShieldCheck,
  PenLine,
  LoaderCircle,
} from 'lucide-angular';
import { ClinicalNotePdfService } from './clinical-note-pdf.service';
import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { ClinicalDocumentViewComponent } from './clinical-document-view.component';
@Component({
  selector: 'app-clinical-note-workflow',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, ClinicalDocumentViewComponent],
  templateUrl: './clinical-note-workflow.component.html',
  styleUrl: './clinical-note-workflow.component.css',
})
export class ClinicalNoteWorkflowComponent {
  readonly icons = { FileCheck2, Eye, Download, X, ShieldCheck, PenLine, LoaderCircle };
  @Input() showActions = true;
  @Input() noteState = '';
  get isSigned() {
    return (this.note()?.state || this.noteState) === 'LOCKED';
  }
  @Input() patientId = '';
  @Input() expedienteId = '';
  @Input() followUpId = '';
  @Output() locked = new EventEmitter<void>();
  private api = inject(ClinicApiService);
  private pdf = inject(ClinicalNotePdfService);
  note = signal<any>(null);
  addenda = signal<any[]>([]);
  opened = signal(false);
  busy = signal(false);
  error = signal('');
  acknowledged = false;
  text = '';
  private addendumRequestId = crypto.randomUUID();
  private payload() {
    return {
      idConsultorio: this.api.branchId(),
      idPatient: this.patientId,
      expedienteId: this.expedienteId,
      followUpId: this.followUpId,
    };
  }
  async review() {
    this.busy.set(true);
    this.error.set('');
    this.acknowledged = false;
    try {
      const result = await this.api.post(API_URLS.GETPATIENTFOLLOWUP, this.payload());
      this.note.set(result.followUp);
      this.addenda.set(result.addenda || []);
      this.opened.set(true);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async finalize() {
    const note = this.note();
    if (
      ['initial-history', 'evolution'].includes(note?.clinicalCore?.documentKind || 'evolution') &&
      !note?.medicalSummary
        ?.replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .trim()
    ) {
      this.error.set('Agrega el resumen médico antes de firmar y cerrar la consulta.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post(API_URLS.FINALIZE_CLINICAL_NOTE, {
        ...this.payload(),
        expectedRevision: this.note().revision,
        signatureAcknowledged: this.acknowledged,
      });
      await this.review();
      this.locked.emit();
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async addendum() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post(API_URLS.ADD_CLINICAL_ADDENDUM, {
        ...this.payload(),
        text: this.text,
        requestId: this.addendumRequestId,
        signatureAcknowledged: this.acknowledged,
      });
      this.text = '';
      this.addendumRequestId = crypto.randomUUID();
      await this.review();
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async exportPDF() {
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.post(API_URLS.EXPORT_CLINICAL_DOCUMENT, {
        ...this.payload(),
        format: 'PDF',
      });
      const file = await this.pdf.generate(result.note, {
        draft: result.draft,
        integrityHash: result.integrityHash,
      });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async exportFHIR() {
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.post(API_URLS.EXPORT_CLINICAL_DOCUMENT, this.payload());
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(result.bundle, null, 2)], { type: 'application/fhir+json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = (this.note()?.numeroDeConsulta || 'resumen-clinico') + '.fhir.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
}
