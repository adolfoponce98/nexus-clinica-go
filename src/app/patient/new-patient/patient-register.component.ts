import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule,FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  User,
  Calendar,
  Droplet,
  AlertTriangle,
  BookOpen,
  Phone,
  Smartphone,
  Mail,
  MapPin,
  Save,
  X,
  Check
} from 'lucide-angular';

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule,FormsModule],
  templateUrl: 'patient-register.component.html'
})
export class PatientRegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  readonly icons = {
    ArrowLeft,
    User,
    Calendar,
    Droplet,
    AlertTriangle,
    BookOpen,
    Phone,
    Smartphone,
    Mail,
    MapPin,
    Save,
    X,
    Check
  };

  registerForm: FormGroup;

  // Listas desplegables
  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  religionesList = [
    'Católica', 'Cristiana / Evangélica', 'Judaica', 'Islamismo',
    'Budismo', 'Hinduismo', 'Testigo de Jehová', 'Mormona',
    'Sin Religión / Agnóstico', 'Ateo', 'Otra'
  ];

  sexosList = ['Masculino', 'Femenino', 'No binario', 'Género fluido', 'Prefiero no decirlo', 'Otro'];

  // Estados interactivos para campos especiales
  alergiasList = signal<string[]>([]);
  tempAlergiaInput = '';

  religionSearch = '';
  showReligionDropdown = false;
  filteredReligions = signal<string[]>(this.religionesList);

  // Inputs separados para fecha de nacimiento (Día, Mes, Año) sin necesidad de diagonales
  diaNac = '';
  mesNac = '';
  anioNac = '';

  constructor() {
    this.registerForm = this.fb.group({
      nombreCompleto: ['', [Validators.required]],
      sexo: ['', [Validators.required]],
      tipoSangre: ['', [Validators.required]],
      religion: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      celular: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      calleNumero: ['', [Validators.required]],
      coloniaCiudad: ['', [Validators.required]],
      codigoPostal: ['', [Validators.required]]
    });
  }

  volverAlListado() {
    this.router.navigate(['/patients']);
  }

  // --- LÓGICA DE ALERGIAS (Chips interactivos con separación por comas o espacios) ---
  onAlergiaInput(event: any) {
    const val: string = event.target.value;
    // Si el usuario presiona coma, espacio o enter, procesamos la alergia
    if (val.includes(',') || val.includes(' ') && val.trim().length > 1) {
      const parts = val.split(/[\s,]+/);
      parts.forEach(p => {
        const limpia = p.trim();
        if (limpia.length > 0 && !this.alergiasList().includes(limpia)) {
          this.alergiasList.update(list => [...list, limpia]);
        }
      });
      this.tempAlergiaInput = '';
      event.target.value = '';
    } else {
      this.tempAlergiaInput = val;
    }
  }

  agregarAlergiaManual() {
    const val = this.tempAlergiaInput.trim();
    if (val && !this.alergiasList().includes(val)) {
      this.alergiasList.update(list => [...list, val]);
      this.tempAlergiaInput = '';
    }
  }

  removerAlergia(alergia: string) {
    this.alergiasList.update(list => list.filter(item => item !== alergia));
  }

  // --- LÓGICA DE FECHA DE NACIMIENTO (Autosalto numérico) ---
  onDiaInput(event: any) {
    let val = event.target.value.replace(/\D/g, '').substring(0, 2);
    this.diaNac = val;
    event.target.value = val;
    if (val.length === 2) {
      document.getElementById('mesInput')?.focus();
    }
    this.actualizarFechaFormulario();
  }

  onMesInput(event: any) {
    let val = event.target.value.replace(/\D/g, '').substring(0, 2);
    this.mesNac = val;
    event.target.value = val;
    if (val.length === 2) {
      document.getElementById('anioInput')?.focus();
    }
    this.actualizarFechaFormulario();
  }

  onAnioInput(event: any) {
    let val = event.target.value.replace(/\D/g, '').substring(0, 4);
    this.anioNac = val;
    event.target.value = val;
    this.actualizarFechaFormulario();
  }

  actualizarFechaFormulario() {
    // Genera string formato YYYY-MM-DD o DD/MM/YYYY para el backend
    if (this.diaNac && this.mesNac && this.anioNac.length === 4) {
      const fechaCompleta = `${this.anioNac}-${this.mesNac.padStart(2, '0')}-${this.diaNac.padStart(2, '0')}`;
      // Puedes inyectarlo o validarlo de forma interna
    }
  }

  // --- BUSCADOR DE RELIGIONES ---
  filterReligions(event: any) {
    const query = event.target.value.toLowerCase();
    this.religionSearch = query;
    this.registerForm.patchValue({ religion: query });
    this.filteredReligions.set(
      this.religionesList.filter(r => r.toLowerCase().includes(query))
    );
    this.showReligionDropdown = true;
  }

  selectReligion(rel: string) {
    this.religionSearch = rel;
    this.registerForm.patchValue({ religion: rel });
    this.showReligionDropdown = false;
  }

  // --- FILTRO DE TELÉFONO (Máximo 10 dígitos) ---
  validarTelefono(event: any, controlName: string) {
    const val = event.target.value.replace(/\D/g, '').substring(0, 10);
    this.registerForm.get(controlName)?.setValue(val);
    event.target.value = val;
  }

  // --- GUARDAR PACIENTE ---
  guardarPaciente() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      alert('Por favor completa todos los campos requeridos correctamente.');
      return;
    }

    const payload = {
      ...this.registerForm.value,
      fechaNacimiento: `${this.diaNac}/${this.mesNac}/${this.anioNac}`,
      alergias: this.alergiasList()
    };

    console.log('Guardando nuevo paciente:', payload);
    alert('¡Paciente registrado con éxito!');
    this.volverAlListado();
  }
}
