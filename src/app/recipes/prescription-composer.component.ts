import { BillingService } from '../planes/billing.service';
import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  LucideAngularModule,
  FilePenLine,
  Pill,
  Plus,
  Trash2,
  User,
  Building2,
  X,
  ShieldCheck,
  Download,
  Check,
  ArrowLeft,
  Mic,
  Square,
  Sparkles,
} from 'lucide-angular';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { PermissionService } from '../auth/permission.service';
import { API_URLS } from '../config/api-urls';
import { PrescriptionDocumentComponent } from './prescription-document.component';
import { PrescriptionPdfService } from './prescription-pdf.service';
import type { PrescriptionContext } from './prescription-composer.service';
export const MEDICATION_FIELDS = [
  {
    key: 'genericName',
    label: 'Denominación genérica o nombre',
    placeholder: 'Nombre del medicamento o sustancia activa',
    wide: true,
    required: true,
  },
  { key: 'dose', label: 'Dosis', placeholder: 'Cantidad por toma', required: true },
  { key: 'frequency', label: 'Frecuencia', placeholder: 'Intervalo entre tomas', required: true },
  {
    key: 'duration',
    label: 'Duración',
    placeholder: 'Días o tiempo de tratamiento',
    required: true,
  },
  {
    key: 'pharmaceuticalForm',
    label: 'Forma farmacéutica',
    placeholder: 'Tabletas, solución…',
    required: false,
  },
  {
    key: 'concentration',
    label: 'Concentración',
    placeholder: 'Concentración del medicamento',
    required: false,
  },
  {
    key: 'presentation',
    label: 'Presentación',
    placeholder: 'Presentación del envase',
    required: false,
  },
  {
    key: 'route',
    label: 'Vía de administración',
    placeholder: 'Escribe la vía completa',
    required: false,
  },
];
export const emptyMedicine = () => Object.fromEntries(MEDICATION_FIELDS.map((f) => [f.key, '']));
export function prescriptionPatient(p: any) {
  const f = p.fichaDeIdentificacion || {},
    g = p.generalIdentificationData || {};
  const birth = String(f.fechaNacimiento || g.birthDate || '').slice(0, 10);
  return {
    fullName:
      f.nombreCompleto ||
      g.nombreCompleto ||
      [g.firstName, g.paternalSurname, g.maternalSurname].filter(Boolean).join(' '),
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : '',
    age: String(f.edad ?? g.age ?? ''),
  };
}
@Component({
  selector: 'app-prescription-composer',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, PrescriptionDocumentComponent],
  templateUrl: './prescription-composer.component.html',
  styleUrl: './prescription-composer.component.css',
})
export class PrescriptionComposerComponent implements OnInit, OnDestroy {
  readonly billing = inject(BillingService);
  private cdr = inject(ChangeDetectorRef);
  readonly data = inject<PrescriptionContext>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<PrescriptionComposerComponent>);
  private api = inject(ClinicApiService);
  private permissions = inject(PermissionService);
  private pdf = inject(PrescriptionPdfService);
  @ViewChild('document') document?: ElementRef<HTMLElement>;
  readonly icons = {
    FilePenLine,
    Pill,
    Plus,
    Trash2,
    User,
    Building2,
    X,
    ShieldCheck,
    Download,
    Check,
    ArrowLeft,
    Mic,
    Square,
    Sparkles,
  };
  readonly fields = MEDICATION_FIELDS;
  loading = signal(true);
  busy = signal(false);
  stage = signal('');
  error = signal('');
  ready = signal(false);
  issued = signal<any>(null);
  hash = '';
  doctor: any = {};
  office: any = {};
  patient: any = {};
  expedienteId = '';
  customTemplate: any = null;
  templateId = 'ocean';
  orientation = 'portrait';
  medications = [emptyMedicine()];
  instructions = '';
  acknowledged = false;
  generalAcknowledged = false;
  private officeId = this.api.branchId();
  private requestId = crypto.randomUUID();
  pending: any = null;
  file?: File;
  get frozen() {
    return this.aiBusy() || this.busy() || !!this.pending || !!this.issued();
  }
  get valid() {
    return (
      !this.recording() &&
      !this.stopping() &&
      !this.aiBusy() &&
      this.ready() &&
      this.permissions.can('prescriptions', 'write') &&
      this.acknowledged &&
      this.generalAcknowledged &&
      this.medications.length > 0 &&
      this.medications.every((m) =>
        this.fields.filter((f) => f.required).every((f) => !!String(m[f.key] || '').trim()),
      ) &&
      !!this.patient.fullName &&
      !!(this.patient.birthDate || this.patient.age)
    );
  }
  get preview() {
    return (
      this.issued() || {
        draft: true,
        customTemplate: this.customTemplate,
        templateId: this.templateId,
        orientation: this.orientation,
        folio: 'Se asignará al emitir',
        createdAt: new Date().toISOString(),
        header: { author: this.doctor, office: this.office, patient: this.patient },
        medications: this.medications,
        instructions: this.instructions,
      }
    );
  }
  readonly recording = signal(false);
  readonly stopping = signal(false);
  readonly aiBusy = signal(false);
  readonly dictationSeconds = signal(0);
  readonly aiWarnings = signal<string[]>([]);
  readonly aiNotice = signal('');
  readonly speechError = signal('');
  dictation = '';
  replaceMedications = false;
  private recognition: any;
  private speechTimer?: ReturnType<typeof setInterval>;
  private settleTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  private aiAttempt?: { content: string; id: string };
  private appliedAttempt = '';
  get canUseDictation() {
    return (
      !!this.billing.state() &&
      !this.billing.error() &&
      this.permissions.can('nexusI', 'write') &&
      this.permissions.can('prescriptions', 'write')
    );
  }
  get elapsedDictation() {
    return (
      Math.floor(this.dictationSeconds() / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      (this.dictationSeconds() % 60).toString().padStart(2, '0')
    );
  }
  startDictation() {
    if (this.frozen || this.recording() || this.stopping() || !this.canUseDictation) return;
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      this.speechError.set(
        'Este navegador no ofrece dictado. Puedes escribir o pegar la transcripción para organizarla con IA.',
      );
      return;
    }
    this.speechError.set('');
    this.aiNotice.set('');
    let base = this.dictation,
      final = '';
    const recognition = (this.recognition = new Speech());
    recognition.lang = 'es-MX';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      if (this.destroyed) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      this.dictation = (base + ' ' + final + ' ' + interim).trim().slice(0, 12000);
      this.cdr.markForCheck();
    };
    recognition.onerror = (event: any) => {
      if (this.destroyed) return;
      if (
        ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(event.error)
      ) {
        this.stopDictation();
        this.stopping.set(false);
        this.speechError.set(
          'No se pudo continuar el dictado. Revisa el permiso del micrófono; tu transcripción se conserva.',
        );
      }
    };
    recognition.onend = () => {
      this.stopping.set(false);
      clearTimeout(this.settleTimer);
      if (this.recording() && !this.destroyed) {
        base = this.dictation;
        final = '';
        try {
          recognition.start();
        } catch {
          this.stopDictation();
          this.stopping.set(false);
        }
      }
    };
    try {
      recognition.start();
      this.recording.set(true);
      this.dictationSeconds.set(0);
      this.speechTimer = setInterval(() => {
        this.dictationSeconds.update((n) => n + 1);
        if (this.dictationSeconds() >= 600) {
          this.stopDictation();
          this.speechError.set(
            'Se alcanzaron 10 minutos de dictado. Puedes generar la prescripción o continuar con otro dictado.',
          );
        }
      }, 1000);
    } catch {
      this.speechError.set('No se pudo iniciar el micrófono. Puedes escribir la transcripción.');
    }
  }
  stopDictation() {
    const active = this.recording();
    this.recording.set(false);
    clearInterval(this.speechTimer);
    if (active) {
      this.stopping.set(true);
      try {
        this.recognition?.stop();
      } catch {
        this.stopping.set(false);
      }
      this.settleTimer = setTimeout(() => this.stopping.set(false), 2000);
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    clearInterval(this.speechTimer);
    clearTimeout(this.settleTimer);
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      try {
        this.recognition.abort();
      } catch {}
    }
  }
  async generateFromDictation() {
    if (
      this.frozen ||
      this.recording() ||
      this.stopping() ||
      !this.dictation.trim() ||
      !this.canUseDictation
    )
      return;
    if (!this.billing.active() && (this.billing.state()?.aiCredits || 0) < 1) {
      this.speechError.set('No tienes créditos IA. Recarga desde Planes.');
      return;
    }
    try {
      this.assertOffice();
    } catch (e: any) {
      this.speechError.set(e.message);
      return;
    }
    const payload = { idConsultorio: this.officeId, texto: this.dictation.trim() },
      content = JSON.stringify(payload);
    if (this.aiAttempt?.content !== content) this.aiAttempt = { content, id: crypto.randomUUID() };
    if (this.appliedAttempt === this.aiAttempt.id) {
      this.aiNotice.set(
        'Este dictado ya se agregó. Modifica la transcripción para generar otra propuesta.',
      );
      return;
    }
    const attempt = this.aiAttempt.id;
    this.aiBusy.set(true);
    this.speechError.set('');
    this.aiNotice.set('');
    try {
      const result = await this.api.post(API_URLS.GENERATE_PRESCRIPTION_FROM_DICTATION, {
        ...payload,
        requestId: attempt,
      });
      if (this.destroyed) return;
      this.assertOffice();
      if (!Array.isArray(result.data?.medications) || !result.data.medications.length)
        throw new Error('No se identificaron medicamentos. Revisa la transcripción.');
      const medicines = result.data.medications.map((m: any) =>
        Object.fromEntries(
          this.fields.map((f) => [
            f.key,
            String(m[f.key] || (f.key === 'genericName' ? m.name || m.brandName : '') || ''),
          ]),
        ),
      );
      const existing = this.replaceMedications
        ? []
        : this.medications.filter((m) => Object.values(m).some((v) => String(v).trim()));
      if (existing.length + medicines.length > 20)
        throw new Error(
          'La propuesta supera 20 medicamentos. Se conservó tu lista; reduce el dictado o selecciona reemplazar.',
        );
      this.medications = [...existing, ...medicines];
      const instructions = String(result.data.instructions || '').trim();
      if (instructions)
        this.instructions = this.replaceMedications
          ? instructions
          : [this.instructions, instructions].filter(Boolean).join('\n');
      this.aiWarnings.set(Array.isArray(result.data.warnings) ? result.data.warnings : []);
      this.acknowledged = false;
      this.generalAcknowledged = false;
      this.appliedAttempt = attempt;
      this.aiNotice.set(
        medicines.length +
          ' medicamento(s) organizados. Revisa nombres, dosis y campos pendientes antes de emitir.',
      );
      void this.billing.refresh();
    } catch (e: any) {
      if (!this.destroyed)
        this.speechError.set(e.message || 'No se pudo organizar el dictado. Puedes reintentar.');
    } finally {
      if (!this.destroyed) this.aiBusy.set(false);
    }
  }
  async ngOnInit() {
    await this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.data.patientId || !this.officeId)
        throw new Error('Selecciona un paciente y un consultorio válidos.');
      const [settings, identity, result] = await Promise.all([
        this.api.post(API_URLS.GET_PRESCRIPTION_SETTINGS, { idConsultorio: this.officeId }),
        this.api.post(API_URLS.GET_CLINICAL_IDENTITY, {}),
        this.api.post(API_URLS.GETPATIENTEXPEDIENT, {
          idConsultorio: this.officeId,
          idPaciente: this.data.patientId,
        }),
      ]);
      this.assertOffice();
      this.doctor = {
        ...settings.doctor,
        ...identity.profile,
        logoUrl: settings.doctor.logoUrl || identity.profile.prescriptionLogoUrl || '',
      };
      this.customTemplate = settings.customTemplate || null;
      this.office = settings.office;
      this.templateId = settings.settings.templateId;
      this.orientation = settings.settings.orientation || 'portrait';
      this.patient = prescriptionPatient(result.patient);
      this.expedienteId =
        result.patient.expedienteId ||
        (result.patient['follow-ups'] || result.patient.followUps || []).find(
          (f: any) => f.expedienteId,
        )?.expedienteId ||
        (/odon|dent/i.test(result.patient.especialidad || '') ? this.data.patientId : 'exp_001');
      if (!this.doctor.signatureImage)
        throw new Error(
          'Agrega tu firma en Configuración → Identidad y firma antes de emitir una receta.',
        );
      this.ready.set(true);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }
  add() {
    if (!this.frozen && this.medications.length < 20) this.medications.push(emptyMedicine());
  }
  remove(index: number) {
    if (!this.frozen) this.medications.splice(index, 1);
  }
  assertOffice() {
    if (this.api.branchId() !== this.officeId)
      throw new Error(
        'Cambió el consultorio activo. Cierra esta pantalla y vuelve a abrir el expediente.',
      );
  }
  close() {
    if (!this.busy()) {
      this.stopDictation();
      this.ref.close();
    }
  }
  async save() {
    if (this.busy() || (!this.pending && !this.valid)) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.assertOffice();
      if (!this.issued()) {
        this.pending ??= structuredClone({
          idConsultorio: this.officeId,
          idPaciente: this.data.patientId,
          expedienteId: this.expedienteId,
          requestId: this.requestId,
          patient: this.patient,
          medications: this.medications,
          instructions: this.instructions,
          signatureAcknowledged: this.acknowledged,
          generalPrescriptionAcknowledged: this.generalAcknowledged,
        });
        this.stage.set('Emitiendo receta…');
        const result = await this.api.post(API_URLS.ISSUE_PRESCRIPTION, this.pending);
        this.issued.set(result.prescription);
        this.hash = result.integrityHash;
      }
      if (!this.file) {
        this.stage.set('Generando PDF…');
        await this.waitForQr();
        this.file = await this.pdf.generate(
          this.document!.nativeElement.querySelector('.rx-sheet')!,
          this.issued().folio,
        );
      }
      if (this.data.attachToConsultation) {
        this.stage.set('Subiendo PDF a archivos adjuntos…');
        const attachment = await this.pdf.upload(
          this.file,
          this.data.patientId,
          this.expedienteId,
          this.officeId,
          this.data.followUpId,
        );
        this.ref.close({ attachment, folio: this.issued().folio });
      } else this.pdf.download(this.file);
    } catch (e: any) {
      if (!this.issued() && e.name === 'ClinicApiResponseError') this.pending = null;
      this.error.set(e.message || 'No se pudo completar la emisión. Puedes volver a intentarlo.');
    } finally {
      this.busy.set(false);
      this.stage.set('');
    }
  }
  private async waitForQr() {
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const qr = this.document?.nativeElement.querySelector('app-prescription-qr img');
      if (qr && qr.getAttribute('alt')?.includes('identificadores')) return;
    }
    throw new Error(
      'La receta se emitió, pero no se generó el QR. Vuelve a intentar generar el PDF.',
    );
  }
}
