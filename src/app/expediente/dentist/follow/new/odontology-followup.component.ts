import { Component, signal, OnDestroy, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import CryptoJS from 'crypto-js';
import { AuthService } from '../../../../auth/auth.service';
import {
  LucideAngularModule, Activity, ShieldCheck, FileText, Stethoscope,
  ImageIcon, Calendar, Clock, ChevronRight, Mic, MicOff, Pause, Play, Square, X, CheckCircle2, Upload, AlertCircle, Sparkles, ArrowLeft,
  Smile, ShieldAlert, Sparkle, FileSpreadsheet, FileCode
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
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: 'odontology-followup.component.html'
})
export class OdontologyFollowupComponent implements OnDestroy, OnInit {
  readonly icons = {
    Activity, ShieldCheck, FileText, Stethoscope,
    ImageIcon, Calendar, Clock, ChevronRight, Mic, MicOff, Pause, Play, Square, X, CheckCircle2, Upload, AlertCircle, Sparkles,
    ArrowLeft, Smile, ShieldAlert, Sparkle, FileSpreadsheet, FileCode
  };

  authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  idDoctor = signal('');
  idConsultorio = signal('');
  idPatient = signal('');
  expedienteId = signal('');

  // Tipo de tratamiento seleccionado para adaptar dinámicamente los campos
  selectedTreatmentType = signal<string>('general');

  // Formulario - Sección 1
  dentalPainLevel = signal('Sin dolor / Confortable (EVA 0)');
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

  imagesUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'image' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'image' })));
  documentsUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'document' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'document' })));
  videosUrls = computed(() => this.uploadedFiles().filter(f => f.type === 'video' && !f.uploading && !f.error).map(f => ({ name: f.name, url: f.url, type: 'video' })));

  // Formulario - Sección 4
  ajusteArcoOrtodoncia = signal('');
  procedimientoRealizado = signal('');
  recomendacionesProximaCita = signal('');

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
    const sessionData = this.authService.getSession();
    const email = sessionData?.email || '';
    const sanitizedDoctorId = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

    this.idDoctor.set(sanitizedDoctorId);
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio.set(defaultOffice.idConsultorio || 'consultorio_general');
    console.log(this.idConsultorio)

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
              error: (err) => {
                console.error('Error subiendo archivo dental:', err);
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

  // Procesamiento con IA para estructurar notas dentales y llenar campos automáticamente
  generarResumenMedicoIA() {
    const textoDictado = this.resumenMedico().trim();
    if (!textoDictado) return;

    this.isGeneratingAI.set(true);
    this.resumenGeneradoIA.set('');

    const urlCloudFunction = 'https://generatemedicalsummary-fjo7ia7ora-uc.a.run.app';
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // Enviando especialidad hardcodeada "Odontología" y el motivo de consulta desde las cards (selectedTreatmentType)
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

          // Autocompletado robusto mapeando las propiedades exactas que retorna la Cloud Function
          if (info.evolucionYAdaptacionGeneral) {
            this.orthodonticComfort.set(info.evolucionYAdaptacionGeneral);
          }
          if (info.habitosDeHigieneYUsoDeAuxiliares) {
            this.hygieneAndHabits.set(info.habitosDeHigieneYUsoDeAuxiliares);
          }
          if (info.sintomasEspecificosOHallazgosReportados) {
            this.newDentalSymptoms.set(info.sintomasEspecificosOHallazgosReportados);
          }
          if (info.estadoGingivalYPeriodontal) {
            this.gingivalAndPeriodontalState.set(info.estadoGingivalYPeriodontal);
          }
          if (info.estadoDeBracketsArcosYLigas || info.tonoDentalYEstadoDelEsmalte || info.estadoDelAlveoloYCicatrizacion) {
            this.applianceAndBracketStatus.set(
              info.estadoDeBracketsArcosYLigas ||
              info.tonoDentalYEstadoDelEsmalte ||
              info.estadoDelAlveoloYCicatrizacion || ''
            );
          }
          if (info.esmalteLimpiezaYRestauracionesPrevias) {
            this.enamelAndRestorationState.set(info.esmalteLimpiezaYRestauracionesPrevias);
          }
          if (info.oclusionMordidaYPiezasInvolucradas) {
            this.occlusionAndBiteState.set(info.oclusionMordidaYPiezasInvolucradas);
          }
          if (info.tecnicaQuirurgicaYSutura) {
            this.ajusteArcoOrtodoncia.set(info.tecnicaQuirurgicaYSutura);
          }
          if (info.procedimientoRealizadoHoy) {
            this.procedimientoRealizado.set(info.procedimientoRealizadoHoy);
          }
          if (info.indicacionesYProximaCita) {
            this.recomendacionesProximaCita.set(info.indicacionesYProximaCita);
          }

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

    const attachedImagesUrls = [
      ...this.imagesUrls(),
      ...this.documentsUrls(),
      ...this.videosUrls()
    ];

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
      medicalSummary: this.resumenMedico()
    };
  console.log('Response desencriptado del servidor:', rawPayload);
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
            // 🔓 Desencriptar el response recibido del servidor
            const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
            const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

            // 📊 Log del response desencriptado
            console.log('Response desencriptado del servidor:', decryptedResponse);

            if (decryptedResponse.success) {
              alert('¡Seguimiento odontológico guardado y expediente actualizado con éxito!');
              this.volverAlListado();
            } else {
              alert(`Error del servidor: ${decryptedResponse.error || 'Desconocido'}`);
            }
          } catch (decryptErr) {
            console.error('Error al desencriptar el response:', decryptErr);
            alert('El servidor respondió pero ocurrió un error al procesar la respuesta.');
          }
        } else {
          console.warn('Respuesta vacía o sin encryptedData:', res);
          alert('Error al registrar el seguimiento dental.');
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Error guardando seguimiento dental:', err);
        alert('Ocurrió un error de red al intentar guardar.');
      }
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
    if (this.recognition) this.recognition.stop();
  }
}
