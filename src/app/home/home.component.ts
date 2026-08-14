import { Component, OnInit, signal, inject, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DashboardService } from './home.service';
import { DashBoardResponse, TypeClassModel, TeacherResponse } from './home.model';
import { TypeClassModalComponent } from './dialogsComponents/tipoClase/type-class-modal.component';
// ... tus imports de iconos
import { collection, onSnapshot, Unsubscribe, getFirestore ,doc} from 'firebase/firestore'; // SDK estándar
import { ChangeDetectorRef } from '@angular/core';
import {
  LucideAngularModule, RotateCcw, LayoutDashboard, Users, Briefcase,
  CreditCard, Settings, Search, Bell, HelpCircle, Dumbbell, LogOut,
  AlertCircle, X, CheckCircle2, Calendar, UserPlus, GraduationCap,
  Building2, Clock, Tag, Bike
} from 'lucide-angular';

export interface CheckinData {
  correo: string;
  nombre: string;
  telefono: string;
  estatusCheckin: number;
  horaCheckIn: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TypeClassModalComponent
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  dashboardData: DashBoardResponse | null = null;
  isLoading = false;

  readonly icons = {
    X, RotateCcw, LayoutDashboard, Users, Briefcase, CreditCard,
    Settings, Search, Bell, HelpCircle, Dumbbell, LogOut,
    AlertCircle, CheckCircle2, Calendar, UserPlus, GraduationCap,
    Building2, Clock, Tag, Bike
  };

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
checkinsList: CheckinData[] = [];
private injector = inject(Injector);
  private unsubscribeCheckins?: Unsubscribe;

  activeHour: string = '00:00';
  totalAgendadas: number = 0;
  totalCheckins: number = 0;
  porcentajeAsistencia: number = 0;

  showScheduleModal = false;
  selectedSchedules = signal<string[]>([]);
  toleranciaMatutina = signal<number>(10);
  toleranciaVespertina = signal<number>(10);
isLoadingCheckins = false;
private requestCounter = 0;
  morningHours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
  eveningHours = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

  showTypeClassModal = false;
  typeClassForm: FormGroup;
  typeClasses = signal<TypeClassModel[]>([]);
  showBikesModal = false;
  currentBikesNumber: number = 0;

  showTeacherModal = false;
  teacherForm: FormGroup;
  skillsList = signal<string[]>([]);
  newSkillInput = '';
  photoPreview: string | null = null;
  colorOptions = ['#10B981', '#8B5CF6', '#F97316', '#EF4444', '#3B82F6', '#EC4899'];
  selectedActiveHour: string = '';
  constructor(private fb: FormBuilder, private dashboardService: DashboardService,private cdr: ChangeDetectorRef) {
    this.typeClassForm = this.fb.group({
      name: ['', Validators.required],
      descripcion: ['', Validators.required],
      duracion: ['', Validators.required],
      dificultad: [1, Validators.required]
    });

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

  ngOnInit(): void {
this.cargarDatosDashboard();
  // Inicializamos con la hora actual redondeada
  const timeInfo = this.getCurrentScheduleHour();
  this.selectedActiveHour = timeInfo.horaStr;
  this.sincronizarCheckinsEnVivo();
  }

  ngOnDestroy() {
    if (this.unsubscribeCheckins) {
      this.unsubscribeCheckins();
    }
  }

  openBikesModal(initialValue: number = 0) {
    this.currentBikesNumber = initialValue;
    this.showBikesModal = true;
  }

  saveBikesNumber() {
    this.showBikesModal = false;
  }

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

cambiarHora(deltaHoras: number) {
  const [horaStr, minutoStr] = this.selectedActiveHour.split(':');
  let hora = parseInt(horaStr, 10);

  hora += deltaHoras;

  if (hora < 0) hora = 23;
  if (hora > 23) hora = 0;

  this.selectedActiveHour = `${hora.toString().padStart(2, '0')}:${minutoStr || '00'}`;

  // Al cambiar de hora, activamos inmediatamente el loader en la card
  this.isLoadingCheckins = true;
  this.sincronizarCheckinsEnVivo();
}

  guardarConfiguracionHorarios() {
    this.showScheduleModal = false;
  }

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
      this.teacherForm.reset({ colorHex: this.colorOptions[0] });
      this.skillsList.set([]);
      this.photoPreview = null;
      this.showTeacherModal = false;
    }
  }

  cargarDatosDashboard() {
  //  this.isLoading = true;
    const requestBody = {
      email: "administracion@gmail.com",
      idSucursal: "BEAST-TESISTAN",
      fecha: "2026-08-11"
    };

    this.dashboardService.obtenerInfoDashboard(requestBody).subscribe({
      next: (response) => {
        this.dashboardData = response;
        this.isLoading = false;
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
    this.showLogoutConfirm = false;
  }

 sincronizarCheckinsEnVivo() {
  const currentRequestId = ++this.requestCounter;

  // Resetear estados al iniciar nueva consulta
  this.isLoadingCheckins = true;
  this.checkinsList = [];
  this.totalAgendadas = 0;
  this.totalCheckins = 0;
  this.porcentajeAsistencia = 0;

  try {
    if (this.unsubscribeCheckins) {
      this.unsubscribeCheckins();
    }

    const timeInfo = this.getCurrentScheduleHour();
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    const sucursal = session?.brancheInUser?.[0] || 'BEAST';

    const hourDocRef = doc(
      getFirestore(),
      'classes', 'studios', sucursal, '2026-08', 'dias', timeInfo.day, 'SCHEDULES', this.selectedActiveHour
    );

    const agenciasRef = collection(hourDocRef, 'AGENDAS');

    this.unsubscribeCheckins = onSnapshot(agenciasRef, (snapshot) => {
      // Si la petición actual ya cambió, ignoramos esta respuesta
      if (currentRequestId !== this.requestCounter) return;

      let listaTemporal: CheckinData[] = [];
      let checkinsHechos = 0;

      // Firestore dispara onSnapshot incluso si está vacío (snapshot.empty es true)
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as CheckinData;
        listaTemporal.push(data);
        if (data.estatusCheckin === 1) {
          checkinsHechos++;
        }
      });

      this.checkinsList = listaTemporal;
      this.totalAgendadas = snapshot.docs.length;
      this.totalCheckins = checkinsHechos;
      this.porcentajeAsistencia = this.totalAgendadas > 0
        ? Math.round((checkinsHechos / this.totalAgendadas) * 100)
        : 0;

      // SIEMPRE desactivar el loader aquí, aunque esté vacío
      this.isLoadingCheckins = false;
      this.cdr.detectChanges(); // IMPORTANTE: Forzar cambio de UI

    }, (error) => {
      if (currentRequestId === this.requestCounter) {
        console.error("Error en listener de Firestore:", error);
        this.isLoadingCheckins = false;
        this.cdr.detectChanges();
      }
    });
  } catch (e) {
    console.error("Error crítico al configurar listener:", e);
    this.isLoadingCheckins = false;
    this.cdr.detectChanges();
  }
}


  getCurrentScheduleHour(): { anio: string, anioMesSub: string, day: string, horaStr: string } {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = now.getDate().toString().padStart(2, '0');

    const anioMesSub = `${year}-${month}`;
    const day = `${year}-${month}-${dayStr}`;

    let hours = now.getHours();
    let minutes = now.getMinutes();

    if (minutes > 30) {
      hours += 1;
      minutes = 0;
    } else {
      minutes = 0;
    }

    const formattedHour = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const horaStr = `${formattedHour}:${formattedMinutes}`;

    return { anio: year, anioMesSub, day, horaStr };
  }
}
