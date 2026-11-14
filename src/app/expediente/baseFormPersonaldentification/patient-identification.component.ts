import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Calendar } from 'lucide-angular';

@Component({
  selector: 'app-patient-identification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './patient-identification.component.html',

})
export class PatientIdentificationComponent {
  @Output() savePatientData = new EventEmitter<any>();

  icons = { Calendar };

  // Control de las pestañas internas
  activeSubTab = signal<number>(1);
  subTabs = [
    { id: 1, name: '1. Datos Personales' },
    { id: 2, name: '2. Heredofamiliares' },
    { id: 3, name: '3. Patológicos' },
    { id: 4, name: '4. No Patológicos' }
  ];

  birthDay = signal('');
  birthMonth = signal('');
  birthYear = signal('');

  hereditaryOptions = [
    { key: 'diabetes', label: 'Diabetes' },
    { key: 'asthma', label: 'Asma' },
    { key: 'hypertension', label: 'Hipertensión' },
    { key: 'cancer', label: 'Cáncer' },
    { key: 'heartDisease', label: 'Cardiopatía' },
    { key: 'mentalIllness', label: 'Enfermedad Mental' },
    { key: 'allergies', label: 'Alergias' },
    { key: 'endocrine', label: 'Endocrinas' },
    { key: 'liverDisease', label: 'Hepatopatía' }
  ];

  pathologicalOptions = [
    { key: 'surgery', label: 'Cirugía' },
    { key: 'hospitalization', label: 'Hospitalización' },
    { key: 'trauma', label: 'Trauma' },
    { key: 'allergy', label: 'Alergia' },
    { key: 'transfusion', label: 'Transfusión' },
    { key: 'diabetes', label: 'Diabetes' },
    { key: 'endocrine', label: 'Endocrinas' },
    { key: 'hypertension', label: 'Hipertensión' },
    { key: 'heartDisease', label: 'Cardiopatía' },
    { key: 'cancer', label: 'Cáncer' }
  ];

  nonPathologicalOptions = [
    { key: 'smoking', label: 'Tabaquismo' },
    { key: 'alcoholism', label: 'Alcoholismo' },
    { key: 'toxicomania', label: 'Toxicomanías' },
    { key: 'immunizations', label: 'Inmunizaciones' },
    { key: 'ivsa', label: 'IVSA' }
  ];

  patientForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.patientForm = this.fb.group({
      firstName: ['', Validators.required],
      paternalSurname: ['', Validators.required],
      maternalSurname: [''],
      birthDate: ['', Validators.required],
      age: [{ value: '', disabled: false }],
      gender: [''],
      curp: [''],
      cellphone: ['', [Validators.pattern(/^\d{10}$/)]],
      homePhone: ['', [Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.email]],
      streetAndNumber: [''],
      neighborhood: [''],
      municipality: [''],
      state: [''],
      country: [''],
      maritalStatus: [''],
      educationLevel: [''],
      religion: [''],
      occupation: [''],
      additionalNote: [''],

      familyBackground: this.fb.group({
        diabetes: [false],
        asthma: [false],
        hypertension: [false],
        cancer: [false],
        heartDisease: [false],
        mentalIllness: [false],
        allergies: [false],
        endocrine: [false],
        liverDisease: [false]
      }),
      familyBackgroundOther: [''],

      pathologicalBackground: this.fb.group({
        surgery: [false],
        hospitalization: [false],
        trauma: [false],
        allergy: [false],
        transfusion: [false],
        diabetes: [false],
        endocrine: [false],
        hypertension: [false],
        heartDisease: [false],
        cancer: [false]
      }),
      pathologicalBackgroundOther: [''],

      nonPathologicalBackground: this.fb.group({
        smoking: [false],
        alcoholism: [false],
        toxicomania: [false],
        immunizations: [false],
        ivsa: [false]
      }),
      nonPathologicalBackgroundOther: ['']
    });
  }

  nextSubTab() {
    if (this.activeSubTab() < 4) {
      this.activeSubTab.update(t => t + 1);
    }
  }

  prevSubTab() {
    if (this.activeSubTab() > 1) {
      this.activeSubTab.update(t => t - 1);
    }
  }

  onDateInput(type: 'day' | 'month' | 'year', event: any, nextInput?: HTMLInputElement) {
    const val = event.target.value.replace(/\D/g, '');
    if (type === 'day') {
      this.birthDay.set(val);
      if (val.length === 2 && nextInput) nextInput.focus();
    } else if (type === 'month') {
      this.birthMonth.set(val);
      if (val.length === 2 && nextInput) nextInput.focus();
    } else if (type === 'year') {
      this.birthYear.set(val);
    }
    this.updateComposedDate();
  }

  onCalendarChange(event: any) {
    const dateVal = event.target.value;
    if (dateVal) {
      const [y, m, d] = dateVal.split('-');
      this.birthYear.set(y);
      this.birthMonth.set(m);
      this.birthDay.set(d);
      this.updateComposedDate();
    }
  }

  updateComposedDate() {
    const d = this.birthDay();
    const m = this.birthMonth();
    const y = this.birthYear();
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const fullDate = `${y}-${m}-${d}`;
      this.patientForm.patchValue({ birthDate: fullDate });
      this.calculateAge(fullDate);
    }
  }

  calculateAge(dateString: string) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.patientForm.patchValue({ age: isNaN(age) ? '' : age });
  }

  onSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      alert('Por favor complete los campos obligatorios: Nombres y Fecha de Nacimiento en la sección 1.');
      this.activeSubTab.set(1); // Regresa automáticamente a la pestaña de datos personales si falta algo obligatorio
      return;
    }
    // Emite todos los datos juntos recopilados de las 4 secciones internas
    this.savePatientData.emit(this.patientForm.getRawValue());
  }
}
