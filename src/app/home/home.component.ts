import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DashboardService } from './home.service';
import { DashBoardResponse, TypeClassModel, TeacherResponse } from './home.model';
import { TypeClassModalComponent } from './dialogsComponents/tipoClase/type-class-modal.component';
import { LottieDirective, AnimationOptions } from 'ngx-lottie';
import {
  LucideAngularModule, RotateCcw, LayoutDashboard, Users, Briefcase,
  CreditCard, Settings, Search, Bell, HelpCircle, Dumbbell, LogOut,
  AlertCircle, X, CheckCircle2, Calendar, UserPlus, GraduationCap,
  Building2, Clock, Tag, Bike
} from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TypeClassModalComponent,

  ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  // Variables para almacenar la data del API
  dashboardData: DashBoardResponse | null = null;
  isLoading = true;
options: AnimationOptions = {
    path: '/assets/loader.json', // Ruta de tu archivo JSON en la carpeta assets
    loop: true,
    autoplay: true,
  };
  // Objeto unificado de iconos para el uso con [img]="icons.X"
  readonly icons = {
    X,
    RotateCcw,
    LayoutDashboard,
    Users,
    Briefcase,
    CreditCard,
    Settings,
    Search,
    Bell,
    HelpCircle,
    Dumbbell,
    LogOut,
    AlertCircle,
    CheckCircle2,
    Calendar,
    UserPlus,
    GraduationCap,
    Building2,
    Clock,
    Tag,
    Bike
  };
  // Iconos sueltos por compatibilidad

  readonly LogOut = LogOut;

  readonly AlertCircle = AlertCircle;

  readonly X = X;

  readonly RotateCcw = RotateCcw;

  readonly LayoutDashboard = LayoutDashboard;

  readonly Users = Users;

  readonly Briefcase = Briefcase;

  readonly CreditCard = CreditCard;

  readonly Settings = Settings;

  readonly Search = Search;

  readonly Bell = Bell;

  readonly HelpCircle = HelpCircle;

  readonly Dumbbell = Dumbbell;

  readonly CheckCircle2 = CheckCircle2;

  readonly Calendar = Calendar;

  readonly UserPlus = UserPlus;

  readonly GraduationCap = GraduationCap;

  readonly Building2 = Building2;

  readonly Clock = Clock;

  readonly Tag = Tag;

  readonly Bike = Bike;
  showUserMenu = false;
  showLogoutConfirm = false;

  // Estado para el Modal de Horarios y Tolerancias Globales
  showScheduleModal = false;
  selectedSchedules = signal<string[]>([]);
  toleranciaMatutina = signal<number>(10);
  toleranciaVespertina = signal<number>(10);

  morningHours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
  eveningHours = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

  // Estado para el Modal de Tipos de Clase
  showTypeClassModal = false;
  typeClassForm: FormGroup;
  typeClasses = signal<TypeClassModel[]>([]);
showBikesModal = false;
currentBikesNumber: number = 0;
  // Estado para el Modal de Nuevo Maestro
  showTeacherModal = false;
  teacherForm: FormGroup;
  skillsList = signal<string[]>([]);
  newSkillInput = '';
  photoPreview: string | null = null;
  colorOptions = ['#10B981', '#8B5CF6', '#F97316', '#EF4444', '#3B82F6', '#EC4899'];

  constructor(private fb: FormBuilder, private dashboardService: DashboardService) {
    // Formulario de Tipo de Clases
    this.typeClassForm = this.fb.group({
      name: ['', Validators.required],
      descripcion: ['', Validators.required],
      duracion: ['', Validators.required],
      dificultad: [1, Validators.required]
    });

    // Formulario de Nuevo Maestro
    this.teacherForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', Validators.required],
      hireDate: ['', Validators.required],
      colorHex: [this.colorOptions[0], Validators.required],
      description: ['', [Validators.maxLength(300)]],
      photoUrl: ['']
    });
  }

  openBikesModal(initialValue: number = 0) {
  this.currentBikesNumber = initialValue;
  this.showBikesModal = true;
}

saveBikesNumber() {
  console.log("Nuevo número de bicis disponibles guardado:", this.currentBikesNumber);
  // Aquí puedes enviar el valor al backend o actualizar tu señal/modelo
  this.showBikesModal = false;
}
  ngOnInit(): void {
    this.cargarDatosDashboard();
  }

  // --- Helpers y Métodos para Tipos de Clase ---
  getDificultadColor(d: number): string {
    const colors = ['bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-rose-600'];
    return colors[d - 1] || 'bg-zinc-400';
  }

  saveTypeClass() {
    if (this.typeClassForm.valid) {
      this.typeClasses.update(list => [...list, this.typeClassForm.value]);
      this.typeClassForm.reset({ dificultad: 1 });
    }
  }

  deleteTypeClass(index: number) {
    this.typeClasses.update(list => list.filter((_, i) => i !== index));
  }

  // --- Métodos para la gestión de Horarios Globales ---
  toggleHour(hora: string) {
    const current = this.selectedSchedules();
    if (current.includes(hora)) {
      this.selectedSchedules.update(list => list.filter(h => h !== hora));
    } else {
      this.selectedSchedules.update(list => [...list, hora]);
    }
  }

  isHourSelected(hora: string): boolean {
    return this.selectedSchedules().includes(hora);
  }

  guardarConfiguracionHorarios() {
    const configuracionFinal = {
      matutinos: {
        horas: this.selectedSchedules().filter(h => this.morningHours.includes(h)),
        toleranciaMinutos: this.toleranciaMatutina()
      },
      vespertinos: {
        horas: this.selectedSchedules().filter(h => this.eveningHours.includes(h)),
        toleranciaMinutos: this.toleranciaVespertina()
      }
    };

    console.log("Configuración de horarios guardada:", configuracionFinal);
    this.showScheduleModal = false;
  }

  // --- Métodos para el Formulario de Nuevo Maestro ---
  addSkill() {
    if (this.newSkillInput && this.newSkillInput.trim() !== '') {
      const skill = this.newSkillInput.trim();
      if (!this.skillsList().includes(skill)) {
        this.skillsList.update(list => [...list, skill]);
      }
      this.newSkillInput = '';
    }
  }

  removeSkill(skillToRemove: string) {
    this.skillsList.update(list => list.filter(s => s !== skillToRemove));
  }

  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
        this.teacherForm.patchValue({ photoUrl: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  saveTeacher() {
    if (this.teacherForm.valid) {
      const formVal = this.teacherForm.value;

      const newTeacher: TeacherResponse = {
        idDocumentFirebase: '',
        branchId: 'BEAST-TESISTAN',
        id: 'TEACHER-' + Date.now(),
        name: formVal.name,
        phone: formVal.phone,
        email: formVal.email,
        birthDate: formVal.birthDate,
        hireDate: formVal.hireDate,
        colorHex: formVal.colorHex,
        photoUrl: formVal.photoUrl || '',
        description: formVal.description,
        skills: this.skillsList()
      };

      console.log("Guardando maestro (TeacherResponse):", newTeacher);

      this.teacherForm.reset({ colorHex: this.colorOptions[0] });
      this.skillsList.set([]);
      this.photoPreview = null;
      this.showTeacherModal = false;
    }
  }

  // --- Dashboard API y Sesión ---
  cargarDatosDashboard() {
    this.isLoading = true;

    const requestBody = {
      email: "administracion@gmail.com",
      idSucursal: "BEAST-TESISTAN",
      fecha: "2026-08-11"
    };

    this.dashboardService.obtenerInfoDashboard(requestBody).subscribe({
      next: (response) => {
        this.dashboardData = response;
        this.isLoading = false;
        console.log("Datos de dashboard obtenidos con éxito:", response);
      },
      error: (err) => {
        console.error("Error al obtener el dashboard", err);
        this.isLoading = false;
      }
    });
  }

  toggleMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  confirmLogout() {
    this.showUserMenu = false;
    this.showLogoutConfirm = true;
  }

  logout() {
    console.log('Cerrando sesión...');
    this.showLogoutConfirm = false;
  }
}
