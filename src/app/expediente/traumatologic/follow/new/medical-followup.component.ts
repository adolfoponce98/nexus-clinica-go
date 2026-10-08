import { Component, signal, OnDestroy, inject, computed ,OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import CryptoJS from 'crypto-js';
import { AuthService } from '../../../../auth/auth.service';
import {
  LucideAngularModule, Activity, ShieldCheck, FileText, Stethoscope,
  ImageIcon, Calendar, Clock, ChevronRight, Mic, MicOff, Pause, Play, Square, X, CheckCircle2, Upload, AlertCircle, Sparkles, ArrowLeft
} from 'lucide-angular';

interface UploadedFileItem {
  name: string;
  url: string;         // URL pública en Storage (o local temporal mientras sube)
  type: string;        // 'image', 'video' o 'document'
  uploading: boolean;  // True si está subiendo al bucket
  progress: number;    // Porcentaje de subida (0 a 100)
  error?: boolean;
}

@Component({
  selector: 'app-medical-followup',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: 'medical-followup.component.html'
})
export class MedicalFollowupComponent implements OnDestroy,OnInit {
  readonly icons = {
    Activity, ShieldCheck, FileText, Stethoscope,
    ImageIcon, Calendar, Clock, ChevronRight, Mic, MicOff, Pause, Play, Square, X, CheckCircle2, Upload, AlertCircle, Sparkles,
    ArrowLeft
  };
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Claves de seguridad para encriptar el payload hacia savePatientFollowUp
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  // Parámetros de contexto recibidos por ruta o sesión (ejemplo predeterminado)
  idDoctor = signal('12345');
  idConsultorio = signal('consultorio_01');
  idPatient = signal('paciente_abc_789');
  expedienteId = signal('exp_001');

  // Formulario - Sección 1: Evolución Subjetiva
  painIntensityEva = signal('Disminuyó significativamente (EVA 2-4)');
  functionalActivities = signal('');
  treatmentAdherence = signal('');
  newSymptoms = signal('');

  // Formulario - Sección 2: Exploración Física
  softTissueState = signal('');
  rangeOfMotion = signal('');
  stabilityAndStrength = signal('');
  neurovascularState = signal('');

  // Formulario - Sección 3: Archivos y Multimedia (con progreso y separación por categorías)
  uploadedFiles = signal<UploadedFileItem[]>([]);

  // Listas computadas separadas por tipo de archivo para enviar ordenadamente
  imagesUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'image' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'image' })));
  documentsUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'document' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'document' })));
  videosUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'video' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'video' })));

  // Formulario - Sección 4: Plan Terapéutico
  modificacionFarmacologica = signal('');
  progresionRehabilitacion = signal('');
  retiroProximaCita = signal('');

  // Formulario - Sección 5: Resumen Médico / IA
  resumenMedico = signal('');
  isGeneratingAI = signal(false);
  resumenGeneradoIA = signal<string>('');
  isSaving = signal(false);

  // Grabación de voz
  isRecordingActive = signal(false);
  isRecordingPaused = signal(false);
  recordingTime = signal('00:00');
  private timer: any = null;
  private seconds = 0;
  private recognition: any = null;
  private finalTranscriptBeforePause = '';

  constructor() {
    this.initSpeechRecognition();
  }

ngOnInit() {
    // 1. Obtener datos de sesión para idDoctor e idConsultorio
    const sessionData = this.authService.getSession();
    const email = sessionData?.email || '';
    const sanitizedDoctorId = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

    this.idDoctor.set(sanitizedDoctorId);
    this.idConsultorio.set('consultorio_general'); // O tu valor predeterminado

    // 2. Capturar y desencriptar el idPatient que viaja por la URL de forma segura
    this.route.paramMap.subscribe(params => {
      const safeUrlId = params.get('id');

      if (safeUrlId) {
        try {
          const ciphertext = atob(safeUrlId);
          const bytes = CryptoJS.AES.decrypt(ciphertext, this.ENCRYPTION_KEY);
          const decryptedId = bytes.toString(CryptoJS.enc.Utf8);

          if (decryptedId) {
            this.idPatient.set(decryptedId);
            console.log('✅ ID de paciente recuperado y desencriptado:', decryptedId);
          } else {
            console.error('❌ El ID desencriptado está vacío.');
          }
        } catch (e) {
          console.error('❌ Error al desencriptar el ID del paciente desde la ruta:', e);
        }
      }
    });
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (event: any) => {
        if (this.isRecordingPaused()) return;
        let interimTranscript = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (currentFinal) {
          this.finalTranscriptBeforePause += currentFinal;
        }
        this.resumenMedico.set(this.finalTranscriptBeforePause + interimTranscript);
      };

      this.recognition.onend = () => {
        if (this.isRecordingActive() && !this.isRecordingPaused()) {
          try { this.recognition.start(); } catch (e) {}
        }
      };
    }
  }

  volverAlListado() {
    this.router.navigate(['/expediente', this.idPatient()]);
  }

  // 📂 Manejo de Selección y Subida Automática a Firebase Storage mediante URL Firmada
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Determinar tipo de documento
    let fileTypeCategory = 'document';
    let docTypeEnum = 'FILE';
    if (file.type.startsWith('image/')) {
      fileTypeCategory = 'image';
      docTypeEnum = 'PHOTO';
    } else if (file.type.startsWith('video/')) {
      fileTypeCategory = 'video';
      docTypeEnum = 'VIDEO';
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const newItem: UploadedFileItem = {
      name: file.name,
      url: localPreviewUrl,
      type: fileTypeCategory,
      uploading: true,
      progress: 10
    };

    this.uploadedFiles.update(files => [...files, newItem]);
    this.uploadFileToStorage(file, docTypeEnum, newItem);
  }

private uploadFileToStorage(file: File, documentType: string, itemRef: UploadedFileItem) {
  // 1. Obtener la sesión activa con tu AuthService
  const sessionData = this.authService.getSession();
  const jwtToken = sessionData?.sessionToken;

  if (!jwtToken) {
    alert('Sesión expirada o no encontrada. Por favor inicia sesión de nuevo.');
    this.router.navigate(['/login']);
    return;
  }

  // 2. Preparar el payload
  const payload = {
    objectType: 'PATIENT',
    category: 'EXPEDIENT',
    documentType: documentType,
    idPatient: this.idPatient(),
    idExpedient: this.expedienteId(),
    contentType: file.type,
    originalFileName: file.name
  };

  // 3. Encriptar el payload con CryptoJS AES
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-app-signature': this.APP_SECRET_HEADER,
    'x-client-source': 'angular',
    'Authorization': `Bearer ${jwtToken}`
  });

  // 4. Solicitar URL firmada a la Cloud Function
  this.http.post<any>('https://getsigneduploadurl-o7vmreizjq-uc.a.run.app', { encryptedData: ciphertext }, { headers }).subscribe({
    next: (res) => {
      try {
        // Desencriptar la respuesta del servidor
        const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
        const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        if (decryptedResponse && decryptedResponse.success && decryptedResponse.uploadUrl) {
          const uploadHeaders = new HttpHeaders({ 'Content-Type': file.type });

          // 5. Subir binario directo a Google Cloud Storage usando la URL firmada (PUT)
          this.http.put(decryptedResponse.uploadUrl, file, {
            headers: uploadHeaders,
            reportProgress: true,
            observe: 'events'
          }).subscribe({
            next: (uploadEvent: any) => {
              if (uploadEvent.type === 1 && uploadEvent.total) {
                const percent = Math.round((uploadEvent.loaded / uploadEvent.total) * 100);
                this.updateFileProgress(file.name, percent, false);
              }
            },
            complete: () => {
              // 6. Usar 'readUrl' en lugar de publicUrl para que la previsualización cargue sin AccessDenied
              const secureReadUrl = decryptedResponse.readUrl || decryptedResponse.publicUrl;
              this.updateFileSuccess(file.name, secureReadUrl);
            },
            error: (err) => {
              console.error('Error subiendo binario a Storage:', err);
              this.updateFileError(file.name);
            }
          });
        } else {
          console.error('Error del servidor:', decryptedResponse.error);
          this.updateFileError(file.name);
        }
      } catch (decryptErr) {
        console.error('Error al desencriptar la respuesta de la Cloud Function:', decryptErr);
        this.updateFileError(file.name);
      }
    },
    error: (err) => {
      console.error('Error HTTP obteniendo URL firmada:', err);
      this.updateFileError(file.name);
    }
  });
}
// En tu lista de iconos de Lucide-angular añade: FileSpreadsheet, FileCode, etc., si los usas.

// Método para obtener el icono o color según la extensión del archivo
getFileIconConfig(fileName: string): { iconName: string, bgColor: string, textColor: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'pdf':
      return { iconName: 'FileText', bgColor: 'bg-rose-500/10', textColor: 'text-rose-400' };
    case 'doc':
    case 'docx':
      return { iconName: 'FileText', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' };
    case 'xls':
    case 'xlsx':
      return { iconName: 'FileSpreadsheet', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400' };
    case 'txt':
      return { iconName: 'FileCode', bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-400' };
    default:
      return { iconName: 'FileText', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400' };
  }
}

// Helper para saber si el archivo es una imagen o video reproducible visualmente
isVisualMedia(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
}
  private updateFileProgress(fileName: string, progress: number, uploading: boolean) {
    this.uploadedFiles.update(files =>
      files.map(f => f.name === fileName ? { ...f, progress } : f)
    );
  }

  private updateFileSuccess(fileName: string, publicUrl: string) {
    this.uploadedFiles.update(files =>
      files.map(f => f.name === fileName ? { ...f, url: publicUrl, uploading: false, progress: 100 } : f)
    );
  }

  private updateFileError(fileName: string) {
    this.uploadedFiles.update(files =>
      files.map(f => f.name === fileName ? { ...f, uploading: false, error: true } : f)
    );
    alert(`No se pudo subir el archivo: ${fileName}. Intenta de nuevo.`);
  }

  // Controles de voz
  startVoiceRecording() {
    this.isRecordingActive.set(true);
    this.isRecordingPaused.set(false);
    this.seconds = 0;
    this.recordingTime.set('00:00');
    this.finalTranscriptBeforePause = this.resumenMedico();

    if (this.recognition) {
      try { this.recognition.start(); } catch (e) {}
    } else {
      alert('Tu navegador no soporta dictado por voz nativo.');
    }

    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.isRecordingPaused()) {
        this.seconds++;
        const mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
        const secs = (this.seconds % 60).toString().padStart(2, '0');
        this.recordingTime.set(`${mins}:${secs}`);
      }
    }, 1000);
  }

  pauseVoiceRecording() {
    this.isRecordingPaused.set(true);
    if (this.recognition) this.recognition.stop();
  }

  resumeVoiceRecording() {
    this.isRecordingPaused.set(false);
    this.finalTranscriptBeforePause = this.resumenMedico() + ' ';
    if (this.recognition) {
      try { this.recognition.start(); } catch (e) {}
    }
  }

  stopVoiceRecording() {
    clearInterval(this.timer);
    if (this.recognition) this.recognition.stop();
    this.isRecordingActive.set(false);
    this.isRecordingPaused.set(false);
  }

  cancelVoiceRecording() {
    clearInterval(this.timer);
    if (this.recognition) this.recognition.stop();
    this.isRecordingActive.set(false);
    this.isRecordingPaused.set(false);
  }

  // Procesamiento con IA
  generarResumenMedicoIA() {
    const textoDictado = this.resumenMedico().trim();
    if (!textoDictado) return;

    this.isGeneratingAI.set(true);
    this.resumenGeneradoIA.set('');

    const urlCloudFunction = 'https://generatemedicalsummary-fjo7ia7ora-uc.a.run.app';
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post<any>(urlCloudFunction, { texto: textoDictado }, { headers }).subscribe({
      next: (response) => {
        this.isGeneratingAI.set(false);
        if (response && response.success && response.data) {
          const info = response.data;
          let htmlLimpio = (info.resumenHtml || '').replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/i, '').trim();

          this.modificacionFarmacologica.set(info.modificacionFarmacologica || '');
          this.progresionRehabilitacion.set(info.progresionRehabilitacion || '');
          this.retiroProximaCita.set(info.retiroProximaCita || '');
          this.resumenGeneradoIA.set(htmlLimpio);
        } else {
          this.resumenGeneradoIA.set(response?.error || '<p>No se pudo procesar el resumen clínico.</p>');
        }
      },
      error: (err) => {
        this.isGeneratingAI.set(false);
        console.error('Error IA:', err);
      }
    });
  }

 saveFollowupRecord() {
  const pendingUploads = this.uploadedFiles().some(f => f.uploading);
  if (pendingUploads) {
    alert('Hay archivos terminando de subirse al servidor. Por favor espera un momento.');
    return;
  }

  // Obtener token de sesión activo
  const sessionData = this.authService.getSession();
  const jwtToken = sessionData?.sessionToken;

  if (!jwtToken) {
    alert('Sesión expirada. Inicia sesión nuevamente.');
    this.router.navigate(['/login']);
    return;
  }

  this.isSaving.set(true);

  // Consolidar URLs ordenadas
  const attachedImagesUrls = [
    ...this.imagesUrls(),
    ...this.documentsUrls(),
    ...this.videosUrls()
  ];

  const rawPayload = {
    idDoctor: this.idDoctor(),
    idConsultorio: this.idConsultorio(),
    idPatient: this.idPatient(),
    expedienteId: this.expedienteId(),
    painIntensityEva: this.painIntensityEva(),
    functionalActivities: this.functionalActivities(),
    treatmentAdherence: this.treatmentAdherence(),
    newSymptoms: this.newSymptoms(),
    softTissueState: this.softTissueState(),
    rangeOfMotion: this.rangeOfMotion(),
    stabilityAndStrength: this.stabilityAndStrength(),
    neurovascularState: this.neurovascularState(),
    attachedImagesUrls: attachedImagesUrls,
    pharmacologicalModification: this.modificacionFarmacologica(),
    rehabilitationProgression: this.progresionRehabilitacion(),
    nextAppointmentRemoval: this.retiroProximaCita(),
    medicalSummary: this.resumenMedico()
  };

  // Cifrar con la llave AES de tu entorno
  const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(rawPayload), this.ENCRYPTION_KEY).toString();

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,
    'x-app-signature': this.APP_SECRET_HEADER,
    'x-client-source': 'angular'
  });

  const urlSave = 'https://savepatientfollowup-o7vmreizjq-uc.a.run.app';

  this.http.post<any>(urlSave, { encryptedData }, { headers }).subscribe({
    next: (res) => {
      this.isSaving.set(false);
      if (res && res.encryptedData) {
        alert('¡Consulta de seguimiento guardada y expediente actualizado con éxito!');
        this.volverAlListado();
      } else {
        alert('Error al registrar el seguimiento.');
      }
    },
    error: (err) => {
      this.isSaving.set(false);
      console.error('Error guardando seguimiento:', err);
      alert('Ocurrió un error de red al intentar guardar el seguimiento.');
    }
  });
}

  ngOnDestroy() {
    clearInterval(this.timer);
    if (this.recognition) this.recognition.stop();
  }
}
