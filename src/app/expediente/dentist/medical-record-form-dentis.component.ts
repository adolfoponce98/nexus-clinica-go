import { Component, signal, inject, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { AuthService } from '../../auth/auth.service';
import { PatientIdentificationComponent } from '../../expediente/baseFormPersonaldentification/patient-identification.component';
import {
  LucideAngularModule, User, ShieldAlert, FileText,
  CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Check,
  Droplet, BookOpen, AlertTriangle, Phone, Smartphone, Mail, MapPin, X, Save, Loader2, Calendar as CalendarIcon
} from 'lucide-angular';

@Component({
  selector: 'app-medical-record-form-dentist',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule, PatientIdentificationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: 'medical-record-form-dentist.component.html'
})
export class MedicalRecordFormDentistComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly icons = {
    User, ShieldAlert, FileText,
    CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Check,
    Droplet, BookOpen, AlertTriangle, Phone, Smartphone, Mail, MapPin, X, Save, Loader2, Calendar: CalendarIcon
  };

  private readonly SAVE_URL = 'https://registernewpatient-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  recordForm: FormGroup;
  userData: any = null;

  isLoading = signal(false);
  loadingMessage = signal('');
  showSuccessModal = signal(false);
  successMessage = signal('');
  idConsultorio = '';
  nombreConsultorio = '';
  nombreMedico = '';

  ngOnInit() {
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio = defaultOffice?.idConsultorio || 'consultorio_general';
    this.nombreConsultorio = "Consultorio " + defaultOffice?.name || 'Consultorio Default';

    const sessionData = this.authService.getSession();
    const email = sessionData?.fullName || 'doctor@nexuscliniq.com';
    this.nombreMedico = email.split('@')[0].toUpperCase();

    if (defaultOffice) {
      this.authService.saveSucursal(defaultOffice);
    }
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
      motivoConsulta: ['', Validators.required]
    });
  }

  async saveRecord() {
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;
    this.userData = this.authService.getSession();
    if (!jwtToken) {
      alert('Sesión expirada. Inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadingMessage.set('Guardando expediente clínico...');
    this.isLoading.set(true);

    const formValues = this.recordForm.value;
    const email = sessionData?.email || 'doctor@nexuscliniq.com';
    const idDoctor = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

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
      }
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
            this.successMessage.set('¡Expediente registrado con éxito!');
            this.showSuccessModal.set(true);
          } else {
            alert('Ocurrió un error al registrar el expediente.');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error al guardar expediente:', err);
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

async handleSavePatientData(formData: any) {
  const sessionData = this.authService.getSession();
  const jwtToken = sessionData?.sessionToken;

  if (!jwtToken) {
    alert('Sesión expirada. Inicia sesión nuevamente.');
    this.router.navigate(['/login']);
    return;
  }

  this.isLoading.set(true);
  this.loadingMessage.set('Guardando datos generales y antecedentes...');

  const email = sessionData?.email || 'doctor@nexuscliniq.com';
  const idDoctor = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

  const rawPayload = {
    idDoctor: idDoctor,
    idConsultorio: this.idConsultorio,
    especialidad: 'odontologia',
    generalIdentificationData: {
      firstName: formData.firstName?.trim() || '-',
      paternalSurname: formData.paternalSurname?.trim() || '-',
      maternalSurname: formData.maternalSurname?.trim() || '-',
      birthDate: formData.birthDate || '-',
      age: formData.age !== null && formData.age !== undefined && formData.age !== '' ? formData.age : '-',
      gender: formData.gender || '-',
      curp: formData.curp?.trim().toUpperCase() || '-',
      cellphone: formData.cellphone?.trim() || '-',
      homePhone: formData.homePhone?.trim() || '-',
      email: formData.email?.trim() || '-',
      streetAndNumber: formData.streetAndNumber?.trim() || '-',
      neighborhood: formData.neighborhood?.trim() || '-',
      municipality: formData.municipality?.trim() || '-',
      state: formData.state?.trim() || '-',
      country: formData.country?.trim() || '-',
      maritalStatus: formData.maritalStatus || '-',
      educationLevel: formData.educationLevel || '-',
      religion: formData.religion?.trim() || '-',
      occupation: formData.occupation?.trim() || '-',
      additionalNote: formData.additionalNote?.trim() || '-'
    },
    hereditaryFamilyBackground: {
      selections: formData.familyBackground || {},
      otherDiseases: formData.familyBackgroundOther?.trim() || '-'
    },
    pathologicalBackground: {
      selections: formData.pathologicalBackground || {},
      otherConditions: formData.pathologicalBackgroundOther?.trim() || '-'
    },
    nonPathologicalBackground: {
      selections: formData.nonPathologicalBackground || {},
      otherHabits: formData.nonPathologicalBackgroundOther?.trim() || '-'
    }
  };
  console.log(rawPayload)

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
          this.successMessage.set('¡Datos generales y antecedentes registrados con éxito!');
          this.showSuccessModal.set(true);
        } else {
          alert('Ocurrió un error al registrar los datos del paciente.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error al guardar datos:', err);
        alert('Error de red al intentar guardar el registro.');
      }
    });
  } catch (e) {
    this.isLoading.set(false);
    console.error('Error de encriptación:', e);
  }
}
}
