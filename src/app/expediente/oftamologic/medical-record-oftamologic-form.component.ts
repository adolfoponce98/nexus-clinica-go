import { ClinicalCoreComponent, emptyClinicalCore } from '../../clinical/clinical-core.component';
import { PermissionService } from '../../auth/permission.service';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { API_URLS } from '../../config/api-urls';
import { AppointmentContextService } from '../../appointments/appointment-context.service';
import { PermissionDirective } from '../../auth/permission.directive';
import { Component, computed, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideAngularModule,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Eye,
  ShieldAlert,
} from 'lucide-angular';
import { Advanced3DViewerComponent } from '../../medicalUtilities/advanced-3d-viewer.component';
import { AuthService } from '../../auth/auth.service';
@Component({
  selector: 'app-oftalmologia',
  standalone: true,
  imports: [
    ClinicalCoreComponent,
    PermissionDirective,
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    Advanced3DViewerComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: 'medical-record-oftamologic-form.component.html',
})
export class OftalmologiaComponent {
  readonly permissions = inject(PermissionService);
  private api = inject(ClinicApiService);
  private context = inject(AppointmentContextService);
  private registrationRequestId = crypto.randomUUID();
  clinicalCore = emptyClinicalCore();
  saving = signal(false);
  notice = signal('');
  error = signal('');
  savedRecord = signal('');
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  icons = { Check, CheckCircle, ChevronLeft, ChevronRight, User, FileText, Eye, ShieldAlert };
  idConsultorio = signal('');
  activeTab = signal<number>(1);

  tabs = signal([
    { id: 1, name: 'Datos Personales', icon: User, completed: false },
    { id: 2, name: 'Antecedentes Médicos', icon: FileText, completed: false },
    { id: 3, name: 'Síntomas y Hábitos', icon: ShieldAlert, completed: false },
    { id: 4, name: 'Exploración 3D', icon: Eye, completed: false },
  ]);

  recordForm: FormGroup = this.fb.group({
    nombreCompleto: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
    domicilio: [''],
    telefono: ['', [Validators.required, Validators.maxLength(10)]],
    sexo: ['', Validators.required],
    edad: ['', Validators.required],
    ocupacion: [''],

    usaLentes: [false],
    tiempoLentes: [''],
    cirugiaOcular: [false],
    detalleCirugia: [''],
    famGlaucoma: [false],
    famCataratas: [false],
    famMiopia: [false],
    famCeguera: [false],
    enfermedadesSistemicas: [''],
    motivoConsulta: ['', Validators.required],

    visionBorrosa: [false],
    fatigaOcular: [false],
    ardorOjos: [false],
    visionDoble: [false],
    destellosLuz: [false],
    moscasVolantes: [false],
    horasPantallas: [''],
    usoGotas: [''],

    est_parpados: [''],
    est_conjuntiva: [''],
    est_cornea: [''],
    est_cristalino: [''],
    est_retina: [''],
    est_presion_intraocular: [''],
  });

  completedSectionsCount = computed(() => {
    let count = 0;
    if (this.recordForm.get('nombreCompleto')?.valid && this.recordForm.get('telefono')?.valid)
      count++;
    if (this.recordForm.get('motivoConsulta')?.valid) count++;
    if (this.recordForm.get('horasPantallas')?.value) count++;
    count++; // Sección 3D lista por defecto
    return count;
  });

  completedPercentage = computed(() => Math.round((this.completedSectionsCount() / 4) * 100));

  estructuraActiva = signal<string>('');

  estructuras = [
    { key: 'parpados', label: 'Párpados' },
    { key: 'conjuntiva', label: 'Conjuntiva' },
    { key: 'cornea', label: 'Córnea' },
    { key: 'cristalino', label: 'Cristalino' },
    { key: 'retina', label: 'Retina' },
    { key: 'presion_intraocular', label: 'Presión intraocular' },
  ];

  nombreConsultorio = '';
  nombreMedico = '';
  eyeModels = [
    {
      id: 'modelo-1',
      name: 'Anatomía Ocular General',
      description: 'Vista completa de estructuras externas e internas',
      thumbnail: 'assets/ojos/ojo_model1.jpeg',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FMeshy_AI_Human_Eye_Anatomy_1008032957_texture-v1.glb?alt=media&token=7684e696-e8d7-4fc1-b048-ae97fa60931c',
    },
    {
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FMeshy_AI_Anatomy_of_the_Human__1008033351_texture-v1.glb?alt=media&token=d6f31273-da60-4625-b31e-ed11e2f5153c',
      id: 'modelo-2',
      name: 'Segmento Anterior y Córnea',
      description: 'Enfoque en párpados, córnea y cristalino',
      thumbnail: 'assets/ojos/ojo_model2.jpeg', // Reemplaza con tu ruta PNG
    },
    {
      id: 'modelo-3',
      name: 'Retina y Fondo de Ojo',
      description: 'Detalle de vasos retinianos y mácula',
      thumbnail: 'assets/ojos/ojo_model3.jpeg', // Reemplaza con tu ruta PNG
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FMeshy_AI_Exploded_Anatomy_of_t_1008031938_texture-v1.glb?alt=media&token=9c3ca7f9-9cda-443a-a1b8-db9d490328c8', // Reemplaza con tu 3ra URL de GLB si difiere
    },
  ];

  selectedModelId = signal<string>('modelo-1');

  // Computed que devuelve el objeto del modelo activo actual
  activeEyeModel = computed(() => {
    return this.eyeModels.find((m) => m.id === this.selectedModelId()) || this.eyeModels[0];
  });

  selectModel(id: string) {
    if (this.selectedModelId() !== id) {
      this.isLoadingModel.set(true);
      this.selectedModelId.set(id);
    }
  }
  isExpanded = signal(false);

  toggleExpand() {
    this.isExpanded.update((v) => !v);
  }
  seleccionarEstructura(nombre: string) {
    this.estructuraActiva.set(nombre);
  }
  isLoadingModel = signal(true);

  onModelLoaded() {
    this.isLoadingModel.set(false);
    console.log('¡Modelo 3D cargado y renderizado con éxito!');
  }

  onModelError(event: any) {
    this.isLoadingModel.set(false);
    console.error('Error detallado de model-viewer:', event);
  }

  setTab(tabId: number) {
    this.activeTab.set(tabId);
  }

  nextTab() {
    if (this.activeTab() < 4) {
      this.activeTab.update((t) => t + 1);
    }
  }

  prevTab() {
    if (this.activeTab() > 1) {
      this.activeTab.update((t) => t - 1);
    }
  }

  ngOnInit() {
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio.set(defaultOffice?.idConsultorio || defaultOffice?.id || '');
    const prefill = this.context.identificationPrefill();
    if (prefill)
      this.recordForm.patchValue({
        nombreCompleto: prefill.firstName,
        telefono: prefill.cellphone,
      });
    this.nombreConsultorio = 'Consultorio ' + defaultOffice?.name || 'Consultorio Default';

    const sessionData = this.authService.getSession();
    const email = sessionData?.fullName || 'doctor@nexuscliniq.com';
    this.nombreMedico = email.split('@')[0].toUpperCase();

    if (defaultOffice) {
      this.authService.saveSucursal(defaultOffice);
    }
  }

  async saveRecord() {
    if (this.saving() || this.savedRecord()) return;
    this.error.set('');
    this.notice.set('');
    if (!this.recordForm.get('nombreCompleto')?.value?.trim()) {
      this.error.set('El nombre del paciente es obligatorio.');
      return;
    }
    const office = this.api.branchId(),
      session = this.authService.getSession();
    if (!office || !session) {
      this.error.set('Selecciona un consultorio y una sesión válida.');
      return;
    }
    this.saving.set(true);
    try {
      const value = this.recordForm.getRawValue();
      const result = await this.api.post(API_URLS.REGISTERNEWPATIENT, {
        idDoctor: String(session.idDoctor || session.email)
          .trim()
          .toLowerCase()
          .replace(/[\/\\]/g, '_'),
        idConsultorio: office,
        requestId: this.registrationRequestId,
        especialidad: 'oftalmologia',
        generalIdentificationData: {
          nombreCompleto: value.nombreCompleto,
          birthDate: value.fechaNacimiento,
          streetAndNumber: value.domicilio,
          cellphone: value.telefono,
          gender: value.sexo,
          age: value.edad,
          occupation: value.ocupacion,
        },
        clinicalCore: this.permissions.can('records', 'write')
          ? {
              ...this.clinicalCore,
              chiefComplaint: this.clinicalCore.chiefComplaint || value.motivoConsulta,
              specialtyAdditional: { ophthalmology: value },
            }
          : {},
      });
      this.savedRecord.set(result.numeroDeExpediente);
      const warning = await this.context.recordCreated(result, office);
      this.notice.set(
        'Expediente ' +
          result.numeroDeExpediente +
          ' guardado como historia en preparación. Completa y firma la consulta desde el expediente.' +
          warning,
      );
    } catch (e: any) {
      this.error.set(e.message || 'No se pudo guardar el expediente.');
    } finally {
      this.saving.set(false);
    }
  }
}
