import { ClinicalPageSkeletonComponent } from '../../shared/clinical-page-skeleton.component';
import { FollowupContextComponent } from './followup-context.component';
import { BillingService } from '../../planes/billing.service';
import {
  Component,
  Input,
  TemplateRef,
  OnInit,
  OnDestroy,
  DestroyRef,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  ArrowLeft,
  User,
  Building2,
  ShieldAlert,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  FileText,
  Upload,
  Save,
  Box,
  Image,
  Paperclip,
  Sparkles,
  X,
  Check,
  Download,
  RotateCcw,
} from 'lucide-angular';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { AuthService } from '../../auth/auth.service';
import { PermissionService } from '../../auth/permission.service';
import { API_URLS } from '../../config/api-urls';
import { AppointmentContextService } from '../../appointments/appointment-context.service';
import { ClinicalNoteWorkflowComponent } from '../../clinical/clinical-note-workflow.component';
import { emptyClinicalCore } from '../../clinical/clinical-core.component';
import { Advanced3DViewerComponent } from '../../medicalUtilities/advanced-3d-viewer.component';
import { PrescriptionComposerService } from '../../recipes/prescription-composer.service';
import { FollowupSoapComponent } from './followup-soap.component';
import { SpecialtyFieldsComponent } from './specialty-fields.component';
import { SPECIALTY_SCHEMAS } from './specialty-schemas';
import { BODY_MODELS, DENTAL_MODELS, EYE_MODELS } from './followup-models';
import {
  normalizeSpecialty,
  decodeContextId,
  encodeContextId,
  emptySpecialty,
  mergeExtracted,
  isUnrecorded,
  legacySpecialtyData,
} from './followup-utils';
@Component({
  selector: 'app-followup-workspace',
  standalone: true,
  imports: [
    ClinicalPageSkeletonComponent,
    FollowupContextComponent,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    FollowupSoapComponent,
    SpecialtyFieldsComponent,
    ClinicalNoteWorkflowComponent,
    Advanced3DViewerComponent,
  ],
  templateUrl: './followup-workspace.component.html',
  styleUrls: ['./followup-workspace.component.css'],
})
export class FollowupWorkspaceComponent implements OnInit, OnDestroy {
  readonly billing = inject(BillingService);
  private aiAttempt: { payload: string; id: string } | null = null;

  @Input() specialtyCode = 'GEN';
  @Input() readOnly = false;
  @Input() extensionTemplate?: TemplateRef<any>;
  readonly icons = {
    ArrowLeft,
    User,
    Building2,
    ShieldAlert,
    Mic,
    MicOff,
    Pause,
    Play,
    Square,
    FileText,
    Upload,
    Save,
    Box,
    Image,
    Paperclip,
    Sparkles,
    X,
    Check,
    Download,
    RotateCcw,
  };
  private cdr = inject(ChangeDetectorRef);
  private api = inject(ClinicApiService);
  readonly auth = inject(AuthService);
  readonly permissions = inject(PermissionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private appointments = inject(AppointmentContextService);
  private prescriptions = inject(PrescriptionComposerService);
  loading = signal(true);
  saving = signal(false);
  reviewing = signal(false);
  error = signal('');
  notice = signal('');
  savedFollowUpId = signal('');
  attachments = signal<any[]>([]);
  recording = signal(false);
  paused = signal(false);
  seconds = signal(0);
  aiBusy = signal(false);
  privateBusy = signal(false);
  proposal = signal<any>(null);
  expanded = signal(false);
  attaching3D = signal(false);
  selectedModel = signal('');
  activeTab = 'consultation';
  get initialHistory() {
    return this.patient.clinicalCoreDraft || {};
  }
  code = 'GEN';
  patient: any = {};
  note: any = null;
  core: any = emptyClinicalCore();
  specialtyData: any = {};
  privateNotes = '';
  canSeePrivate = false;
  privateNotesLoaded = true;
  transcript = '';
  medicalSummary = '';
  replaceWithAi = false;
  idPatient = '';
  expedienteId = '';
  officeId = '';
  officeName = '';
  requestId = crypto.randomUUID();
  revision: number | undefined;
  private loadSequence = 0;
  private recognition: any;
  private timer?: ReturnType<typeof setInterval>;
  private speechBase = '';
  private speechFinal = '';
  private speechFatal = false;
  private destroyed = false;
  private uploads = new Set<XMLHttpRequest>();
  get activeModel() {
    return this.models.find((m) => m.id === this.selectedModel()) || this.models[0];
  }
  get schema() {
    return SPECIALTY_SCHEMAS[this.code] || SPECIALTY_SCHEMAS['GEN'];
  }
  get models() {
    return this.code === 'DENT' ? DENTAL_MODELS : this.code === 'OFTA' ? EYE_MODELS : BODY_MODELS;
  }
  get canWrite() {
    return (
      this.patient.idPaciente === this.idPatient &&
      !!this.idPatient &&
      !this.readOnly &&
      this.permissions.can('followUps', 'write') &&
      (!this.note || this.note.state === 'DRAFT') &&
      (!this.note?.registeredBy || this.note.registeredBy === this.auth.getSession()?.email) &&
      (!this.note?.specialtySchemaVersion || this.note.specialtySchemaVersion === 1)
    );
  }
  get disabled() {
    return !this.canWrite || this.loading() || this.saving();
  }
  get patientName() {
    const f = this.patient.fichaDeIdentificacion || {};
    return f.nombreCompleto || this.note?.header?.patient?.fullName || 'Paciente';
  }
  get recordNumber() {
    return this.patient.numeroDeExpediente || this.note?.numeroDeExpediente || this.idPatient;
  }
  get allergies() {
    const f = this.patient.fichaDeIdentificacion || {},
      a = this.patient.antecedentes || {};
    const value = f.alergias || a.alergias || this.patient.clinicalCoreDraft?.pathologicalHistory;
    return (
      (Array.isArray(value) ? value.join(', ') : value) ||
      'Sin alergias documentadas. Confirma con el paciente.'
    );
  }
  get criticalHistory() {
    return (
      this.patient.antecedentes?.enfermedadesCronicas ||
      this.patient.clinicalCoreDraft?.priorTreatments ||
      'Revisa los antecedentes relevantes del expediente.'
    );
  }
  get pastPhotos() {
    return (this.patient.followUps || [])
      .flatMap((f: any) => f.attachedImagesUrls || [])
      .filter((f: any) => f.type === 'image');
  }
  legacyLabel(key: string) {
    const labels: any = {
      weight: 'Peso (kg)',
      heightCm: 'Talla (cm)',
      temperature: 'Temperatura (°C)',
      systolic: 'Tensión sistólica',
      diastolic: 'Tensión diastólica',
      heartRate: 'Frecuencia cardiaca',
      respiratoryRate: 'Frecuencia respiratoria',
      oxygenSaturation: 'Saturación de oxígeno',
      code: 'Código',
      description: 'Descripción',
      type: 'Tipo',
      painIntensityEva: 'Dolor EVA',
      functionalActivities: 'Actividades funcionales',
      treatmentAdherence: 'Adherencia al tratamiento',
      newSymptoms: 'Síntomas nuevos',
      softTissueState: 'Tejidos blandos',
      rangeOfMotion: 'Arcos de movilidad',
      stabilityAndStrength: 'Estabilidad y fuerza',
      neurovascularState: 'Estado neurovascular',
      pharmacologicalModification: 'Modificación farmacológica',
      rehabilitationProgression: 'Progresión de rehabilitación',
      nextAppointmentRemoval: 'Próxima cita',
      selectedTreatmentType: 'Tipo de tratamiento',
      dentalPainLevel: 'Dolor dental',
      orthodonticComfort: 'Comodidad de ortodoncia',
      hygieneAndHabits: 'Higiene y hábitos',
      newDentalSymptoms: 'Síntomas dentales',
      gingivalAndPeriodontalState: 'Estado gingival y periodontal',
      applianceAndBracketStatus: 'Aparatos y brackets',
      enamelAndRestorationState: 'Esmalte y restauraciones',
      occlusionAndBiteState: 'Oclusión',
      ajusteArcoOrtodoncia: 'Ajuste de arco',
      procedimientoRealizado: 'Procedimiento realizado',
      recomendacionesProximaCita: 'Recomendaciones y próxima cita',
    };
    return labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  get proposalItems() {
    const p = this.proposal();
    if (!p) return [];
    const fields = [
        ...this.schema.groups.flatMap((g: any) => g.fields),
        ...this.schema.extraFields,
      ],
      coreLabels: any = {
        chiefComplaint: 'Motivo de consulta',
        evolution: 'Evolución',
        studies: 'Resultados de estudios',
        treatment: 'Tratamiento e indicaciones',
        prognosisLife: 'Pronóstico para la vida',
        prognosisFunction: 'Pronóstico para la función',
        vitals: 'Signos vitales',
        diagnoses: 'Diagnósticos dictados',
        familyHistory: 'Antecedentes heredofamiliares',
        pathologicalHistory: 'Antecedentes patológicos',
        nonPathologicalHistory: 'Antecedentes no patológicos',
        priorTreatments: 'Tratamientos previos',
        generalAppearance: 'Habitus exterior',
        systems: 'Aparatos y sistemas',
        physicalExam: 'Exploración por regiones',
        gynecology: 'Antecedentes ginecoobstétricos',
      };
    const human = (v: any): string =>
      Array.isArray(v)
        ? v.map(human).join(' · ')
        : v && typeof v === 'object'
          ? Object.entries(v)
              .map(([k, value]) => this.legacyLabel(k) + ': ' + human(value))
              .join('; ')
          : String(v ?? '');
    return [
      ...Object.entries(p.clinicalCore || {}).map(([k, v]) => ({
        label: coreLabels[k] || this.legacyLabel(k),
        value: human(v),
      })),
      ...Object.entries(p.specialtyData || {}).map(([k, v]) => ({
        label: fields.find((f: any) => f.key === k)?.label || this.legacyLabel(k),
        value: human(v),
      })),
    ];
  }
  get speechTime() {
    return (
      Math.floor(this.seconds() / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      (this.seconds() % 60).toString().padStart(2, '0')
    );
  }
  get legacySections() {
    return Object.entries(this.note || {})
      .filter(
        ([key, v]) =>
          ['subjectiveEvolution', 'physicalExamination', 'therapeuticPlanAdjustment'].includes(
            key,
          ) && v,
      )
      .map(([key, value]) => ({
        key,
        label: (
          {
            subjectiveEvolution: 'Evolución subjetiva',
            physicalExamination: 'Exploración física',
            therapeuticPlanAdjustment: 'Plan terapéutico',
          } as any
        )[key],
        items: Object.entries(value as any).map(([k, v]) => ({ key: k, value: v })),
      }));
  }
  ngOnInit() {
    this.code = normalizeSpecialty(this.specialtyCode);
    this.initSpeech();
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.load());
  }
  async load() {
    this.activeTab = 'consultation';
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.notice.set('');
    this.stopSpeech();
    this.proposal.set(null);
    this.aiBusy.set(false);
    this.privateBusy.set(false);
    this.canSeePrivate = false;
    this.privateNotes = '';
    this.patient = {};
    this.note = null;
    this.expanded.set(false);
    this.seconds.set(0);
    for (const xhr of this.uploads) xhr.abort();
    this.core = emptyClinicalCore();
    this.specialtyData = emptySpecialty(this.code);
    this.attachments.set([]);
    this.savedFollowUpId.set('');
    this.revision = undefined;
    this.transcript = '';
    this.medicalSummary = '';
    this.requestId = crypto.randomUUID();
    try {
      this.officeId = this.api.branchId();
      this.officeName = this.auth.getSucursal()?.name || 'Consultorio';
      this.idPatient = decodeContextId(this.route.snapshot.paramMap.get('id') || '');
      if (!this.officeId || !this.idPatient)
        throw new Error('Abre el seguimiento desde el expediente de un paciente.');
      const result = await this.api.post(API_URLS.GETPATIENTEXPEDIENT, {
        idConsultorio: this.officeId,
        idPaciente: this.idPatient,
      });
      if (sequence !== this.loadSequence || this.destroyed) return;
      this.assertOffice();
      this.patient = result.patient;
      this.expedienteId = this.patient.expedienteId || this.idPatient;
      const draftId = this.readOnly
        ? this.route.snapshot.paramMap.get('followUpId')
        : this.route.snapshot.queryParamMap.get('followUpId');
      const exp = this.readOnly
        ? this.route.snapshot.paramMap.get('expedienteId')
        : this.route.snapshot.queryParamMap.get('expedienteId');
      if (exp) this.expedienteId = decodeContextId(exp);
      if (draftId) {
        const r = await this.api.post(API_URLS.GETPATIENTFOLLOWUP, {
          ...this.context(),
          followUpId: decodeContextId(draftId),
        });
        if (sequence !== this.loadSequence || this.destroyed) return;
        this.note = r.followUp;
        this.code = normalizeSpecialty(this.note.specialtyCode || this.note.especialidad);
        this.specialtyData = {
          ...emptySpecialty(this.code),
          ...(this.note.specialtyData || legacySpecialtyData(this.note)),
        };
        this.core = { ...emptyClinicalCore(), ...this.note.clinicalCore };
        this.requestId = this.note.followUpId;
        this.revision = this.note.revision;
        this.savedFollowUpId.set(this.note.followUpId);
        this.medicalSummary = this.note.medicalSummary || '';
        this.attachments.set(
          (
            this.note.controlStudiesAndImages?.attachedImagesUrls ||
            this.note.attachedImagesUrls ||
            []
          ).map((f: any) => ({ ...f, id: crypto.randomUUID(), uploading: false, progress: 100 })),
        );
        this.canSeePrivate =
          this.code === 'PSI' && this.note.registeredBy === this.auth.getSession()?.email;
        this.privateNotesLoaded = !this.canSeePrivate;
        if (this.canSeePrivate) await this.loadPrivateNotes(sequence);
      } else {
        this.code = normalizeSpecialty(this.specialtyCode);
        this.specialtyData = emptySpecialty(this.code);
        this.core = {
          ...emptyClinicalCore(),
          ...this.patient.clinicalCoreDraft,
          documentKind: this.patient.clinicalHistoryClosedAt ? 'evolution' : 'initial-history',
        };
        const current = this.appointments.current();
        if (current && (current.idPaciente || current.idPatient) === this.idPatient)
          this.core.chiefComplaint = current.reason || this.core.chiefComplaint;
        this.canSeePrivate = this.code === 'PSI';
        this.privateNotesLoaded = true;
      }
      this.core.vitals = { ...(this.core.vitals || {}) };
      this.core.diagnoses = (this.core.diagnoses || []).map((d: any) => ({
        ...d,
        type: d.type || 'Presuntivo',
      }));
      this.core.demographicCodes ??= {};
      this.core.systems ??= {};
      this.core.physicalExam ??= {};
      this.core.gynecology ??= {};
      this.selectedModel.set(
        ['DENT', 'OFTA', 'TRAUM'].includes(this.code)
          ? this.models[0].id
          : this.models[this.models.length - 1].id,
      );
    } catch (e: any) {
      if (sequence === this.loadSequence) this.error.set(e.message);
    } finally {
      if (sequence === this.loadSequence) this.loading.set(false);
    }
  }
  async loadPrivateNotes(sequence = this.loadSequence) {
    if (!this.canSeePrivate || this.privateBusy()) return;
    this.privateBusy.set(true);
    try {
      const p = await this.api.post(API_URLS.GET_PRIVATE_PSYCHOTHERAPY_NOTES, {
        ...this.context(),
        followUpId: this.requestId,
      });
      if (sequence === this.loadSequence && !this.destroyed) {
        this.privateNotes = p.text || '';
        this.privateNotesLoaded = true;
        if (this.error().startsWith('No se pudieron cargar las notas privadas')) this.error.set('');
      }
    } catch {
      if (sequence === this.loadSequence && !this.destroyed)
        this.error.set(
          'No se pudieron cargar las notas privadas. No se sobrescribirán al guardar.',
        );
    } finally {
      if (sequence === this.loadSequence) this.privateBusy.set(false);
    }
  }
  private context() {
    return {
      idConsultorio: this.officeId,
      idPatient: this.idPatient,
      expedienteId: this.expedienteId,
    };
  }
  assertOffice() {
    if (this.api.branchId() !== this.officeId)
      throw new Error('El consultorio activo cambió. Regresa al expediente para continuar.');
  }
  changed() {
    this.notice.set('');
    this.core = { ...this.core, vitals: { ...this.core.vitals } };
    this.specialtyData = { ...this.specialtyData };
  }
  back() {
    this.stopSpeech();
    void this.router.navigate(['/expediente', encodeContextId(this.idPatient)]);
  }
  editDraft() {
    void this.router.navigate(['/expediente/nuevaRevision', encodeContextId(this.idPatient)], {
      queryParams: { followUpId: this.note.followUpId, expedienteId: this.expedienteId },
    });
  }
  async open3D() {
    try {
      if (!customElements.get('model-viewer')) await import('@google/model-viewer');
      this.expanded.set(true);
    } catch {
      this.error.set('No se pudo cargar el visor 3D. Revisa tu conexión.');
    }
  }
  async attach3DCapture(file: File) {
    if (this.disabled || this.attaching3D()) return;
    this.attaching3D.set(true);
    try {
      if (await this.upload(file)) {
        this.expanded.set(false);
        this.activeTab = 'consultation';
        this.notice.set(
          'Captura 3D añadida a Archivos adjuntos. Pulsa Guardar consulta para conservarla.',
        );
      }
    } finally {
      this.attaching3D.set(false);
    }
  }
  openPrescription() {
    if (this.disabled || !this.permissions.can('prescriptions', 'write')) return;
    this.stopSpeech();
    this.prescriptions
      .open({ patientId: this.idPatient, attachToConsultation: true, followUpId: this.requestId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.attachment) {
          this.attachments.update((files) => [
            ...files,
            { ...result.attachment, id: crypto.randomUUID() },
          ]);
          this.changed();
          this.notice.set(
            'Receta adjuntada. Pulsa Guardar consulta para conservarla en esta consulta.',
          );
        }
      });
  }
  async save() {
    if (this.disabled) return false;
    if (this.attachments().some((f) => f.uploading || f.error)) {
      this.error.set('Espera a que terminen las cargas o retira los archivos que fallaron.');
      return false;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      this.assertOffice();
      const s = this.auth.getSession(),
        payload: any = {
          ...this.context(),
          idDoctor: (s?.idDoctor || s?.email || '').trim().toLowerCase(),
          requestId: this.requestId,
          especialidad: this.code,
          specialtyCode: this.code,
          specialtySchemaVersion: 1,
          specialtyData: this.specialtyData,
          clinicalCore: this.core,
          consultationReason: this.core.chiefComplaint?.trim() || 'Sin definir',
          medicalSummary: this.medicalSummary,
          attachedImagesUrls: this.attachments().map(
            ({ name, url, type, mediumUrl, smallUrl }) => ({
              name,
              url,
              type,
              ...(mediumUrl ? { mediumUrl } : {}),
              ...(smallUrl ? { smallUrl } : {}),
            }),
          ),
          ...(this.revision !== undefined ? { expectedRevision: this.revision } : {}),
        };
      if (this.canSeePrivate && this.privateNotesLoaded)
        payload.privatePsychotherapyNotes = this.privateNotes;
      const result = await this.api.post(API_URLS.SAVEPATIENTFOLLOWUP, payload);
      this.savedFollowUpId.set(result.followUpId);
      this.requestId = result.followUpId;
      this.revision = (this.revision || 0) + 1;
      this.note = {
        ...this.note,
        state: 'DRAFT',
        registeredBy: s?.email,
        followUpId: result.followUpId,
        revision: this.revision,
        numeroDeConsulta: result.numeroDeConsulta,
      };
      this.notice.set(
        'Consulta guardada · ' +
          result.numeroDeConsulta +
          '. Incluye todas las pestañas y sus adjuntos. Pendiente de firma y cierre.',
      );
      return true;
    } catch (e: any) {
      this.error.set(e.message);
      return false;
    } finally {
      this.saving.set(false);
    }
  }
  async saveAndReview(workflow: ClinicalNoteWorkflowComponent) {
    if (this.disabled || this.reviewing() || this.recording() || this.aiBusy()) return;
    if (
      !this.medicalSummary
        ?.replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .trim()
    ) {
      this.error.set('Agrega el resumen médico antes de firmar y cerrar la consulta.');
      return;
    }
    this.reviewing.set(true);
    try {
      if (!(await this.save())) return;
      workflow.followUpId = this.savedFollowUpId();
      await workflow.review();
      if (workflow.error()) this.error.set(workflow.error());
    } finally {
      this.reviewing.set(false);
    }
  }
  locked() {
    this.note = { ...this.note, state: 'LOCKED' };
    this.stopSpeech();
    this.notice.set('La nota quedó firmada y cerrada.');
  }
  filesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    for (const file of Array.from(input.files || [])) void this.upload(file);
    input.value = '';
  }
  async upload(file: File) {
    if (this.disabled) return;
    const id = crypto.randomUUID(),
      type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : 'document';
    if (file.size > 25 * 1024 * 1024) {
      this.error.set('El archivo ' + file.name + ' excede 25 MB.');
      return;
    }
    const item: any = { id, name: file.name, type, url: '', uploading: true, progress: 0 };
    this.attachments.update((list) => [...list, item]);
    const sequence = this.loadSequence;
    try {
      this.assertOffice();
      const signed = await this.api.post(API_URLS.GETSIGNEDUPLOADURL, {
        idConsultorio: this.officeId,
        objectType: 'PATIENT',
        category: 'EXPEDIENT',
        documentType: type === 'image' ? 'PHOTO' : type === 'video' ? 'VIDEO' : 'FILE',
        idPatient: this.idPatient,
        idExpedient: this.expedienteId,
        idFollowups: this.requestId,
        contentType: file.type || 'application/octet-stream',
        originalFileName: file.name,
      });
      if (sequence !== this.loadSequence || this.destroyed) return;
      if (!signed.uploadUrl || !(signed.readUrl || signed.publicUrl))
        throw new Error('No se pudo preparar la carga.');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        this.uploads.add(xhr);
        xhr.open('PUT', signed.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && sequence === this.loadSequence)
            this.attachments.update((list) =>
              list.map((f) =>
                f.id === id ? { ...f, progress: Math.round((e.loaded / e.total) * 100) } : f,
              ),
            );
        };
        xhr.onload = () => {
          this.uploads.delete(xhr);
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error('Falló la subida al almacenamiento.'));
        };
        xhr.onerror = () => {
          this.uploads.delete(xhr);
          reject(new Error('No se pudo subir el archivo.'));
        };
        xhr.onabort = () => {
          this.uploads.delete(xhr);
          reject(new Error('Carga cancelada.'));
        };
        xhr.send(file);
      });
      if (sequence !== this.loadSequence || this.destroyed) return;
      this.attachments.update((list) =>
        list.map((f) =>
          f.id === id
            ? {
                ...f,
                url: signed.readUrl || signed.publicUrl,
                mediumUrl: signed.mediumReadUrl || '',
                smallUrl: signed.smallReadUrl || '',
                uploading: false,
                progress: 100,
              }
            : f,
        ),
      );
      this.changed();
      return true;
    } catch (e: any) {
      if (sequence === this.loadSequence && !this.destroyed) {
        this.attachments.update((list) =>
          list.map((f) => (f.id === id ? { ...f, uploading: false, error: true } : f)),
        );
        this.error.set(e.message);
      }
      return false;
    }
  }
  attachmentPreviewFailed(id: string) {
    this.attachments.update((files) =>
      files.map((file) => {
        if (file.id !== id) return file;
        // Storage generates thumbnails asynchronously after the original upload completes.
        if (file.smallUrl && file.smallUrl !== file.url && !file.previewOriginal)
          return { ...file, previewOriginal: true };
        return { ...file, previewUnavailable: true };
      }),
    );
  }
  removeFile(id: string) {
    if (!this.disabled) this.attachments.update((list) => list.filter((f) => f.id !== id));
  }
  initSpeech() {
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) return;
    this.recognition = new Speech();
    this.recognition.lang = 'es-MX';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) this.speechFinal += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      this.transcript = (this.speechBase + ' ' + this.speechFinal + ' ' + interim).trim();
      this.cdr.markForCheck();
    };
    this.recognition.onerror = (e: any) => {
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) {
        this.speechFatal = true;
        this.stopSpeech();
        this.error.set('No se pudo acceder al micrófono. Puedes escribir o pegar el dictado.');
      }
    };
    this.recognition.onend = () => {
      if (this.recording() && !this.paused() && !this.speechFatal) {
        this.speechBase = this.transcript;
        this.speechFinal = '';
        try {
          this.recognition.start();
        } catch {}
      }
    };
  }
  startSpeech() {
    if (this.disabled) return;
    if (!this.recognition) {
      this.error.set(
        'Este navegador no ofrece dictado de voz. Puedes escribir o pegar la transcripción.',
      );
      return;
    }
    this.speechFatal = false;
    this.speechBase = this.transcript;
    this.speechFinal = '';
    try {
      this.recognition.start();
      this.recording.set(true);
      this.paused.set(false);
      this.timer = setInterval(() => {
        if (!this.paused()) this.seconds.update((v) => v + 1);
      }, 1000);
    } catch {
      this.error.set('No se pudo iniciar el dictado.');
    }
  }
  pauseSpeech() {
    if (!this.recording()) return;
    this.paused.set(true);
    this.recognition?.stop();
  }
  resumeSpeech() {
    if (!this.recording()) return;
    this.speechBase = this.transcript;
    this.speechFinal = '';
    this.paused.set(false);
    try {
      this.recognition?.start();
    } catch {}
  }
  stopSpeech() {
    this.recording.set(false);
    this.paused.set(false);
    if (this.timer) clearInterval(this.timer);
    this.recognition?.stop();
  }
  async extract() {
    if (!this.billing.allows('ai')) {
      this.error.set('La interpretación IA requiere una suscripción activa.');
      return;
    }
    if (
      this.disabled ||
      this.aiBusy() ||
      !this.transcript.trim() ||
      !this.permissions.can('nexusI', 'write')
    )
      return;
    this.stopSpeech();
    this.aiBusy.set(true);
    this.error.set('');
    this.proposal.set(null);
    this.replaceWithAi = false;
    const sequence = this.loadSequence;
    try {
      this.assertOffice();
      const payload = {
        texto: this.transcript,
        specialtyCode: this.code,
        especiality: this.schema.name,
        tratementType: this.core.chiefComplaint || '',
      };
      const content = JSON.stringify(payload);
      if (this.aiAttempt?.payload !== content)
        this.aiAttempt = { payload: content, id: crypto.randomUUID() };
      const result = await this.api.post(API_URLS.GENERATEMEDICALSUMMARY, {
        ...payload,
        requestId: this.aiAttempt.id,
      });
      void this.billing.refresh();
      if (sequence === this.loadSequence && !this.destroyed) {
        this.assertOffice();
        if (
          !result.data ||
          typeof result.data.summaryText !== 'string' ||
          !result.data.summaryText.trim()
        )
          throw new Error('La IA no devolvió un resumen clínico válido. Intenta nuevamente.');
        if (result.data.specialtyCode && result.data.specialtyCode !== this.code)
          throw new Error('La interpretación no corresponde a la especialidad de esta consulta.');
        this.proposal.set(result.data);
        this.applyProposal(true);
      }
    } catch (e: any) {
      if (sequence === this.loadSequence && !this.destroyed) this.error.set(e.message);
    } finally {
      if (sequence === this.loadSequence) this.aiBusy.set(false);
    }
  }
  applyProposal(automatic = false) {
    if (!this.proposal() || this.disabled) return;
    this.core = mergeExtracted(
      this.core,
      this.proposal().clinicalCore,
      !automatic && this.replaceWithAi,
    );
    this.specialtyData = mergeExtracted(
      this.specialtyData,
      this.proposal().specialtyData,
      !automatic && this.replaceWithAi,
    );
    if (
      this.proposal().summaryText &&
      (automatic || this.replaceWithAi || isUnrecorded(this.medicalSummary))
    )
      this.medicalSummary = this.proposal().summaryText;
    if (!automatic) this.proposal.set(null);
    this.changed();
    this.notice.set(
      'Resumen generado y campos del dictado completados. Revisa todas las pestañas antes de guardar o firmar.',
    );
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.loadSequence++;
    this.stopSpeech();
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.abort?.();
    }
    for (const xhr of this.uploads) xhr.abort();
    this.privateNotes = '';
    this.proposal.set(null);
  }
}
