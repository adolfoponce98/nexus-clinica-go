import { Component, signal, OnDestroy, inject, computed, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import CryptoJS from 'crypto-js';
import { AuthService } from '../../../../auth/auth.service';
import { Advanced3DViewerComponent } from '../../../../medicalUtilities/advanced-3d-viewer.component';
import {
  LucideAngularModule, Activity, ShieldCheck, FileText, Stethoscope,
  ImageIcon, Calendar, Clock, ChevronRight, Mic, MicOff, Pause, Play, Square, X, CheckCircle2, Upload, AlertCircle, Sparkles, ArrowLeft
} from 'lucide-angular';

interface UploadedFileItem {
  name: string;
  url: string;           // URL original
  mediumUrl?: string;    // URL versión mediana
  smallUrl?: string;     // URL versión pequeña (thumbnail)
  type: string;          // 'image', 'video' o 'document'
  uploading: boolean;    // True si está subiendo al bucket
  progress: number;      // Porcentaje de subida (0 a 100)
  error?: boolean;
}

@Component({
  selector: 'app-medical-followup',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Advanced3DViewerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: 'medical-followup.component.html'
})
export class MedicalFollowupComponent implements OnDestroy, OnInit {
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

  // Parámetros de contexto
  idDoctor = signal('12345');
  idConsultorio = signal('consultorio_01');
  idPatient = signal('paciente_abc_789');
  expedienteId = signal('exp_001');

  nombreConsultorio = '';
  nombreMedico = '';

  // --- LÓGICA DE MODELOS 3D DINÁMICOS ---
  isLoadingModel = signal<boolean>(true);
  isExpanded = signal<boolean>(false);
  selectedModelId = signal<string>('modelo-1');
  huesoActivo = signal<string>('');

  // Estados de guardado
  isSaving = signal(false);
  saveSuccess = signal(false);

  traumaModels = [
    {
      id: 'modelo-1',
      name: 'Pie',
      description: 'pie',
      thumbnail: 'assets/huesos/pie.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_pie.glb?alt=media&token=dec3eb9f-bc43-4f97-87fa-510f22efa4d2'
    },
    {
      id: 'modelo-2',
      name: 'Pierna',
      description: 'Pierna',
      thumbnail: 'assets/huesos/pierna.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_pierna.glb?alt=media&token=0e7f2398-2145-4066-8c2f-9f7c0f964ffb'
    },
    {
      id: 'modelo-3',
      name: 'Torso',
      description: 'Torso',
      thumbnail: 'assets/huesos/torso.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_torso.glb?alt=media&token=52fcae0c-1867-4c2b-8926-9ab0c75af6f6'
    },
    {
      id: 'modelo-4',
      name: 'Brazo',
      description: 'Brazo',
      thumbnail: 'assets/huesos/brazo.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_brazo.glb?alt=media&token=80be2fcc-7e53-4202-8cdc-f16d65265a80'
    },
    {
      id: 'modelo-5',
      name: 'Craneo',
      description: 'Craneo',
      thumbnail: 'assets/huesos/craneo.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fcraneo_humano-v1.glb?alt=media&token=049550bd-4976-4b02-bb50-ec6763348bf6'
    },
    {
      id: 'modelo-6',
      name: 'Esqueleto',
      description: 'Esqueleto completo',
      thumbnail: 'assets/huesos/esqueleto.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FMeshy_AI_Detailed_Male_Skeleto_1008020424_texture-v2.glb?alt=media&token=322a983e-d72d-4df2-904f-092a281ae58a'
    }
  ];

  activeTraumaModel = computed(() => {
    return this.traumaModels.find(m => m.id === this.selectedModelId()) || this.traumaModels[0];
  });

  selectModel(id: string) {
    if (this.selectedModelId() !== id) {
      this.isLoadingModel.set(true);
      this.selectedModelId.set(id);
    }
  }

  toggleExpand() {
    this.isExpanded.update(v => !v);
  }

  onModelLoaded() {
    this.isLoadingModel.set(false);
  }

  onModelError(event: any) {
    this.isLoadingModel.set(false);
    console.error('Error detallado de model-viewer:', event);
  }

  // Formulario - Sección 1: Evolución Subjetiva
  painIntensityEva = signal('Disminuyó significativamente (EVA 2-4)');
  functionalActivities = signal('');
  treatmentAdherence = signal('');
  newSymptoms = signal('');

  // Nuevos campos agregados
  dispositivosApoyo = signal('');
  toleranciaMedicamentos = signal('');

  // Formulario - Sección 2: Exploración Física
  softTissueState = signal('');
  rangeOfMotion = signal('');
  stabilityAndStrength = signal('');
  neurovascularState = signal('');

  // Nuevo campo agregado
  banderasRojas = signal('');

  // Formulario - Sección 3: Archivos y Multimedia
  uploadedFiles = signal<UploadedFileItem[]>([]);

  // Mapeamos enviando la original, medium y small en cada objeto listo para guardar
  imagesUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'image' && !f.uploading && !f.error).map(f => ({
    name: f.name,
    url: f.url,
    mediumUrl: f.mediumUrl || '',
    smallUrl: f.smallUrl || '',
    type: 'image'
  })));

  documentsUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'document' && !f.uploading && !f.error).map(f => ({
    name: f.name,
    url: f.url,
    type: 'document'
  })));

  videosUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'video' && !f.uploading && !f.error).map(f => ({
    name: f.name,
    url: f.url,
    type: 'video'
  })));

  // Formulario - Sección 4: Plan Terapéutico
  modificacionFarmacologica = signal('');
  progresionRehabilitacion = signal('');
  retiroProximaCita = signal('');

  // Formulario - Sección 5: Resumen Médico / IA
  resumenMedico = signal('');
  isGeneratingAI = signal(false);
  resumenGeneradoIA = signal<string>('');

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
    const defaultOffice = this.authService.getSucursal();
    this.nombreConsultorio = "Consultorio " + defaultOffice?.name || 'Consultorio Default';

    const sessionData = this.authService.getSession();
    const email = sessionData?.email || '';
    const sanitizedDoctorId = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

    this.idDoctor.set(sanitizedDoctorId);
    this.idConsultorio.set(defaultOffice.idConsultorio || 'consultorio_general');

    this.nombreMedico = email ? email.split('@')[0].toUpperCase() : 'DOCTOR';

    this.route.paramMap.subscribe(params => {
      const safeUrlId = params.get('id');

      if (safeUrlId) {
        try {
          const ciphertext = atob(safeUrlId);
          const bytes = CryptoJS.AES.decrypt(ciphertext, this.ENCRYPTION_KEY);
          const decryptedId = bytes.toString(CryptoJS.enc.Utf8);

          if (decryptedId) {
            this.idPatient.set(decryptedId);
          }
        } catch (e) {
          console.error('Error al desencriptar el ID del paciente:', e);
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

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

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
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      alert('Sesión expirada o no encontrada.');
      this.router.navigate(['/login']);
      return;
    }

    const payload = {
      objectType: 'PATIENT',
      category: 'EXPEDIENT',
      documentType: documentType,
      idPatient: this.idPatient(),
      idExpedient: this.expedienteId(),
      contentType: file.type,
      originalFileName: file.name
    };

    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-app-signature': this.APP_SECRET_HEADER,
      'x-client-source': 'angular',
      'Authorization': `Bearer ${jwtToken}`
    });

    this.http.post<any>('https://getsigneduploadurl-o7vmreizjq-uc.a.run.app', { encryptedData: ciphertext }, { headers }).subscribe({
      next: (res) => {
        try {
          const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
          const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

          if (decryptedResponse && decryptedResponse.success && decryptedResponse.uploadUrl) {
            const uploadHeaders = new HttpHeaders({ 'Content-Type': file.type });

            this.http.put(decryptedResponse.uploadUrl, file, {
              headers: uploadHeaders,
              reportProgress: true,
              observe: 'events'
            }).subscribe({
              next: (uploadEvent: any) => {
                if (uploadEvent.type === 1 && uploadEvent.total) {
                  const percent = Math.round((uploadEvent.loaded / uploadEvent.total) * 100);
                  this.updateFileProgress(file.name, percent);
                }
              },
              complete: () => {
                const secureReadUrl = decryptedResponse.readUrl || decryptedResponse.publicUrl;
                const mediumUrl = decryptedResponse.mediumReadUrl || '';
                const smallUrl = decryptedResponse.smallReadUrl || '';

                this.updateFileSuccess(file.name, secureReadUrl, mediumUrl, smallUrl);
              },
              error: (err) => {
                console.error('Error subiendo archivo:', err);
                this.updateFileError(file.name);
              }
            });
          } else {
            this.updateFileError(file.name);
          }
        } catch (decryptErr) {
          this.updateFileError(file.name);
        }
      },
      error: () => this.updateFileError(file.name)
    });
  }

  isVisualMedia(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
  }

  private updateFileProgress(fileName: string, progress: number) {
    this.uploadedFiles.update(files =>
      files.map(f => f.name === fileName ? { ...f, progress } : f)
    );
  }

  private updateFileSuccess(fileName: string, publicUrl: string, mediumUrl: string, smallUrl: string) {
    this.uploadedFiles.update(files =>
      files.map(f => f.name === fileName ? {
        ...f,
        url: publicUrl,
        mediumUrl: mediumUrl,
        smallUrl: smallUrl,
        uploading: false,
        progress: 100
      } : f)
    );
  }

  private updateFileError(fileName: string) {
    this.uploadedFiles.update(files =>
      files.map(f => f.name === fileName ? { ...f, uploading: false, error: true } : f)
    );
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

    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      alert('Sesión expirada. Inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    this.isSaving.set(true);
    this.saveSuccess.set(false);

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
      // Nuevos campos incluidos en el payload
      dispositivosApoyo: this.dispositivosApoyo(),
      toleranciaMedicamentos: this.toleranciaMedicamentos(),
      softTissueState: this.softTissueState(),
      rangeOfMotion: this.rangeOfMotion(),
      stabilityAndStrength: this.stabilityAndStrength(),
      neurovascularState: this.neurovascularState(),
      // Nuevo campo incluido en el payload
      banderasRojas: this.banderasRojas(),
      attachedImagesUrls: attachedImagesUrls,
      pharmacologicalModification: this.modificacionFarmacologica(),
      rehabilitationProgression: this.progresionRehabilitacion(),
      nextAppointmentRemoval: this.retiroProximaCita(),
      medicalSummary: this.resumenMedico()
    };

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
          this.saveSuccess.set(true);

          setTimeout(() => {
            this.volverAlListado();
          }, 1200);
        } else {
          alert('Error al registrar el seguimiento.');
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveSuccess.set(false);
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
