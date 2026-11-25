import { ClinicalDocumentViewComponent } from '../../../../clinical/clinical-document-view.component';
import { ClinicalNoteWorkflowComponent } from '../../../../clinical/clinical-note-workflow.component';
import { SECURITY_CONFIG } from '../../../../config/security.config';
import { API_URLS } from '../../../../config/api-urls';
import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import CryptoJS from 'crypto-js';
import { AuthService } from '../../../../auth/auth.service';
import {
  LucideAngularModule,
  Activity,
  ShieldCheck,
  FileText,
  Stethoscope,
  ImageIcon,
  Calendar,
  Clock,
  ChevronRight,
  X,
  ArrowLeft,
  Download,
  AlertCircle,
} from 'lucide-angular';

interface UploadedFileItem {
  name: string;
  url: string;
  type: string;
}

@Component({
  selector: 'app-medical-followup-detail',
  standalone: true,
  imports: [
    ClinicalDocumentViewComponent,
    ClinicalNoteWorkflowComponent,
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: 'medical-followup-detail.component.html',
})
export class MedicalFollowupDetailComponent implements OnInit {
  readonly icons = {
    Activity,
    ShieldCheck,
    FileText,
    Stethoscope,
    ImageIcon,
    Calendar,
    Clock,
    ChevronRight,
    X,
    ArrowLeft,
    Download,
    AlertCircle,
  };

  authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;
  private readonly GET_FOLLOWUP_URL = API_URLS.GETPATIENTFOLLOWUP;

  // Parámetros de contexto
  idDoctor = signal('');
  idConsultorio = signal('');
  idPatient = signal('');
  expedienteId = signal('');
  followUpId = signal('');
  clinicalDocument = signal<any>(null);
  visibleConsultationId = signal('');
  consultationReason = signal('');
  isLoading = signal(true);

  // Formulario - Sección 1: Evolución Temporal y Subjetiva
  painIntensityEva = signal('');
  functionalActivities = signal('');
  treatmentAdherence = signal('');
  newSymptoms = signal('');

  // Formulario - Sección 2: Exploración Física Evolutiva
  softTissueState = signal('');
  rangeOfMotion = signal('');
  stabilityAndStrength = signal('');
  neurovascularState = signal('');

  // Formulario - Sección 3: Estudios de Control y Radiografías Adjuntas
  uploadedFiles = signal<UploadedFileItem[]>([]);

  // Formulario - Sección 4: Plan Terapéutico y Pronóstico
  pharmacologicalModification = signal('');
  rehabilitationProgression = signal('');
  nextAppointmentRemoval = signal('');

  // Formulario - Sección 5: Resumen Médico
  resumenMedico = signal('');

  // Estado para el Modal de Vista Previa de Imágenes
  selectedImageForPreview = signal<{ name: string; url: string; type: string } | null>(null);

  ngOnInit() {
    const sessionData = this.authService.getSession();
    const email = sessionData?.idDoctor || sessionData?.email || '';
    const sanitizedDoctorId = email
      .trim()
      .toLowerCase()
      .replace(/[\/\\]/g, '_');

    this.idDoctor.set(sanitizedDoctorId);
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio.set(defaultOffice?.idConsultorio || 'consultorio_general');

    // Capturar parámetros de la ruta: /expediente/detail/:id/:expedienteId/:followUpId
    this.route.paramMap.subscribe((params) => {
      const safePatientUrlId = params.get('id');
      const safeExpedienteUrlId = params.get('expedienteId'); // 👈 Capturamos el expediente por separado
      const safeFollowUpUrlId = params.get('followUpId');

      // 1. Desencriptar ID del Paciente
      if (safePatientUrlId) {
        try {
          const decryptedBytes = CryptoJS.AES.decrypt(
            decodeURIComponent(safePatientUrlId),
            this.ENCRYPTION_KEY,
          );
          const decryptedId = decryptedBytes.toString(CryptoJS.enc.Utf8);
          this.idPatient.set(decryptedId || safePatientUrlId);
        } catch (e) {
          this.idPatient.set(safePatientUrlId);
        }
      }

      // 2. Desencriptar ID del Expediente
      if (safeExpedienteUrlId) {
        try {
          const decryptedBytes = CryptoJS.AES.decrypt(
            decodeURIComponent(safeExpedienteUrlId),
            this.ENCRYPTION_KEY,
          );
          const decryptedExpId = decryptedBytes.toString(CryptoJS.enc.Utf8);
          this.expedienteId.set(decryptedExpId || safeExpedienteUrlId);
        } catch (e) {
          this.expedienteId.set(safeExpedienteUrlId);
        }
      }

      // 3. Desencriptar FollowUp ID
      if (safeFollowUpUrlId) {
        try {
          const decryptedBytes = CryptoJS.AES.decrypt(
            decodeURIComponent(safeFollowUpUrlId),
            this.ENCRYPTION_KEY,
          );
          const decryptedFollowUpId = decryptedBytes.toString(CryptoJS.enc.Utf8);
          this.followUpId.set(decryptedFollowUpId || safeFollowUpUrlId);
        } catch (e) {
          this.followUpId.set(safeFollowUpUrlId);
        }
      }

      // Validar que se tengan todos los parámetros necesarios antes de consultar
      if (this.idPatient() && this.expedienteId() && this.followUpId()) {
        this.fetchFollowUpDetail();
      } else {
        this.isLoading.set(false);
        console.error(
          '⚠️ Faltan parámetros obligatorios en la ruta para consultar el seguimiento.',
        );
      }
    });
  }

  fetchFollowUpDetail() {
    this.isLoading.set(true);
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      this.isLoading.set(false);
      alert('Sesión expirada o no encontrada.');
      this.router.navigate(['/login']);
      return;
    }

    const payload = {
      idDoctor: this.idDoctor(), // ej. "ponceadolfo00@gmail.com"
      idConsultorio: this.idConsultorio(), // ej. "Jk5iVCkl8pJ8PuyynjWj"
      idPatient: this.idPatient(), // ej. "Jk5iVCkl8pJ8PuyynjWj_2026-10-28-00-04-40_7396"
      expedienteId: this.expedienteId(), // ej. "exp_001"
      followUpId: this.followUpId(), // ej. "exp_001_2026-10-28"
    };

    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      this.ENCRYPTION_KEY,
    ).toString();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-app-signature': this.APP_SECRET_HEADER,
      'x-client-source': 'angular',
      Authorization: `Bearer ${jwtToken}`,
    });

    this.http
      .post<any>(this.GET_FOLLOWUP_URL, { encryptedData: ciphertext }, { headers })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          try {
            const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
            const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

            if (decryptedResponse && decryptedResponse.success && decryptedResponse.followUp) {
              const data = decryptedResponse.followUp;
              this.clinicalDocument.set(data);
              this.visibleConsultationId.set(
                data.numeroDeConsulta || data.followUpDisplayId || data.followUpId || '',
              );
              this.consultationReason.set(data.consultationReason || 'Sin motivo registrado');

              // Sección 1: Evolución Temporal y Subjetiva
              const subj = data.subjectiveEvolution || {};
              this.painIntensityEva.set(subj.painIntensityEva || 'Sin especificar');
              this.functionalActivities.set(subj.functionalActivities || '');
              this.treatmentAdherence.set(subj.treatmentAdherence || '');
              this.newSymptoms.set(subj.newSymptoms || '');

              // Sección 2: Exploración Física Evolutiva
              const phys = data.physicalExamination || {};
              this.softTissueState.set(phys.softTissueState || '');
              this.rangeOfMotion.set(phys.rangeOfMotion || '');
              this.stabilityAndStrength.set(phys.stabilityAndStrength || '');
              this.neurovascularState.set(phys.neurovascularState || '');

              // Sección 3: Estudios de Control e Imagenología
              const controlStudies = data.controlStudiesAndImages?.attachedImagesUrls || [];
              this.uploadedFiles.set(controlStudies);

              // Sección 4: Plan Terapéutico y Pronóstico
              const plan = data.therapeuticPlanAdjustment || {};
              this.pharmacologicalModification.set(plan.pharmacologicalModification || '');
              this.rehabilitationProgression.set(plan.rehabilitationProgression || '');
              this.nextAppointmentRemoval.set(plan.nextAppointmentRemoval || '');

              // Sección 5: Resumen Médico
              this.resumenMedico.set(data.medicalSummary || '');
            } else {
              alert(decryptedResponse?.error || 'No se pudo cargar el detalle del seguimiento.');
            }
          } catch (decryptErr) {
            console.error('Error al desencriptar el detalle del seguimiento:', decryptErr);
            alert('Error al procesar la respuesta del servidor.');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error de red al consultar el seguimiento:', err);
          alert('Ocurrió un error de red al intentar consultar el seguimiento.');
        },
      });
  }

  volverAlListado() {
    let rawPatientId = this.route.snapshot.paramMap.get('id') || '';

    try {
      const decryptedBytes = CryptoJS.AES.decrypt(
        decodeURIComponent(rawPatientId),
        this.ENCRYPTION_KEY,
      );
      const decryptedId = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (decryptedId) {
        rawPatientId = decryptedId;
      }
    } catch (e) {}

    this.router.navigate(['/expediente', rawPatientId]);
  }

  openPreview(img: { name: string; url: string; type: string }) {
    this.selectedImageForPreview.set(img);
  }

  closePreview() {
    this.selectedImageForPreview.set(null);
  }

  isVisualMedia(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
  }
}
