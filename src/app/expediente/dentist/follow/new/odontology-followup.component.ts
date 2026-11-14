import { Component, signal, OnDestroy, inject, computed, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import CryptoJS from 'crypto-js';
import { AuthService } from '../../../../auth/auth.service';
import {
  LucideAngularModule, Activity, ShieldCheck, FileText, Stethoscope,
  ImageIcon, Calendar, Clock, ChevronRight, Mic, MicOff, Pause, Play, Square, X, CheckCircle2, Upload, AlertCircle, Sparkles, ArrowLeft,
  Smile, ShieldAlert, Sparkle, FileSpreadsheet, FileCode, User, Box, Check
} from 'lucide-angular';

interface UploadedFileItem {
  name: string;
  url: string;
  type: string;
  uploading: boolean;
  progress: number;
  error?: boolean;
}

@Component({
  selector: 'app-odontology-followup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: 'odontology-followup.component.html'
})
export class OdontologyFollowupComponent implements OnDestroy, OnInit {
  readonly icons = {
    Activity, ShieldCheck, FileText, Stethoscope, User, Box, Check,
    ImageIcon, Calendar, Clock, ChevronRight, Mic, MicOff, Pause, Play, Square, X, CheckCircle2, Upload, AlertCircle, Sparkles,
    ArrowLeft, Smile, ShieldAlert, Sparkle, FileSpreadsheet, FileCode
  };

  authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  idDoctor = signal('');
  idConsultorio = signal('');
  idPatient = signal('');
  expedienteId = signal('');

  recordForm: FormGroup;
  activeTab = signal<string>('seguimiento');
  selectedTooth = signal<number | null>(null);

  // Las 4 pestañas definidas
  tabs = [
    { id: 'seguimiento', name: 'Seguimiento y Evolución', icon: Stethoscope },
    { id: 'habitos', name: 'Hábitos de Higiene', icon: FileText },
    { id: 'odontograma', name: 'Examen Odontograma', icon: Activity },
    { id: 'infografia', name: 'Infografía 3D', icon: Box }
  ];

  // --- LÓGICA DE MODELOS 3D DENTAL ---
  isLoadingModel = signal<boolean>(true);
  selectedModelId = signal<string>('diente-1');
  modelOpacity = signal<number>(1);

  dentalModels = [
    {
      id: 'diente-1',
      name: 'ANATOMIA MUELA',
      description: 'Anatomía coronal y radicular',
      thumbnail: 'assets/dientes/modelo_muela1.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FDIENTE_CAPAS.glb?alt=media&token=9e5d852a-eca0-41b3-bd11-e2d77589fd37'
    },
    {
      id: 'diente-2',
      name: 'ANATOMIA DIENTE',
      description: 'Pieza unirradicular de soporte',
      thumbnail: 'assets/dientes/modelo_muela2.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FMUELA_INTERIOR.glb?alt=media&token=d72ee6ce-1f6a-412e-bfc9-6d47e7318ba5'
    },
    {
      id: 'diente-3',
      name: 'MODELO DENTADURA',
      description: 'Estructura multirradicular y cúspides',
      thumbnail: 'assets/dientes/dentadura.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FDENTADURA_MODELO_BLANCO.glb?alt=media&token=d4c335fb-9347-48b8-8ed9-92738790e95d'
    }
  ];

  activeDentalModel = computed(() => {
    return this.dentalModels.find(m => m.id === this.selectedModelId()) || this.dentalModels[0];
  });

  selectModel(id: string) {
    if (this.selectedModelId() !== id) {
      this.isLoadingModel.set(true);
      this.selectedModelId.set(id);
      this.modelOpacity.set(1);
    }
  }

  onModelLoaded() {
    this.isLoadingModel.set(false);
  }

  onModelError(event: any) {
    this.isLoadingModel.set(false);
    console.error('Error detallado de model-viewer:', event);
  }

  toggleExpand() {
    console.log('Ampliar visor 3D');
  }

  // Estatus de piezas dentales
  toothStatuses: { [key: string]: { label: string; colorClass: string; bgClass: string } } = {
    sano: { label: 'Sano', colorClass: 'border-zinc-700', bgClass: 'bg-zinc-800/90' },
    resina: { label: 'Resina', colorClass: 'border-blue-500', bgClass: 'bg-blue-500/25 text-blue-400' },
    extraccion: { label: 'Extracción', colorClass: 'border-rose-500', bgClass: 'bg-rose-500/25 text-rose-400' },
    limpieza: { label: 'Limpieza', colorClass: 'border-emerald-500', bgClass: 'bg-emerald-500/25 text-emerald-400' },
    blanqueamiento: { label: 'Blanqueamiento', colorClass: 'border-amber-500', bgClass: 'bg-amber-500/25 text-amber-400' }
  };
  toothStatusMap = signal<{ [key: number]: string }>({});

  ToothStatus(pieza: number) {
    const statusKey = this.toothStatusMap()[pieza] || 'sano';
    return this.toothStatuses[statusKey];
  }

  cycleToothStatus(pieza: number) {
    const statuses = ['', 'resina', 'extraccion', 'limpieza', 'blanqueamiento'];
    const currentVal = this.toothStatusMap()[pieza] || '';
    const currentIndex = statuses.indexOf(currentVal);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];

    this.recordForm.get(`pieza_${pieza}`)?.setValue(nextStatus);

    const currentMap = { ...this.toothStatusMap() };
    if (!nextStatus) {
      delete currentMap[pieza];
    } else {
      currentMap[pieza] = nextStatus;
    }
    this.toothStatusMap.set(currentMap);
    this.selectedTooth.set(pieza);
  }

  onStatusSelectChange(pieza: number, event: any) {
    const val = event.target.value;
    const currentMap = { ...this.toothStatusMap() };
    if (!val) {
      delete currentMap[pieza];
    } else {
      currentMap[pieza] = val;
    }
    this.toothStatusMap.set(currentMap);
    this.selectedTooth.set(pieza);
  }

  getToothImage(pieza: number): string {
    const tipo = pieza % 10;
    if (tipo === 1 || tipo === 2) return '/assets/dientes/incisivo.png';
    if (tipo === 3) return '/assets/dientes/canino.png';
    if (tipo === 4 || tipo === 5) return '/assets/dientes/premolar.png';
    return '/assets/dientes/molar.png';
  }

  // Tipo de tratamiento seleccionado
  selectedTreatmentType = signal<string>('general');

  // Formulario de Evolución y Seguimiento
  dentalPainLevel = signal('Sin dolor / Confortable (EVA 0)');
  orthodonticComfort = signal('');
  hygieneAndHabits = signal('');
  newDentalSymptoms = signal('');

  gingivalAndPeriodontalState = signal('');
  applianceAndBracketStatus = signal('');
  enamelAndRestorationState = signal('');
  occlusionAndBiteState = signal('');

  uploadedFiles = signal<UploadedFileItem[]>([]);
  imagesUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'image' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'image' })));
  documentsUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'document' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'document' })));
  videosUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'video' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'video' })));

  ajusteArcoOrtodoncia = signal('');
  procedimientoRealizado = signal('');
  recomendacionesProximaCita = signal('');

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
    this.recordForm = this.fb.group({
      frecuenciaCepillado: [''],
      usaHiloDental: [false],
      bruxism: [false],
      muerdeDedos: [false],
      muerdeLengua: [false],
      muerdeLabios: [false],
      muerdeUnias: [false],
      muerdeObjetos: [false],
      pieza_11: [''], pieza_12: [''], pieza_13: [''], pieza_14: [''], pieza_15: [''], pieza_16: [''], pieza_17: [''], pieza_18: [''],
      pieza_21: [''], pieza_22: [''], pieza_23: [''], pieza_24: [''], pieza_25: [''], pieza_26: [''], pieza_27: [''], pieza_28: [''],
      pieza_31: [''], pieza_32: [''], pieza_33: [''], pieza_34: [''], pieza_35: [''], pieza_36: [''], pieza_37: [''], pieza_38: [''],
      pieza_41: [''], pieza_42: [''], pieza_43: [''], pieza_44: [''], pieza_45: [''], pieza_46: [''], pieza_47: [''], pieza_48: ['']
    });
    this.initSpeechRecognition();
  }

  ngOnInit() {
    const sessionData = this.authService.getSession();
    const email = sessionData?.email || '';
    const sanitizedDoctorId = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

    this.idDoctor.set(sanitizedDoctorId);
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio.set(defaultOffice?.idConsultorio || 'consultorio_general');

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
          console.error('Error al desencriptar ID de paciente:', e);
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
                this.updateFileSuccess(file.name, secureReadUrl);
              },
              error: () => {
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
    this.uploadedFiles.update(files => files.map(f => f.name === fileName ? { ...f, progress } : f));
  }

  private updateFileSuccess(fileName: string, publicUrl: string) {
    this.uploadedFiles.update(files => files.map(f => f.name === fileName ? { ...f, url: publicUrl, uploading: false, progress: 100 } : f));
  }

  private updateFileError(fileName: string) {
    this.uploadedFiles.update(files => files.map(f => f.name === fileName ? { ...f, uploading: false, error: true } : f));
    alert(`No se pudo subir el archivo: ${fileName}.`);
  }

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

    const bodyPayload = {
      texto: textoDictado,
      especiality: 'Odontología',
      tratementType: this.selectedTreatmentType()
    };

    this.http.post<any>(urlCloudFunction, bodyPayload, { headers }).subscribe({
      next: (response) => {
        this.isGeneratingAI.set(false);
        if (response && response.success && response.data) {
          const info = response.data;
          let htmlLimpio = (info.resumenHtml || '').replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/i, '').trim();

          if (info.evolucionYAdaptacionGeneral) this.orthodonticComfort.set(info.evolucionYAdaptacionGeneral);
          if (info.habitosDeHigieneYUsoDeAuxiliares) this.hygieneAndHabits.set(info.habitosDeHigieneYUsoDeAuxiliares);
          if (info.sintomasEspecificosOHallazgosReportados) this.newDentalSymptoms.set(info.sintomasEspecificosOHallazgosReportados);
          if (info.estadoGingivalYPeriodontal) this.gingivalAndPeriodontalState.set(info.estadoGingivalYPeriodontal);
          if (info.estadoDeBracketsArcosYLigas || info.tonoDentalYEstadoDelEsmalte || info.estadoDelAlveoloYCicatrizacion) {
            this.applianceAndBracketStatus.set(
              info.estadoDeBracketsArcosYLigas ||
              info.tonoDentalYEstadoDelEsmalte ||
              info.estadoDelAlveoloYCicatrizacion || ''
            );
          }
          if (info.esmalteLimpiezaYRestauracionesPrevias) this.enamelAndRestorationState.set(info.esmalteLimpiezaYRestauracionesPrevias);
          if (info.oclusionMordidaYPiezasInvolucradas) this.occlusionAndBiteState.set(info.oclusionMordidaYPiezasInvolucradas);
          if (info.tecnicaQuirurgicaYSutura) this.ajusteArcoOrtodoncia.set(info.tecnicaQuirurgicaYSutura);
          if (info.procedimientoRealizadoHoy) this.procedimientoRealizado.set(info.procedimientoRealizadoHoy);
          if (info.indicacionesYProximaCita) this.recomendacionesProximaCita.set(info.indicacionesYProximaCita);

          this.resumenGeneradoIA.set(htmlLimpio);
        } else {
          this.resumenGeneradoIA.set(response?.error || '<p>No se pudo procesar el resumen estomatológico.</p>');
        }
      },
      error: (err) => {
        this.isGeneratingAI.set(false);
        console.error('Error IA Dental:', err);
      }
    });
  }

  // --- BOTONES DE GUARDADO INDEPENDIENTES POR CADA TAB ---

  saveFollowupRecord() {
    const pendingUploads = this.uploadedFiles().some(f => f.uploading);
    if (pendingUploads) {
      alert('Hay archivos terminando de subirse al servidor. Por favor espera un momento.');
      return;
    }
    this.enviarDatosAlServidor({ tipoRegistro: 'seguimiento' });
  }

  saveHabitsRecord() {
    this.enviarDatosAlServidor({ tipoRegistro: 'habitos' });
  }

  saveOdontogramRecord() {
    this.enviarDatosAlServidor({ tipoRegistro: 'odontograma' });
  }

  saveInfographicRecord() {
    alert('¡Registro de infografía 3D guardado correctamente!');
  }

  private enviarDatosAlServidor(extraInfo: any) {
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      alert('Sesión expirada. Inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    this.isSaving.set(true);

    const attachedImagesUrls = [
      ...this.imagesUrls(),
      ...this.documentsUrls(),
      ...this.videosUrls()
    ];

    const formValues = this.recordForm.value;
    const odontogram: { [key: string]: string } = {};
    for (let p of [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48]) {
      odontogram[`tooth_${p}`] = formValues[`pieza_${p}`] || '';
    }

    const rawPayload = {
      especialidad: 'odontologia',
      idDoctor: this.idDoctor(),
      idConsultorio: this.idConsultorio(),
      idPatient: this.idPatient(),
      expedienteId: this.idPatient(),
      selectedTreatmentType: this.selectedTreatmentType(),
      dentalPainLevel: this.dentalPainLevel(),
      orthodonticComfort: this.orthodonticComfort(),
      hygieneAndHabits: this.hygieneAndHabits(),
      newDentalSymptoms: this.newDentalSymptoms(),
      gingivalAndPeriodontalState: this.gingivalAndPeriodontalState(),
      applianceAndBracketStatus: this.applianceAndBracketStatus(),
      enamelAndRestorationState: this.enamelAndRestorationState(),
      occlusionAndBiteState: this.occlusionAndBiteState(),
      attachedImagesUrls: attachedImagesUrls,
      ajusteArcoOrtodoncia: this.ajusteArcoOrtodoncia(),
      procedimientoRealizado: this.procedimientoRealizado(),
      recomendacionesProximaCita: this.recomendacionesProximaCita(),
      medicalSummary: this.resumenMedico(),
      odontograma: odontogram,
      habitos: {
        brushingFrequency: formValues.frecuenciaCepillado || '',
        dentalFloss: formValues.usaHiloDental || false,
        bruxism: formValues.bruxism || false,
        bitesFingers: formValues.muerdeDedos || false,
        bitesTongue: formValues.muerdeLengua || false,
        bitesLips: formValues.muerdeLabios || false,
        bitesNails: formValues.muerdeUnias || false,
        bitesObjects: formValues.muerdeObjetos || false
      },
      ...extraInfo
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
          try {
            const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
            const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

            if (decryptedResponse.success) {
              alert('¡Datos guardados con éxito!');
            } else {
              alert(`Error del servidor: ${decryptedResponse.error || 'Desconocido'}`);
            }
          } catch (decryptErr) {
            console.error('Error al desencriptar el response:', decryptErr);
            alert('El servidor respondió pero ocurrió un error al procesar la respuesta.');
          }
        } else {
          alert('Error al registrar la información.');
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Error guardando datos:', err);
        alert('Ocurrió un error de red al intentar guardar.');
      }
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
    if (this.recognition) this.recognition.stop();
  }
}
