import { Component, OnInit, signal, inject, Injector,ViewChild,ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DashboardService } from './home.service';
import { DashBoardResponse, TypeClassModel, TeacherResponse } from './home.model';
import { TypeClassModalComponent } from './dialogsComponents/tipoClase/type-class-modal.component';
import { AlumnaModalComponent } from './dialogsComponents/nuevaAlumna/nueva-alumna.component';
import { PlanModalComponent } from './dialogsComponents/nuevoPlan/nuevo-plan.component'; // <--- Importa tu nuevo modal
// ... tus imports de iconos
import { collection, onSnapshot, Unsubscribe, getFirestore ,doc,updateDoc} from 'firebase/firestore'; // SDK estándar
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Chart, registerables } from 'chart.js';
import { FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  LucideAngularModule, RotateCcw, LayoutDashboard, Users, Briefcase,
  CreditCard, Settings, Search, Bell, HelpCircle, Dumbbell, LogOut,
  AlertCircle, X, CheckCircle2, Calendar, UserPlus, GraduationCap,
  Building2, Clock, Tag, Bike,Plus
} from 'lucide-angular';

import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexAxisChartSeries,
  ApexNonAxisChartSeries,
  ApexXAxis,
  ApexStroke,
  ApexTooltip,
  ApexDataLabels,
  ApexPlotOptions
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  labels: string[];
  colors: string[];
};

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
    TypeClassModalComponent,
    AlumnaModalComponent,
    PlanModalComponent,
    NgApexchartsModule
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);
acumuladoIngresos = 0;
  acumuladoGastos = 0;
  listaPagos: any[] = [];
  listaGastos: any[] = [];
  showCreateModal = signal<boolean>(false);
  // Opciones de configuración para las gráficas de ApexCharts
  pagosChartOptions: Partial<ChartOptions> = {};
  gastosChartOptions: Partial<ChartOptions> = {};
  tipoGraficaPagos: 'bar' | 'line' | 'doughnut' = 'bar';
  tipoGraficaGastos: 'bar' | 'line' | 'doughnut' = 'doughnut';

  private pagosChartInstance: Chart | null = null;
  private gastosChartInstance: Chart | null = null;

  @ViewChild('pagosCanvas') pagosCanvas!: ElementRef;
  @ViewChild('gastosCanvas') gastosCanvas!: ElementRef;

    private authService = inject(AuthService);
  dashboardData: DashBoardResponse | null = null;
  isLoading = false;

  readonly icons = {
    X, RotateCcw, LayoutDashboard, Users, Briefcase, CreditCard,
    Settings, Search, Bell, HelpCircle, Dumbbell, LogOut,
    AlertCircle, CheckCircle2, Calendar, UserPlus, GraduationCap,
    Building2, Clock, Tag, Bike,Plus
  };

  currentScheduleMeta: any = {
  coach: 'Instructor',
  name: 'Clase de Ciclismo',
  duration: 45,
  level: 1,
  photo: ''
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
   readonly Plus = Plus;
showModal = false;
isEditing = false;
selectedStudent: any = null;
  showUserMenu = false;
  showLogoutConfirm = false;
 showPlanModal = signal<boolean>(false);
 showReservaBuscador = false;
searchAlumnaCtrl = new FormControl('');
allStudents: any[] = [];
filteredStudents: any[] = [];
showSuggestions = false;
unsubStudents: any = null;
checkinsList: CheckinData[] = [];
private injector = inject(Injector);
  private unsubscribeCheckins?: Unsubscribe;
  idBranch: string = "";
  activeHour: string = '00:00';
  totalAgendadas: number = 0;
  totalCheckins: number = 0;
  porcentajeAsistencia: number = 0;
tipoGraficaPagosActiva: 'line' | 'bar' | 'area' = 'bar';
tipoGraficaGastosActiva: 'bar' | 'line' | 'donut' = 'donut';
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
  userData: any = null;
// --- Propiedades nuevas para la reserva ---
selectedStudentForBooking: any = null; // Alumna seleccionada del buscador
currentClassItem: any = null;          // Datos de la clase obtenidos de la hora activa
isBookingClass = false;                // Loader para el botón de confirmar agenda
showBookingSuccessModal = false;       // Diálogo de éxito
showBookingErrorModal = false;         // Diálogo de error
bookingErrorMessage = '';
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
      const sucursal = this.authService.getSucursal();
  console.log("Sucursal obtenida:", sucursal); // <-- Revisa en consola si imprime el objeto

        this.userData = this.authService.getSession();
        this.idBranch == this.userData?.brancheInUser?.[0] || ""
        this.typeClasses = sucursal.branchInfo.typeClasses || []
          console.log("Sucursal clases:", this.typeClasses);
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
abrirModalPlanes() {
  this.showPlanModal.set(true);
}
abrirNuevaAlumna() {
  this.isEditing = false;

  // CORRECCIÓN: Usamos '=' para asignar y un fallback seguro con '?? ""'
  this.idBranch = this.userData?.brancheInUser?.[0] ?? "";

  this.selectedStudent = {
    id: 'SP-' + Math.floor(1000 + Math.random() * 9000),
    name: '',
    phone: '',
    email: '',
    password: 'Beast123',
    status: 'ACTIVO',
    avatar: `https://i.pravatar.cc/150?u=${Math.random()}`
  };
  this.showModal = true;
}

onStudentSaved(savedStudent: any) {
  console.log("Alumna guardada con éxito:", savedStudent);
  // Aquí puedes refrescar tus métricas del dashboard si lo requieres
}
// Dentro de tu clase HomeComponent:
handleClassSaved(nuevaClase: TypeClassModel) {
  this.typeClasses.update(list => [...list, nuevaClase]);
}
  toggleHour(h: string) {
  let currentList = this.selectedSchedules();

  if (currentList.includes(h)) {
    // Si ya existe, lo quitamos
    currentList = currentList.filter(item => item !== h);
  } else {
    // Si no existe, lo agregamos
    currentList = [...currentList, h];
  }

  // 🌟 Ordenar cronológicamente de forma ascendente (ej: "09:00", "10:00", etc.)
  currentList.sort((a, b) => a.localeCompare(b));

  // Actualizamos la señal o variable
  this.selectedSchedules.set(currentList);
}

// Guardar los horarios actualizados en la colección /branches/{idBranch} -> campó schedulersStudio
async saveSchedulesToBranch() {
  try {
    const db = getFirestore();
    const branchRef = doc(db, `branches/${this.userData?.brancheInUser?.[0] || ""}`); // Asegúrate de tener tu idBranch actual

    await updateDoc(branchRef, {
      schedulersStudio: this.selectedSchedules(),
      updatedAt: new Date().toISOString()
    });

    alert('¡Horarios de la sucursal actualizados exitosamente!');
    this.showScheduleModal = false;
  } catch (error: any) {
    console.error('Error al actualizar los horarios en la sucursal:', error);
    alert('Hubo un error al guardar los horarios.');
  }
}

  get balanceNeto(): number {
    return (this.acumuladoIngresos || 0) - (this.acumuladoGastos || 0);
  }
  setTipoGraficaGastos(tipo: 'bar' | 'line' | 'doughnut') {
    this.tipoGraficaGastos = tipo;
    this.renderizarGraficas();
  }

 actualizarGraficaPagos(tipo: 'line' | 'bar' | 'area') {
  this.tipoGraficaPagosActiva = tipo; // <--- Actualizamos el estado activo
  const pagosOrdenados = [...this.listaPagos].sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());

  const categories = pagosOrdenados.map(p => p.fechaRegistro ? p.fechaRegistro.substring(0, 10) : p.id);
  const data = pagosOrdenados.map(p => p.monto);

  this.pagosChartOptions = {
    series: [{ name: 'Ingresos ($ MXN)', data }],
    chart: { type: tipo, height: 320, toolbar: { show: false } },
    colors: ['#10B981'],
    stroke: { curve: 'smooth', width: 3 },
    xaxis: { categories },
    tooltip: { x: { format: 'dd/MM/yyyy' } }
  };
}
  actualizarGraficaGastos(tipo: 'bar' | 'line' | 'donut') {
  this.tipoGraficaGastosActiva = tipo; // <--- Actualizamos el estado activo
  if (tipo === 'donut') {
    const agrupado: { [key: string]: number } = {};
    this.listaGastos.forEach(g => {
      const nombreCat = this.getNombreTipoGasto(g.tipoGasto);
      agrupado[nombreCat] = (agrupado[nombreCat] || 0) + Number(g.monto);
    });

    this.gastosChartOptions = {
      series: Object.values(agrupado),
      labels: Object.keys(agrupado),
      chart: { type: 'donut', height: 320 },
      colors: ['#F43F5E', '#8B5CF6', '#F59E0B', '#3B82F6']
    };
  } else {
    const gastosOrdenados = [...this.listaGastos].sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());
    const categories = gastosOrdenados.map(g => g.fechaRegistro ? g.fechaRegistro.substring(0, 10) : g.id);
    const data = gastosOrdenados.map(g => g.monto);

    this.gastosChartOptions = {
      series: [{ name: 'Egresos ($ MXN)', data }],
      chart: { type: tipo, height: 320, toolbar: { show: false } },
      colors: ['#F43F5E'],
      stroke: { curve: 'smooth', width: 3 },
      xaxis: { categories }
    };
  }
}
  hasPermission(subModule: string): boolean {
  if (!this.userData) return false;
  const permissions = this.userData.permissions || this.userData;

  // Si evalúas el home general o una subcategoría hija
  const key = subModule.startsWith('home_') ? `permission-${subModule}` : `permission-home_${subModule}`;

  return permissions[key] === true;
}
// Asegúrate de tenerlo inyectado en el constructor:
// constructor(private cdr: ChangeDetectorRef, ...) {}

openBikesModal() {
  const sucursal = this.authService.getSucursal();
  console.log("Sucursal obtenida:", sucursal); // <-- Revisa en consola si imprime el objeto

  this.currentBikesNumber = sucursal?.branchInfo.myBikes?.length || 0;
  this.showBikesModal = true;
  this.cdr.detectChanges();
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

// Método para alternar la vista del buscador y cargar los datos la primera vez
toggleBuscadorReserva() {
  this.showReservaBuscador = !this.showReservaBuscador;
  if (this.showReservaBuscador && this.allStudents.length === 0) {
    this.loadStudentsForSearch();
  }
}

loadStudentsForSearch() {
  const db = getFirestore();
  // Asegúrate de que idBranch tenga valor, de lo contrario usa un respaldo
  const branch = this.idBranch || 'BEAST-TESISTAN';
  const studentsRef = collection(db, `suscriptionsBranches/${branch}/suscriptions`);

  if (this.unsubStudents) {
    this.unsubStudents(); // Limpiamos suscripción previa si existe
  }

  this.unsubStudents = onSnapshot(studentsRef, (snapshot) => {
    this.allStudents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        fullName: data['fullName'] || '',
        email: data['email'] || '',
        phone: data['phone'] || ''
      };
    });
    console.log("Alumnas cargadas para búsqueda:", this.allStudents.length);

    // Forzamos actualización por si el usuario ya estaba escribiendo
    if (this.searchAlumnaCtrl.value) {
      this.filterStudents(this.searchAlumnaCtrl.value);
    }
    this.cdr.detectChanges();
  }, error => {
    console.error('Error al cargar alumnas:', error);
  });
}
filterStudents(search: string | null) {
  if (!search || search.trim() === '') {
    this.filteredStudents = [];
    this.showSuggestions = false;
    this.cdr.detectChanges();
    return;
  }

  const filter = search.toLowerCase();
  this.filteredStudents = this.allStudents.filter(s =>
    s.fullName.toLowerCase().includes(filter) || s.phone.includes(filter)
  );

  this.showSuggestions = this.filteredStudents.length > 0;
  this.cdr.detectChanges(); // Vital para que el @if despliegue la lista al instante
}

selectStudentForReserva(student: any) {
  this.selectedStudentForBooking = student;
  this.searchAlumnaCtrl.setValue(student.fullName);
  this.showSuggestions = false;

  // Construimos el item usando la información sincronizada de la clase en curso
  this.currentClassItem = {
    coach: this.currentScheduleMeta.coach,
    name: this.currentScheduleMeta.name,
    time: this.selectedActiveHour,
    duration: this.currentScheduleMeta.duration,
    cancelada: false,
    level: this.currentScheduleMeta.level,
    agenda: this.totalAgendadas || 0,
    total: this.totalCheckins || 0,
    photo: this.currentScheduleMeta.photo,
    status: 'AVAILABLE',
    isScheduled: true
  };

  this.cdr.detectChanges();
}

// Función para consumir el servicio de agendar
confirmarAgendaClase() {
  if (!this.selectedStudentForBooking || !this.currentClassItem) return;

  this.isBookingClass = true;
  const session = JSON.parse(localStorage.getItem('user_session') || '{}');
  const sucursal = session?.brancheInUser?.[0] || 'BEAST';
  const timeInfo = this.getCurrentScheduleHour();

  // Estructura BookingClassRequest
  const payload = {
    correo: this.selectedStudentForBooking.email,
    nombre: this.selectedStudentForBooking.fullName,
    telefono: this.selectedStudentForBooking.phone || '',
    idSucursal: sucursal,
    dia: timeInfo.day || 'lunes',
    horario: this.selectedActiveHour,
    itemClass: this.currentClassItem,
    bookOrCancel: 1 // 1 para Agendar
  };

  const url = 'https://agendarclase-rdotx3vmaq-uc.a.run.app';

  this.http.post<any>(url, payload).subscribe({
    next: (response) => {
      this.isBookingClass = false;
      if (response && response.success) {
        this.showBookingSuccessModal = true;
        // Limpiamos selección tras éxito
        this.selectedStudentForBooking = null;
        this.searchAlumnaCtrl.setValue('');
      } else {
        this.bookingErrorMessage = response?.message || response?.error || 'No se pudo procesar la reserva.';
        this.showBookingErrorModal = true;
      }
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.isBookingClass = false;
      this.bookingErrorMessage = err?.error?.error || err?.message || 'Error de conexión con el servidor.';
      this.showBookingErrorModal = true;
      this.cdr.detectChanges();
    }
  });
}

// Cancelar/Cerrar la selección de la alumna
cancelarSeleccionReserva() {
  this.selectedStudentForBooking = null;
  this.searchAlumnaCtrl.setValue('');
  this.showSuggestions = false;
  this.cdr.detectChanges();
}

  isHourSelected(hora: string): boolean {
    return this.selectedSchedules().includes(hora);
  }

    get availableHoursCatalog(): string[] {
    const sucursal = this.authService.getSucursal();
    if (sucursal && sucursal.branchInfo && sucursal.branchInfo.schedulersStudio) {
      return sucursal.branchInfo.schedulersStudio;
    }
    return [];
  }
  formatearHora12Hrs(hora24: string): string {
  if (!hora24 || !hora24.includes(':')) return hora24;

  const partes = hora24.split(':');
  let horas = parseInt(partes[0], 10);
  const minutos = partes[1];

  const ampm = horas >= 12 ? 'PM' : 'AM';
  horas = horas % 12;
  horas = horas ? horas : 12; // La hora '0' se convierte en '12'

  return `${horas}:${minutos} ${ampm}`;
}

// Valida si la hora actual permite realizar reservas (futuro o hasta 15 min tarde de la hora actual)
get esHorarioPermitidoParaAgendar(): boolean {
  if (!this.selectedActiveHour) return false;

  const ahora = new Date();
  const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();

  // Separar las horas y minutos del horario activo (ej. "18:00")
  const [horaStr, minStr] = this.selectedActiveHour.split(':');
  const horaClaseMinutos = parseInt(horaStr, 10) * 60 + parseInt(minStr || '0', 10);

  // NOTA: Si estás evaluando días distintos a hoy, puedes agregar una validación de fecha aquí.
  // Asumiendo que estamos evaluando el día en curso:
  const diferenciaMinutos = horaActualMinutos - horaClaseMinutos;

  // Caso 1: La clase es en el futuro (diferencia menor a 0) -> Permitido
  // Caso 2: La clase es la actual y han pasado 15 minutos o menos (entre 0 y 15 inclusive) -> Permitido
  // Caso 3: Ya pasó la hora y han transcurrido más de 15 minutos -> Bloqueado
  if (diferenciaMinutos <= 15) {
    return true;
  }

  return false;
}

cambiarHora(deltaHoras: number) {
  // 1. Obtener el catálogo de horarios reales de la sucursal
  const horariosDisponibles = this.availableHoursCatalog;

  // Si no hay horarios configurados, no hacemos nada
  if (!horariosDisponibles || horariosDisponibles.length === 0) {
    return;
  }

  // 2. Buscar el índice del horario actual seleccionado en la lista
  let currentIndex = horariosDisponibles.indexOf(this.selectedActiveHour);

  // Si por alguna razón el horario actual no está en la lista, comenzamos por el primero (índice 0)
  if (currentIndex === -1) {
    currentIndex = 0;
  }

  // 3. Aplicar el desplazamiento (delta: +1 para siguiente, -1 para anterior)
  currentIndex += deltaHoras;

  // 4. Comportamiento Circular (Loop)
  if (currentIndex >= horariosDisponibles.length) {
    currentIndex = 0; // Si pasa del último, regresa al primero
  } else if (currentIndex < 0) {
    currentIndex = horariosDisponibles.length - 1; // Si va antes del primero, se va al último
  }

  // 5. Asignar el nuevo horario activo de la lista
  this.selectedActiveHour = horariosDisponibles[currentIndex];

  // 6. Activar el loader y sincronizar los check-ins en vivo con el nuevo horario
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
        this.authService.saveSucursal(response);
        this.isLoading = false;
       this.acumuladoIngresos = response.finanzas.pagos?.acumulado_mensual || 0;
        this.listaPagos = response.finanzas.pagos?.registros || [];
        // 🌟 SINCRONIZAR HORARIOS GUARDADOS DE LA SUCURSAL
        if (response.branchInfo && response.branchInfo.schedulersStudio) {
          // Aseguramos que vengan ordenados cronológicamente
          const horariosGuardados = [...response.branchInfo.schedulersStudio];
          horariosGuardados.sort((a, b) => a.localeCompare(b));
          this.selectedSchedules.set(horariosGuardados);
        }

        this.acumuladoGastos = response.finanzas.gastos?.acumulado_mensual || 0;
        this.listaGastos = response.finanzas.gastos?.registros || [];
        this.actualizarGraficaPagos(this.tipoGraficaPagosActiva);
        this.actualizarGraficaGastos(this.tipoGraficaGastosActiva);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al obtener el dashboard", err);
        this.isLoading = false;
      }
    });
  }

  // Cambiar tipo de gráfica para Ingresos/Pagos
  setTipoGraficaPagos(tipo: 'bar' | 'line' | 'doughnut') {
    this.tipoGraficaPagos = tipo;
  }

  // --- AÑADE ESTOS MÉTODOS EN TU HomeComponent ---

  // Agrupar y sumar pagos por concepto (para la gráfica de ingresos)
  get pagosPorConcepto(): { nombre: string, total: number, porcentaje: number }[] {
    const agrupado: { [key: string]: number } = {};
    let totalGeneral = this.acumuladoIngresos || 1; // Evitar división por cero

    this.listaPagos.forEach(p => {
      const concepto = p.concepto || 'General';
      agrupado[concepto] = (agrupado[concepto] || 0) + Number(p.monto || 0);
    });

    return Object.keys(agrupado).map(nombre => ({
      nombre,
      total: agrupado[nombre],
      porcentaje: Math.round((agrupado[nombre] / totalGeneral) * 100)
    }));
  }

  // Agrupar y sumar gastos por tipo de gasto (para la gráfica de egresos)
  get gastosPorTipo(): { nombre: string, total: number, porcentaje: number }[] {
    const agrupado: { [key: string]: number } = {};
    let totalGeneral = this.acumuladoGastos || 1;

    this.listaGastos.forEach(g => {
      const tipoNombre = this.getNombreTipoGasto(g.tipoGasto);
      agrupado[tipoNombre] = (agrupado[tipoNombre] || 0) + Number(g.monto || 0);
    });

    return Object.keys(agrupado).map(nombre => ({
      nombre,
      total: agrupado[nombre],
      porcentaje: Math.round((agrupado[nombre] / totalGeneral) * 100)
    }));
  }





  renderizarGraficas() {
   // --- 1. GRÁFICA DE PAGOS (INGRESOS) ---
    if (this.pagosCanvas) {
      if (this.pagosChartInstance) this.pagosChartInstance.destroy();

      // Ordenar por fecha cronológicamente
      const pagosOrdenados = [...this.listaPagos].sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());

      const labelsPagos = pagosOrdenados.map(p => p.fechaRegistro ? p.fechaRegistro.substring(0, 10) : p.id);
      const dataPagos = pagosOrdenados.map(p => p.monto);

      this.pagosChartInstance = new Chart(this.pagosCanvas.nativeElement, {
        type: this.tipoGraficaPagos,
        data: {
          labels: labelsPagos,
          datasets: [{
            label: 'Ingresos ($ MXN)',
            data: dataPagos,
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: this.tipoGraficaPagos === 'doughnut' ? {} : {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
          }
        }
      });
    }

    // --- 2. GRÁFICA DE GASTOS ---
    if (this.gastosCanvas) {
      if (this.gastosChartInstance) this.gastosChartInstance.destroy();

      const gastosOrdenados = [...this.listaGastos].sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());

      const labelsGastos = gastosOrdenados.map(g => g.fechaRegistro ? g.fechaRegistro.substring(0, 10) : g.id);
      const dataGastos = gastosOrdenados.map(g => g.monto);

      this.gastosChartInstance = new Chart(this.gastosCanvas.nativeElement, {
        type: this.tipoGraficaGastos,
        data: {
          labels: labelsGastos,
          datasets: [{
            label: 'Gastos ($ MXN)',
            data: dataGastos,
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            borderColor: 'rgba(244, 63, 94, 1)',
            borderWidth: 2,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: this.tipoGraficaGastos === 'doughnut' ? {} : {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
          }
        }
      });

    }

    // --- 2. GRÁFICA DE GASTOS ---
    if (this.gastosCanvas) {
      if (this.gastosChartInstance) this.gastosChartInstance.destroy();

      const gastosOrdenados = [...this.listaGastos].sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());

      const labelsGastos = gastosOrdenados.map(g => g.fechaRegistro ? g.fechaRegistro.substring(0, 10) : g.id);
      const dataGastos = gastosOrdenados.map(g => g.monto);

      this.gastosChartInstance = new Chart(this.gastosCanvas.nativeElement, {
        type: this.tipoGraficaGastos,
        data: {
          labels: labelsGastos,
          datasets: [{
            label: 'Gastos ($ MXN)',
            data: dataGastos,
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            borderColor: 'rgba(244, 63, 94, 1)',
            borderWidth: 2,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: this.tipoGraficaGastos === 'doughnut' ? {} : {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  getNombreTipoGasto(tipoGasto: number): string {
    switch (tipoGasto) {
      case 0: return 'Insumos / Operativo';
      case 2: return 'Nómina / Personal';
      case 3: return 'Servicios / Varios';
      default: return 'General';
    }
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

    const db = getFirestore();
    const hourDocRef = doc(
      db,
      'classes', 'studios', sucursal, '2026-08', 'dias', timeInfo.day, 'SCHEDULES', this.selectedActiveHour
    );

    // 1. Opcional: Si necesitas leer los metadatos de la clase (coach, nombre) directamente de Firestore
    // Puedes usar un getDoc o un onSnapshot al documento padre 'hourDocRef'
    import('firebase/firestore').then(async ({ getDoc }) => {
      try {
        const docSnap = await getDoc(hourDocRef);
        if (docSnap.exists()) {
          const classData = docSnap.data();
          // Guardamos la info real obtenida de Firestore
          this.currentScheduleMeta = {
            coach: classData['coach'] || classData['instructor'] || this.currentScheduleMeta.coach || 'Instructor',
            name: classData['name'] || classData['className'] || this.currentScheduleMeta.name || 'Clase de Ciclismo',
            duration: classData['duration'] || 45,
            level: classData['level'] || 1,
            photo: classData['photo'] || ''
          };
        }
      } catch (err) {
        console.error("Error al leer metadatos de la clase:", err);
      }
    });

    const agenciasRef = collection(hourDocRef, 'AGENDAS');

    this.unsubscribeCheckins = onSnapshot(agenciasRef, (snapshot) => {
      // Si la petición actual ya cambió, ignoramos esta respuesta
      if (currentRequestId !== this.requestCounter) return;

      let listaTemporal: CheckinData[] = [];
      let checkinsHechos = 0;

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

      this.isLoadingCheckins = false;
      this.cdr.detectChanges();

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
