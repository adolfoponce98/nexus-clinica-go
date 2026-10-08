import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { AuthService } from '../../auth/auth.service';
import {
  LucideAngularModule, User, ShieldAlert, FileText, Stethoscope,
  Image as ImageIcon, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Check,
  Droplet, BookOpen, AlertTriangle, Phone, Smartphone, Mail, MapPin, X, Save, Loader2, Calendar as CalendarIcon
} from 'lucide-angular';

@Component({
  selector: 'app-medical-record-form-dentist',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule],
  templateUrl: 'medical-record-form-dentist.component.html'
})


export class MedicalRecordFormDentistComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly icons = {
    User, ShieldAlert, FileText, Stethoscope,
    ImageIcon, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Check,
    Droplet, BookOpen, AlertTriangle, Phone, Smartphone, Mail, MapPin, X, Save, Loader2, Calendar: CalendarIcon
  };

  private readonly SAVE_URL = 'https://registernewpatient-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  recordForm: FormGroup;
  selectedTooth = signal<number | null>(null);
  userData: any = null;
  // Estados de UI y modales
  isLoading = signal(false);
  loadingMessage = signal('');
  showSuccessModal = signal(false);
  successMessage = signal('');
  idConsultorio =""
  // Estados específicos para Fecha de Nacimiento desglosada (DD/MM/YYYY)
  birthDay = signal('');
  birthMonth = signal('');
  birthYear = signal('');

  // Catálogo de Ocupaciones y buscador interactivo
  occupationCatalog = [
    'Estudiante', 'Comerciante', 'Empleado / Asalariado', 'Profesionista Independiente',
    'Docente / Profesor', 'Ingeniero / Técnico', 'Salud / Médico / Enfermero', 'Arquitecto / Diseñador',
    'Abogado / Asesor', 'Hogar / Ama de casa', 'Empresario / Directivo', 'Jubilado / Pensionado', 'Agricultor / Ganadero'
  ];
  occupationSearch = signal('');
  showOccupationDropdown = signal(false);

  filteredOccupations = computed(() => {
    const query = this.occupationSearch().toLowerCase().trim();
    if (!query) return this.occupationCatalog;
    return this.occupationCatalog.filter(o => o.toLowerCase().includes(query));
  });

  // Estatus de piezas dentales
  toothStatuses: { [key: string]: { label: string; colorClass: string; bgClass: string } } = {
    sano: { label: 'Sano', colorClass: 'border-zinc-700', bgClass: 'bg-zinc-800/90' },
    resina: { label: 'Resina', colorClass: 'border-blue-500', bgClass: 'bg-blue-500/20 text-blue-400' },
    extraccion: { label: 'Extracción', colorClass: 'border-rose-500', bgClass: 'bg-rose-500/20 text-rose-400' },
    limpieza: { label: 'Limpieza', colorClass: 'border-emerald-500', bgClass: 'bg-emerald-500/20 text-emerald-400' },
    blanqueamiento: { label: 'Blanqueamiento', colorClass: 'border-amber-500', bgClass: 'bg-amber-500/20 text-amber-400' }
  };

  toothStatusMap = signal<{ [key: number]: string }>({});
 ngOnInit() {
          const defaultOffice = this.authService.getSucursal();
          this.idConsultorio = defaultOffice.idConsultorio || 'consultorio_general';
          console.log(this.idConsultorio)
          this.authService.saveSucursal(defaultOffice);
  }
  constructor() {
    this.recordForm = this.fb.group({
      nombreCompleto: ['', Validators.required],
      fechaNacimiento: [''],
      domicilio: [''],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      sexo: ['', Validators.required],
      edad: [''],
      ocupacion: [''],

      bajoTratamiento: [false],
      tipoTratamiento: [''],
      embarazada: [false],
      mesesEmbarazo: [''],
      alergiaAntibioticos: [false],
      alergiaAnalgesicos: [false],
      alergiaAnestesicos: [false],
      alergiaAlimentos: [false],
      alergiasEspecifique: [''],
      medicamentosNombres: [''],
      medicamentosDesde: [''],
      ultimaConsultaOdontologica: [''],
      sangranEncias: [false],
      sensibilidadFrioCalor: [false],
      movilidadDental: [false],
      motivoConsulta: ['', Validators.required],

      frecuenciaCepillado: [''],
      usaHiloDental: [false],
      bruxismo: [false],
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
  }

  // Métodos para manejo fluido de Fecha de Nacimiento y cálculo de edad
  onDateInput(part: 'day' | 'month' | 'year', event: any, nextInput?: HTMLInputElement) {
    let val = event.target.value.replace(/[^0-9]/g, '');
    if (part === 'day') {
      if (Number(val) > 31) val = '31';
      this.birthDay.set(val);
      if (val.length === 2 && nextInput) nextInput.focus();
    } else if (part === 'month') {
      if (Number(val) > 12) val = '12';
      this.birthMonth.set(val);
      if (val.length === 2 && nextInput) nextInput.focus();
    } else if (part === 'year') {
      if (val.length > 4) val = val.slice(0, 4);
      this.birthYear.set(val);
    }
    this.syncBirthDate();
  }

  onCalendarChange(event: any) {
    const val = event.target.value; // Formato YYYY-MM-DD
    if (val) {
      const [y, m, d] = val.split('-');
      this.birthYear.set(y || '');
      this.birthMonth.set(m || '');
      this.birthDay.set(d || '');
      this.recordForm.get('fechaNacimiento')?.setValue(val);
      this.calculateAge(`${y}-${m}-${d}`);
    }
  }

  private syncBirthDate() {
    const d = this.birthDay().padStart(2, '0');
    const m = this.birthMonth().padStart(2, '0');
    const y = this.birthYear();

    if (y.length === 4 && m && d) {
      const fullDate = `${y}-${m}-${d}`;
      this.recordForm.get('fechaNacimiento')?.setValue(fullDate);
      this.calculateAge(fullDate);
    } else {
      this.recordForm.get('fechaNacimiento')?.setValue('');
      this.recordForm.get('edad')?.setValue('');
    }
  }

  private calculateAge(birthDateStr: string) {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (!isNaN(age) && age >= 0) {
      this.recordForm.get('edad')?.setValue(age);
    }
  }

  // Métodos del buscador de ocupación
  selectOccupation(occ: string) {
    this.occupationSearch.set(occ);
    this.recordForm.get('ocupacion')?.setValue(occ);
    this.showOccupationDropdown.set(false);
  }

  onOccupationInput(event: any) {
    const val = event.target.value;
    this.occupationSearch.set(val);
    this.recordForm.get('ocupacion')?.setValue(val);
    this.showOccupationDropdown.set(true);
  }

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

  isSection1Completed = computed(() => {
    const v = this.recordForm.value;
    return !!(v.nombreCompleto && v.telefono && v.sexo);
  });
  isSection2Completed = computed(() => !!this.recordForm.value.motivoConsulta);
  isSection3Completed = computed(() => !!this.recordForm.value.frecuenciaCepillado);
  isSection4Completed = () => true;

  tabs = computed(() => [
    { id: 1, name: 'Datos Personales', icon: User, completed: this.isSection1Completed() },
    { id: 2, name: 'Antecedentes y Patologías', icon: ShieldAlert, completed: this.isSection2Completed() },
    { id: 3, name: 'Hábitos', icon: FileText, completed: this.isSection3Completed() },
    { id: 4, name: 'Examen Clínico (Odontograma)', icon: Stethoscope, completed: this.isSection4Completed() }
  ]);

  completedPercentage = computed(() => 100);
  completedSectionsCount = computed(() => 4);
  activeTab = signal(1);

  setTab(tabId: number) { this.activeTab.set(tabId); }
  nextTab() { if (this.activeTab() < 4) this.activeTab.update(t => t + 1); }
  prevTab() { if (this.activeTab() > 1) this.activeTab.update(t => t - 1); }

  async saveRecord() {
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;
     this.userData = this.authService.getSession();
    if (!jwtToken) {
      alert('Sesión expirada. Inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadingMessage.set('Guardando expediente clínico y sincronizando odontograma...');
    this.isLoading.set(true);

    const formValues = this.recordForm.value;
    const email = sessionData?.email || 'doctor@nexuscliniq.com';
    const idDoctor = email.trim().toLowerCase().replace(/[\/\\]/g, '_');


    const odontogram: { [key: string]: string } = {};
    for (let p of [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48]) {
      odontogram[`tooth_${p}`] = formValues[`pieza_${p}`] || '';
    }

    const rawPayload = {
      idDoctor: idDoctor,
      idConsultorio: this.idConsultorio,
      especialidad: 'odontologia',
      fichaDeIdentificacion: {
        nombreCompleto: formValues.nombreCompleto || '',
        fechaNacimiento: formValues.fechaNacimiento || '',
        domicilio: formValues.domicilio || '',
        telefono: formValues.telefono || '',
        sexo: formValues.sexo || '',
        edad: formValues.edad || '',
        ocupacion: formValues.ocupacion || ''
      },
      antecedentes: {
        underTreatment: formValues.bajoTratamiento || false,
        treatmentType: formValues.tipoTratamiento || '',
        pregnant: formValues.embarazada || false,
        pregnancyMonths: formValues.mesesEmbarazo || '',
        antibioticAllergy: formValues.alergiaAntibioticos || false,
        analgesicAllergy: formValues.alergiaAnalgesicos || false,
        anestheticAllergy: formValues.alergiaAnestesicos || false,
        foodAllergy: formValues.alergiaAlimentos || false,
        otherAllergies: formValues.alergiasEspecifique || '',
        medicationsList: formValues.medicamentosNombres || '',
        medicationsSince: formValues.medicamentosDesde || '',
        lastDentalConsult: formValues.ultimaConsultaOdontologica || '',
        bleedingGums: formValues.sangranEncias || '',
        hotColdSensitivity: formValues.sensibilidadFrioCalor || '',
        toothMobility: formValues.movilidadDental || '',
        consultReason: formValues.motivoConsulta || ''
      },
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
      odontograma: odontogram
    };

    try {
      const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(rawPayload), this.ENCRYPTION_KEY).toString();
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'x-app-signature': this.APP_SECRET_HEADER,
        'x-client-source': 'angular'
      });

      this.http.post<any>(this.SAVE_URL, { encryptedData }, { headers }).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.encryptedData) {
            this.successMessage.set('¡Expediente odontológico registrado y sincronizado con éxito!');
            this.showSuccessModal.set(true);
          } else {
            alert('Ocurrió un error al registrar el expediente.');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error al guardar expediente dental:', err);
          alert('Error de red al intentar guardar el registro.');
        }
      });
    } catch (e) {
      this.isLoading.set(false);
      console.error('Error de encriptación:', e);
    }
  }

  cerrarExitoYRedirigir() {
    this.showSuccessModal.set(false);
    this.router.navigate(['/expediente']);
  }
}
