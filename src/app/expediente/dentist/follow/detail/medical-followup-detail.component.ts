import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import CryptoJS from 'crypto-js';
import { AuthService } from '../../../../auth/auth.service';
import {
  LucideAngularModule, Activity, ShieldCheck, FileText, Stethoscope,
  ImageIcon, Calendar, Clock, ChevronRight, X, CheckCircle2, Upload, AlertCircle, Sparkles, ArrowLeft,
  Smile, ShieldAlert, Sparkle, FileSpreadsheet, FileCode
} from 'lucide-angular';

interface UploadedFileItem {
  name: string;
  url: string;
  type: string;
}

@Component({
  selector: 'app-odontology-followup-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: 'odontology-followup-detail.component.html'
})
export class OdontologyFollowupDetailComponent implements OnInit {
  readonly icons = {
    Activity, ShieldCheck, FileText, Stethoscope,
    ImageIcon, Calendar, Clock, ChevronRight, X, CheckCircle2, Upload, AlertCircle, Sparkles,
    ArrowLeft, Smile, ShieldAlert, Sparkle, FileSpreadsheet, FileCode
  };

  authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';
  private readonly GET_FOLLOWUP_URL = 'https://getpatientfollowup-o7vmreizjq-uc.a.run.app';

  idDoctor = signal('');
  idConsultorio = signal('');
  idPatient = signal('');
  expedienteId = signal('');
  followUpId = signal('');

  // Tipo de tratamiento seleccionado
  selectedTreatmentType = signal<string>('general');

  // Formulario - Sección 1
  dentalPainLevel = signal('');
  orthodonticComfort = signal('');
  hygieneAndHabits = signal('');
  newDentalSymptoms = signal('');

  // Formulario - Sección 2
  gingivalAndPeriodontalState = signal('');
  applianceAndBracketStatus = signal('');
  enamelAndRestorationState = signal('');
  occlusionAndBiteState = signal('');

  // Formulario - Sección 3: Archivos y Multimedia
  uploadedFiles = signal<UploadedFileItem[]>([]);

  // Formulario - Sección 4
  ajusteArcoOrtodoncia = signal('');
  procedimientoRealizado = signal('');
  recomendacionesProximaCita = signal('');

  // Formulario - Sección 5: Resumen Médico
  resumenMedico = signal('');
  isLoading = signal(true);

ngOnInit() {
  const sessionData = this.authService.getSession();
  const email = sessionData?.email || '';
  const sanitizedDoctorId = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

  this.idDoctor.set(sanitizedDoctorId);
  const defaultOffice = this.authService.getSucursal();
  this.idConsultorio.set(defaultOffice.idConsultorio || 'consultorio_general');

  // Capturar parámetros de la ruta (id del paciente y followUpId)
  this.route.paramMap.subscribe(params => {
    const safePatientUrlId = params.get('id');
    const safeFollowUpUrlId = params.get('followUpId');

    if (safePatientUrlId) {
      try {
        // Decodificamos la URI si viene codificada y aplicamos AES directamente (sin atob si no se usó btoa)
        const decryptedBytes = CryptoJS.AES.decrypt(decodeURIComponent(safePatientUrlId), this.ENCRYPTION_KEY);
        const decryptedId = decryptedBytes.toString(CryptoJS.enc.Utf8);

        if (decryptedId) {
          this.idPatient.set(decryptedId);
          this.expedienteId.set(decryptedId);
        } else {
          // Fallback por si acaso venía en texto plano
          this.idPatient.set(safePatientUrlId);
          this.expedienteId.set(safePatientUrlId);
        }
      } catch (e) {
        // Si falla la desencriptación, asumimos que es texto plano
        this.idPatient.set(safePatientUrlId);
        this.expedienteId.set(safePatientUrlId);
      }
    }

    if (safeFollowUpUrlId) {
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(decodeURIComponent(safeFollowUpUrlId), this.ENCRYPTION_KEY);
        const decryptedFollowUpId = decryptedBytes.toString(CryptoJS.enc.Utf8);

        this.followUpId.set(decryptedFollowUpId || safeFollowUpUrlId);
      } catch (e) {
        this.followUpId.set(safeFollowUpUrlId);
      }
    }

    // Una vez obtenidos los IDs necesarios, consultamos el servicio
    if (this.idPatient() && this.followUpId()) {
      this.fetchFollowUpDetail();
    }
  });
}

fetchFollowUpDetail() {
    this.isLoading.set(true); // Aseguramos que empiece activo
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      this.isLoading.set(false);
      alert('Sesión expirada o no encontrada.');
      this.router.navigate(['/login']);
      return;
    }

    const payload = {
      idDoctor: this.idDoctor(),
      idConsultorio: this.idConsultorio(),
      idPatient: this.idPatient(),
      expedienteId: this.expedienteId(),
      followUpId: this.followUpId()
    };

    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-app-signature': this.APP_SECRET_HEADER,
      'x-client-source': 'angular',
      'Authorization': `Bearer ${jwtToken}`
    });

    this.http.post<any>(this.GET_FOLLOWUP_URL, { encryptedData: ciphertext }, { headers }).subscribe({
      next: (res) => {
        this.isLoading.set(false); // Ocultamos el loader
        try {
          const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
          const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

          if (decryptedResponse && decryptedResponse.success && decryptedResponse.followUp) {
            const data = decryptedResponse.followUp;

            // Precargar especialidad / tipo de tratamiento
            if (data.especialidad) {
              this.selectedTreatmentType.set(data.especialidad.toLowerCase());
            }

            // Sección 1: Evolución Subjetiva
            const subj = data.subjectiveEvolution || {};
            this.dentalPainLevel.set(subj.dentalPainLevel || subj.painIntensityEva || 'Sin especificar');
            this.orthodonticComfort.set(subj.orthodonticComfort || subj.functionalActivities || subj.treatmentAdherence || '');
            this.hygieneAndHabits.set(subj.hygieneAndHabits || '');
            this.newDentalSymptoms.set(subj.newDentalSymptoms || subj.newSymptoms || '');

            // Sección 2: Exploración Clínica
            const phys = data.physicalExamination || {};
            this.gingivalAndPeriodontalState.set(phys.gingivalAndPeriodontalState || phys.softTissueState || '');
            this.applianceAndBracketStatus.set(phys.applianceAndBracketStatus || phys.rangeOfMotion || '');
            this.enamelAndRestorationState.set(phys.enamelAndRestorationState || phys.stabilityAndStrength || '');
            this.occlusionAndBiteState.set(phys.occlusionAndBiteState || phys.neurovascularState || '');

            // Sección 3: Estudios e Imágenes
            const controlStudies = data.controlStudiesAndImages?.attachedImagesUrls || [];
            this.uploadedFiles.set(controlStudies);

            // Sección 4: Plan Odontológico
            const plan = data.therapeuticPlanAdjustment || {};
            this.ajusteArcoOrtodoncia.set(plan.ajusteArcoOrtodoncia || plan.pharmacologicalModification || '');
            this.procedimientoRealizado.set(plan.procedimientoRealizado || plan.rehabilitationProgression || '');
            this.recomendacionesProximaCita.set(plan.recomendacionesProximaCita || plan.nextAppointmentRemoval || '');

            // Sección 5: Resumen Médico
            this.resumenMedico.set(data.medicalSummary || '');

          } else {
            alert(decryptedResponse.error || 'No se pudo cargar el detalle del seguimiento.');
          }
        } catch (decryptErr) {
          console.error('Error al desencriptar el detalle del seguimiento:', decryptErr);
        }
      },
      error: (err) => {
        this.isLoading.set(false); // Ocultamos el loader en caso de error de red
        console.error('Error de red al consultar el seguimiento:', err);
      }
    });
  }
volverAlListado() {
  let rawPatientId = this.route.snapshot.paramMap.get('id') || '';

  try {
    // Si viene cifrado de la URL actual, lo desencriptamos para pasarlo limpio
    const decryptedBytes = CryptoJS.AES.decrypt(decodeURIComponent(rawPatientId), this.ENCRYPTION_KEY);
    const decryptedId = decryptedBytes.toString(CryptoJS.enc.Utf8);
    if (decryptedId) {
      rawPatientId = decryptedId;
    }
  } catch (e) {
    // Si ya era plano o falla, lo dejamos tal cual
  }

  // Navegamos pasando el ID limpio/plano
  this.router.navigate(['/expediente', rawPatientId]);
}

  isVisualMedia(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
  }
}
