import { Component, OnInit, inject,signal ,ChangeDetectorRef,computed} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule,HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme.service';
import * as CryptoJS from 'crypto-js';
import { FormsModule } from '@angular/forms';
import { SPECIALTY_MAP } from './../utils/specialties.constants'; // Ajusta la ruta según corresponda
import { FloatingChatComponent } from '../home/chatbot/floating-chat.component';
import { TokenInterceptorService } from '../auth/token-interceptor.service'; // Asegúrate de ajustar la ruta correcta de tu servicio
import { Subscription } from 'rxjs';
import { FcmService } from './../auth/fcm.service';
import { NotificationToastComponent } from './../auth/notification-toast.component';
import {
  LucideAngularModule,
  PanelLeft,
  PanelLeftClose,
  RotateCcw,
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  DollarSign,
  Store,
  Bell,
  HelpCircle,
  LogOut,
  X,
  Activity,
  CheckCircle2,
  Printer,
  Bluetooth,
  RefreshCw,
  Shield,
  UserCog,
  Receipt,
  Calendar,
  MessageSquare,
  Bot,
  Smartphone,
  Layers,
  ChevronRight,
  Settings,
  Plus,
  Search,
  LogOutIcon,
  Stethoscope,
  Baby,
  HeartPulse,
  Sparkles,
  UserCheck,
  Bone,
  Smile,

} from 'lucide-angular';

declare global {
  interface Navigator {
    bluetooth: any;
  }
}

export interface InfoNotification {
id: string;
  idAppointment?: string;
  telefono?: string;
  estadoRespuesta?: string; // "confirmada" o "cancelada"
  mensajeOriginal?: string;
  fechaCita?: string;
  horaCita?: string;
  updatedAt?: string;
}

export interface NotificationsResponse {
  error: string;
  count: number;
  notifications: InfoNotification[];
}
export interface Paciente {
  id: string;
  idPaciente?: string;
  nombre: string;
  telefono: string;
  correo: string;
  expedienteNum: string;
  categoriaConsulta: string;
  ultimaVisita: string;
  numeroVisitas: number;
  esPrimeraVez: boolean;
  edad: number;
  sexo: string;
}


@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, HttpClientModule,FormsModule,FloatingChatComponent
    ,NotificationToastComponent
  ],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit {
    private tokenInterceptor = inject(TokenInterceptorService);
    private fcmService = inject(FcmService);
   private cdr = inject(ChangeDetectorRef);
   readonly icons = { X };
   isSwitchingBranch = signal<boolean>(false);
  isAppointmentDetailModalOpen = signal<boolean>(false);
selectedAppointment = signal<any | null>(null);
  private readonly GET_FOLLOWING_APPOINTMENTS_URL = 'https://syncfollowingappointments-o7vmreizjq-uc.a.run.app';
    private readonly SAVE_APPOINTMENT_URL = 'https://saveappointment-o7vmreizjq-uc.a.run.app';
    private readonly GET_PATIENTS_URL = 'https://getpatients-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';
private readonly GET_DOCTORS_OFFICE_URL = 'https://getdoctorsoffice-o7vmreizjq-uc.a.run.app';
  private authService = inject(AuthService);
  router = inject(Router);
  private http = inject(HttpClient);
  themeService = inject(ThemeService);
  pacientes = signal<Paciente[]>([]);
  showUserMenu = false;
  showLogoutConfirm = false;
  showNoConsultoriosModal = signal<boolean>(false);
  userData: any = null;
  isSidebarCollapsed = false;
  showAppointmentModal = false;
  targetDate = '';
  targetHour = '09:00';
  selectedDurationMinutes: number = 60; // Por defecto 1 hr
  showBranchModal = false;
  selectedBranch: string = '';
  tempSelectedBranch: any = null;
  availableBranches: any[] = [];
  isLoadingBranches = false;
showSuccessModal = false;
  patientSearchQuery = '';
filteredPatients: any[] = [];
showPatientDropdown = false;
  patientForm = {
    name: '',
    phone: '',
    email: '',
    reason: ''
  };
  private appointmentsSub?: Subscription;
  specialtyIcons = {
  general: Stethoscope,
  pediatria: Baby,
  cardiologia: HeartPulse,
  dermatologia: Sparkles,
  ginecologia: UserCheck,
  traumatologia: Bone,
  dentista: Smile,
  default: Layers
};
isSaving = false;
selectedModalDate: string = new Date().toISOString().split('T')[0]; // Por defecto hoy (YYYY-MM-DD)
selectedModalHour: string = ''; // Hora elegida mediante chips
availableTimeSlots: { time: string; label: string; available: boolean }[] = [];
  searchQuery = signal<string>('');
appointmentSearchQuery = signal<string>('');
upcomingAppointments = signal<any[]>([]);

filteredAppointments = computed(() => {
    const query = this.appointmentSearchQuery().toLowerCase().trim();
    if (!query) return [];

    return this.upcomingAppointments().filter(app =>
      (app.patientName && app.patientName.toLowerCase().includes(query)) ||
      (app.phone && app.phone.toLowerCase().includes(query)) ||
      (app.reason && app.reason.toLowerCase().includes(query)) ||
      (app.date && app.date.toLowerCase().includes(query))
    );
  });


getSpecialtyLabel(code: string | undefined): string {
  if (!code) return 'Elegir especialidad';
  return SPECIALTY_MAP[code] || code; // Si encuentra el código del catálogo pone el name, sino muestra el texto original o un fallback
}

async confirmBranchChange() {
    if (!this.tempSelectedBranch) return;

    const nuevaSucursal = this.tempSelectedBranch;
    const nuevoConsultorioId = nuevaSucursal.idConsultorio || nuevaSucursal.id;
    const consultorioActual = this.authService.getSucursal();
    const actualConsultorioId = consultorioActual?.idConsultorio || consultorioActual?.id;

    // Solo procedemos si realmente cambió de consultorio
    if (nuevoConsultorioId !== actualConsultorioId) {
      try {
        this.isSwitchingBranch.set(true); // 🔄 Activar loader de sincronización
        this.showBranchModal = false;

        // 1️⃣ Limpiar toda la caché del consultorio previo
        this.authService.clearBranchCache();

        // 2️⃣ Guardar la nueva sucursal activa
        this.authService.saveSucursal(nuevaSucursal);
        this.selectedBranch = nuevaSucursal.name;

        // 3️⃣ Redirigir inmediatamente al Home independientemente de la pestaña actual
        await this.router.navigate(['/home']);

        // 4️⃣ Sincronizar en paralelo la información del nuevo consultorio
        await Promise.all([
          this.cargarFollowingAppointments(nuevoConsultorioId),
          this.cargarPacientes(nuevoConsultorioId)
        ]);

        console.log('✨ Sincronización de nueva sucursal completada con éxito.');
      } catch (err) {
        console.error('❌ Error al sincronizar la nueva sucursal:', err);
      } finally {
        this.isSwitchingBranch.set(false); // ⏹️ Desactivar loader
        this.cdr.detectChanges();
      }
    } else {
      this.showBranchModal = false;
    }
  }

generateTimeSlots() {
  const cachedApps = this.authService.getCachedAppointments();
  // Filtrar citas que correspondan estrictamente a la fecha seleccionada en el modal
  const appsForDay = cachedApps.filter(app => app.date === this.selectedModalDate);

  const slots = [];
  // Supongamos un horario de atención de 08:00 a 20:00 (8 AM a 8 PM)
  let currentMinutes = 8 * 60; // 08:00 AM en minutos
  const endMinutes = 20 * 60;  // 20:00 PM en minutos
  const interval = 30;         // Intervalos de 30 minutos

  const durationMins = Number(this.selectedDurationMinutes) || 60;

  while (currentMinutes + durationMins <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60);
    const startM = currentMinutes % 60;
    const timeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

    const slotEndMins = currentMinutes + durationMins;

    // Verificar si se cruza con alguna cita existente en ese día
    let isOccupied = false;
    for (const app of appsForDay) {
      const appStartMins = this.parseTimeToMinutes(app.time);
      const appEndMins = this.parseTimeToMinutes(app.endTime || this.calculateEndTimeAndLabel(app.time, 60).endTime);

      // Comprobación de solapamiento de rangos [start, end)
      if (currentMinutes < appEndMins && slotEndMins > appStartMins) {
        isOccupied = true;
        break;
      }
    }

    slots.push({
      time: timeStr,
      label: timeStr, // Puedes formatearlo a 12h si prefieres (ej. 09:00 AM)
      available: !isOccupied
    });

    currentMinutes += interval;
  }

  this.availableTimeSlots = slots;

  // Si la hora seleccionada actualmente ya no está disponible, la limpiamos
  const currentSelected = this.availableTimeSlots.find(s => s.time === this.selectedModalHour);
  if (!currentSelected || !currentSelected.available) {
    this.selectedModalHour = '';
  }
}
getSpecialtyIcon(code: string | undefined) {
  if (!code) return this.specialtyIcons.default;

  const mapping: Record<string, any> = {
    'GEN': this.specialtyIcons.general,
    'PED': this.specialtyIcons.pediatria,
    'CAR': this.specialtyIcons.cardiologia,
    'DER': this.specialtyIcons.dermatologia,
    'GINE': this.specialtyIcons.ginecologia,
    'TRAUM': this.specialtyIcons.traumatologia,
    'DENT': this.specialtyIcons.dentista,
  };

  return mapping[code] || this.specialtyIcons.default;
}
async saveAppointment() {
  if (!this.selectedModalDate || !this.selectedModalHour) {
    alert('Por favor selecciona una fecha y un horario disponible.');
    return;
  }
  if (!this.patientForm.name || !this.patientForm.phone) {
    alert('Por favor ingresa al menos el nombre y teléfono del paciente.');
    return;
  }

  try {
    this.isSaving = true; // 🔄 Activar loader
    this.cdr.detectChanges();

    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      alert('No se encontró una sesión activa o token JWT. Inicie sesión nuevamente.');
      return;
    }

    const normalizedStartTime = this.convertTo24Hour(this.selectedModalHour);
    const { endTime, durationLabel } = this.calculateEndTimeAndLabel(normalizedStartTime, Number(this.selectedDurationMinutes));
    const activeSucursal = this.authService.getSucursal();
    const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';

    const newAppointmentData: any = {
      time: normalizedStartTime,
      endTime: endTime,
      durationMinutes: Number(this.selectedDurationMinutes),
      durationLabel: durationLabel,
      patientName: this.patientForm.name,
      phone: this.patientForm.phone,
      email: this.patientForm.email,
      reason: this.patientForm.reason,
      date: this.selectedModalDate,
      status: 0,
      colorClass: this.getRandomStrongColor(),
      syncId: new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    };

    const payload = {
      idConsultorio: idConsultorio,
      appointmentData: newAppointmentData
    };

    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

    const response = await fetch(this.SAVE_APPOINTMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-signature': this.APP_SECRET_HEADER,
        'x-client-source': 'angular',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ encryptedData: ciphertext })
    });

    const jsonRes = await response.json();
    if (!response.ok) {
      throw new Error(jsonRes.error || 'Error al registrar la cita en el servidor.');
    }

    // 💾 Guardado local inmediato en caché y actualización de la señal
    this.authService.saveCachedAppointments([newAppointmentData]);
    this.upcomingAppointments.set(this.authService.getCachedAppointments());

    this.showAppointmentModal = false;
    this.showSuccessModal = true; // ✨ Muestra el diálogo de éxito

  } catch (error: any) {
    console.error('Error al guardar la cita:', error);
    alert(error.message || 'Hubo un error al registrar la cita.');
  } finally {
    this.isSaving = false; // ⏹️ Desactivar loader
    this.cdr.detectChanges();
  }
}
     private formatMinutesToTime(totalMins: number): string {
    const normalizedMins = (totalMins + 1440) % 1440; // Evitar negativos
    const h = Math.floor(normalizedMins / 60) % 24;
    const m = normalizedMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  selectAppointment(appointment: any) {
  this.selectedAppointment.set(appointment);
  this.isAppointmentDetailModalOpen.set(true);
  this.appointmentSearchQuery.set(''); // Limpia el buscador al seleccionar
}

closeAppointmentDetailModal() {
  this.isAppointmentDetailModalOpen.set(false);
  this.selectedAppointment.set(null);
}

    private parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;

    // Limpiar y separar
    const cleanStr = timeStr.trim().toUpperCase();
    const isPM = cleanStr.includes('PM');
    const isAM = cleanStr.includes('AM');

    // Remover letras AM/PM
    const timeOnly = cleanStr.replace(/AM|PM/g, '').trim();
    const parts = timeOnly.split(':');

    if (parts.length < 2) return 0;

    let hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (isNaN(hours) || isNaN(minutes)) return 0;

    // Ajuste para formato 12 horas con AM/PM
    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }

    return (hours * 60) + minutes;
  }

// Helper auxiliar para asegurar conversión 12h a 24h si el selector usa formato am/pm
private convertTo24Hour(timeStr: string): string {
  const totalMins = this.parseTimeToMinutes(timeStr);
  return this.formatMinutesToTime(totalMins);
}
  /**
   * Calcula hora de fin y etiqueta legible usando el parseo robusto.
   */
  private calculateEndTimeAndLabel(startTime: string, durationMinutes: number) {
    const startTotalMins = this.parseTimeToMinutes(startTime);
    const endTotalMins = startTotalMins + durationMinutes;

    const endTime = this.formatMinutesToTime(endTotalMins);

    let durationLabel = `${durationMinutes} min`;
    if (durationMinutes === 60) durationLabel = '1 hr';
    else if (durationMinutes === 90) durationLabel = '1:30 hr';
    else if (durationMinutes === 120) durationLabel = '2 hrs';

    return { endTime, durationLabel };
  }

// 🔄 Cargar los servicios de la sucursal activa al abrir el modal de nueva cita
  openNewAppointmentModal() {
    this.patientForm = {
      name: '',
      phone: '',
      email: '',
      reason: ''
    };
    this.filteredPatients = [];
    this.showPatientDropdown = false;
    this.showServiceDropdown = false;

    // Cargar servicios de la sucursal activa desde el AuthService
    const activeSucursal = this.authService.getSucursal();
    this.availableServices = activeSucursal?.services || [];
    this.filteredServices = [...this.availableServices];

    // Establecemos fecha de hoy por defecto en el formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    this.selectedModalDate = today;
    this.selectedModalHour = '';
    this.selectedDurationMinutes = 60;

    // Generamos los horarios disponibles para esta fecha inicial
    this.generateTimeSlots();

    this.showAppointmentModal = true;
  }

  // 🔎 Filtrar servicios al escribir en el campo de motivo
  onReasonInput(event: any) {
    const query = event.target.value.toLowerCase();
    this.patientForm.reason = event.target.value;

    if (this.availableServices.length > 0) {
      this.filteredServices = this.availableServices.filter((s: any) =>
        s.nombre.toLowerCase().includes(query)
      );
      this.showServiceDropdown = true;
    } else {
      this.showServiceDropdown = false;
    }
  }

  // ✨ Seleccionar un servicio del combo y precargar su nombre
  selectServiceReason(service: any) {
    this.patientForm.reason = service.nombre;
    this.showServiceDropdown = false;
  }
get minDate(): string {
  return new Date().toISOString().split('T')[0];
}
  ngOnInit() {
     this.fcmService.initPushNotifications();
    this.userData = this.authService.getSession();
    this.checkSavedPrinter();
    this.initSelectedBranch();

    // 1️⃣ Cargar inmediatamente las sucursales desde la caché local para visualización instantánea
    const cachedBranches = this.authService.getAllBranches();
    if (cachedBranches && cachedBranches.length > 0) {
      this.availableBranches = cachedBranches;
    }

    // 2️⃣ Sincronizar en segundo plano con el servidor
    this.fetchDoctorsOffices();

    // Cargar citas locales inmediatamente para el buscador
    const cachedApps = this.authService.getCachedAppointments();
    if (cachedApps.length > 0) {
      this.upcomingAppointments.set(cachedApps);
    }
    // Sincronizar nuevas citas si ya tenemos consultorio activo seleccionado
    const activeSucursal = this.authService.getSucursal();
    const consultorioId = activeSucursal?.idConsultorio || 'default_consultorio';
    this.cargarFollowingAppointments(consultorioId);

    this.appointmentsSub = this.authService.appointmentsUpdated$.subscribe(() => {
    const cachedApps = this.authService.getCachedAppointments();
    this.upcomingAppointments.set(cachedApps);
    this.cdr.detectChanges();
  });
  }
ngOnDestroy() {
  if (this.appointmentsSub) {
    this.appointmentsSub.unsubscribe();
  }
}
getRandomStrongColor(): string {
  const strongColors = [
    'bg-blue-600 border-blue-400',
    'bg-purple-600 border-purple-400',
    'bg-indigo-600 border-indigo-400',
    'bg-emerald-600 border-emerald-400',
    'bg-rose-600 border-rose-400',
    'bg-amber-600 border-amber-400',
    'bg-teal-600 border-teal-400',
    'bg-cyan-600 border-cyan-400',
    'bg-violet-600 border-violet-400',
    'bg-fuchsia-600 border-fuchsia-400'
  ];

  // Si la cita ya tiene un color asignado previamente, podemos conservarlo para que no cambie al hacer scroll o refrescar.
  // O podemos seleccionarlo aleatoriamente basado en su nombre o ID único.
  const randomIndex = Math.floor(Math.random() * strongColors.length);
  return strongColors[randomIndex];
}

async cargarFollowingAppointments(consultorioId: string) {
  try {
    const clientLastUpdate = this.authService.getLastSyncDateAppointments();

    // 1️⃣ Ejecutamos la petición a través del interceptor centralizado para soportar Refresh Token
    const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
      console.log('🔍 [cargarFollowingAppointments] Token JWT actual en uso:', token);

      const payload = {
        idConsultorio: consultorioId,
        client_last_update: clientLastUpdate
      };

      // 🔍 LOG: Muestra el payload plano antes de ser encriptado
      console.log('📤 [Request Payload - cargarFollowingAppointments]:', payload);

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      const fetchRes = await fetch(this.GET_FOLLOWING_APPOINTMENTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });

      console.log('📥 [cargarFollowingAppointments] Status HTTP recibido:', fetchRes.status);
      return fetchRes;
    });

    const jsonRes = await response.json();
    if (!response.ok) {
      console.error('❌ Error HTTP en la respuesta:', jsonRes);
      return;
    }

    const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // 🔍 LOG: Muestra el objeto completo que respondió el servidor tras desencriptarlo
    console.log('📥 [Decrypted Response - cargarFollowingAppointments]:', decryptedData);

    if (decryptedData.success && Array.isArray(decryptedData.appointments) && decryptedData.appointments.length > 0) {
      // Guardar en caché y combinar con las existentes
      this.authService.saveCachedAppointments(decryptedData.appointments);
      this.upcomingAppointments.set(this.authService.getCachedAppointments());
      this.cdr.detectChanges();
    }
  } catch (err) {
    console.error('❌ Error al sincronizar las siguientes citas:', err);
  }
}
// 🔍 Mostrar pacientes en caché al hacer clic o dar foco al input
  onPatientFocus() {
    const allPatients = this.authService.getCachedPatients();
    if (allPatients.length > 0) {
      this.filteredPatients = allPatients;
      this.showPatientDropdown = true;
    }
  }

  onPatientInput(event: any) {
    const query = event.target.value.toLowerCase();
    this.patientForm.name = event.target.value;

    const allPatients = this.authService.getCachedPatients();

    if (query.trim() === '') {
      this.filteredPatients = allPatients; // Muestra todos si borra el texto
      this.showPatientDropdown = true;
    } else {
      this.filteredPatients = allPatients.filter((p: any) =>
        p.nombre.toLowerCase().includes(query) || p.telefono?.includes(query)
      );
      this.showPatientDropdown = true;
    }
  }

  selectPatient(patient: any) {
    this.patientForm.name = patient.nombre;
    this.patientForm.phone = patient.telefono || '';
    this.patientForm.email = patient.correo || '';
    this.showPatientDropdown = false;
    this.filteredPatients = [];
  }


  // Inicializa la sucursal guardada o toma la primera por defecto
  initSelectedBranch() {
    const savedSucursal = this.authService.getSucursal();
    if (savedSucursal && savedSucursal.name) {
      this.selectedBranch = savedSucursal.name;
    } else if (this.userData?.brancheInUser?.[0]) {
      this.selectedBranch = this.userData.brancheInUser[0];
    }
  }

  async cargarPacientes(consultorioId: string) {
  try {
    // 1️⃣ Cargar primero desde caché local para tener respuesta inmediata en el buscador
    const cachedList = this.authService.getCachedPatients();
    if (cachedList.length > 0) {
      this.pacientes.set(cachedList);
    }

    const sessionData = this.authService.getSession();
    let jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      this.router.navigate(['/login']);
      return;
    }

    const lastSync = this.authService.getLastSyncDatePatients();

    const fetchPacientes = async (token: string) => {
      // Mandamos el idConsultorio y la fecha de última sincronización al servidor
      const payload = {
        idConsultorio: consultorioId,
        ultimaSincronizacion: lastSync
      };
      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      return await fetch(this.GET_PATIENTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });
    };

    let response = await fetchPacientes(jwtToken);

    if (response.status === 401) {
      const refreshTokenValue = sessionData?.sessionToken;
      if (!refreshTokenValue) {
        this.router.navigate(['/login']);
        return;
      }

      const refreshPayload = { refreshToken: refreshTokenValue };
      const refreshCiphertext = CryptoJS.AES.encrypt(JSON.stringify(refreshPayload), this.ENCRYPTION_KEY).toString();

      const refreshResponse = await fetch('https://refreshtoken-o7vmreizjq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular'
        },
        body: JSON.stringify({ encryptedData: refreshCiphertext })
      });

      const refreshJsonRes = await refreshResponse.json();
      const bytesRefresh = CryptoJS.AES.decrypt(refreshJsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedRefresh = JSON.parse(bytesRefresh.toString(CryptoJS.enc.Utf8));

      if (decryptedRefresh.success && decryptedRefresh.accessToken) {
        jwtToken = decryptedRefresh.accessToken;
        this.authService.updateSessionToken(jwtToken);
        response = await fetchPacientes(jwtToken);
      } else {
        this.router.navigate(['/login']);
        return;
      }
    }

    const jsonRes = await response.json();
    if (!response.ok) {
      throw new Error(jsonRes.error || 'Error al obtener los pacientes.');
    }

    const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // Si el servidor envía nuevos datos o una lista actualizada
    if (decryptedData.success && Array.isArray(decryptedData.patients) && decryptedData.patients.length > 0) {
      const listaMapeada: Paciente[] = decryptedData.patients.map((p: any) => {
        const ficha = p.fichaDeIdentificacion || {};
        const numVisitas = p.contadorDeVisitas || 1;
        return {
          id: p.idPaciente || '',
          nombre: ficha.nombreCompleto || p.nombre || 'Sin nombre',
          telefono: ficha.telefono || p.telefono || 'Sin teléfono',
          correo: ficha.correo || 'Sin correo',
          expedienteNum: p.numeroDeExpediente || 'EXP-2026-0000',
          categoriaConsulta: p.categoria || 'Medicina General',
          ultimaVisita: p.ultimaVisita ? p.ultimaVisita.split('T')[0] : '2026-09-29',
          numeroVisitas: numVisitas,
          esPrimeraVez: numVisitas === 1,
          edad: ficha.edad || 0,
          sexo: ficha.sexo || 'No especificado'
        };
      });

      this.pacientes.set(listaMapeada);
      // Guardar en memoria local y actualizar fecha de sincronización automáticamente
      this.authService.saveCachedPatients(listaMapeada);
    }
  } catch (err) {
    console.error('Error al cargar pacientes:', err);
  } finally {
  }
}

async fetchDoctorsOffices() {
  this.isLoadingBranches = true;

  try {
    // 1️⃣ Ejecutamos la petición a través del interceptor centralizado para soportar Refresh Token
    const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
      console.log('🔍 [fetchDoctorsOffices] Token JWT actual en uso:', token);

      // Obtenemos el correo desde la sesión actual para armar el idDoctor
      const sessionData = this.authService.getSession();
      const email = sessionData?.email || '';
      const idDoctor = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

      const payload = {
        idDoctor: idDoctor
      };

      // Encriptar el request con CryptoJS AES
      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      const fetchRes = await fetch(this.GET_DOCTORS_OFFICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });

      console.log('📥 [fetchDoctorsOffices] Status HTTP recibido:', fetchRes.status);
      return fetchRes;
    });

    const jsonRes = await response.json();
    if (!response.ok) {
      throw new Error(jsonRes.error || 'Error al obtener los consultorios del servidor.');
    }

    let decryptedResponse;
    try {
      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (decryptErr) {
      throw new Error('Fallo al desencriptar la respuesta de los consultorios.');
    }

    if (decryptedResponse && decryptedResponse.success) {
      this.availableBranches = decryptedResponse.consultorios || [];
      // Guardar el listado actualizado en segundo plano en el almacenamiento local
      this.authService.saveAllBranches(this.availableBranches);

      // 🚨 VALIDACIÓN: Si no hay consultorios registrados
      if (this.availableBranches.length === 0) {
        this.showNoConsultoriosModal.set(true);
      } else {
        // Si no hay ninguna sucursal guardada, seleccionamos la primera por defecto
        if (!this.authService.getSucursal()) {
          const defaultOffice = this.availableBranches[0];
          this.selectedBranch = defaultOffice.name;
          this.authService.saveSucursal(defaultOffice);
        }
      }
    }
  } catch (error) {
    console.error('Error al cargar consultorios:', error);
  } finally {
    this.isLoadingBranches = false;
  }
}

// Método para redirigir a la vista de creación de consultorios
irACrearConsultorio() {
  this.showNoConsultoriosModal.set(false);
  this.router.navigate(['/consultorios']); // Ajusta la ruta según tu app
}
  openBranchModal() {
    // Si ya hay un objeto guardado, lo buscamos o usamos el nombre actual
    const current = this.authService.getSucursal();
    this.tempSelectedBranch = current || (this.availableBranches.length > 0 ? this.availableBranches[0] : null);
    this.showBranchModal = true;
    this.showUserMenu = false;
  }

  closeBranchModal() {
    this.showBranchModal = false;
  }



  readonly PanelLeft = PanelLeft;
  readonly PanelLeftClose = PanelLeftClose;

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }


  // Estados para las notificaciones
  showNotificationsPopup = false;
  isLoadingNotifications = false;
  notificationsList: InfoNotification[] = [];

  // --- ESTADOS DE IMPRESORA BLUETOOTH ---
  showPrinterModal = false;
  printerStatus: 'disconnected' | 'connected' | 'unconfigured' = 'unconfigured';
  printerName: string = '';
  bluetoothDevices: any[] = [];
  connectedDevice: any | null = null;
  bluetoothServer: any | null = null;
availableServices: any[] = [];
filteredServices: any[] = [];
showServiceDropdown = false;
  isScanning = false;

  // Iconos del sistema registrados
  readonly RotateCcw = RotateCcw;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly Plus = Plus;
  readonly Search = Search;
  readonly Briefcase = Briefcase;
  readonly CreditCard = CreditCard;
  readonly DollarSign = DollarSign;
  readonly Store = Store;
  readonly Shield = Shield;
  readonly UserCog = UserCog;
  readonly Receipt = Receipt;
  readonly Calendar = Calendar;
  readonly Bell = Bell;
  readonly HelpCircle = HelpCircle;
  readonly LogOut = LogOut;
  readonly X = X;
  readonly Activity = Activity;
  readonly CheckCircle2 = CheckCircle2;
  readonly Printer = Printer;
  readonly Bluetooth = Bluetooth;
  readonly RefreshCw = RefreshCw;
  readonly MessageSquare = MessageSquare;
  readonly Bot = Bot;
  readonly Smartphone = Smartphone;
  readonly Layers = Layers;
  readonly ChevronRight = ChevronRight;
  readonly Settings = Settings;
  readonly LogOutIcon =LogOutIcon;
  readonly Stethoscope = Stethoscope;


  // Puedes adaptarlo según cómo guardes el estado de tu tema en la app
get isLightTheme(): boolean {
  return !document.documentElement.classList.contains('dark');
}

  toggleMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleNotifications() {
    this.showNotificationsPopup = !this.showNotificationsPopup;
    this.showUserMenu = false;
    if (this.showNotificationsPopup && this.notificationsList.length === 0) {
      this.fetchNotifications();
    }
  }

 fetchNotifications() {
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;
    const email = sessionData?.email || 'doctor@nexuscliniq.com';
    const idDoctor = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

    if (!jwtToken) {
      console.error('No se encontró una sesión activa. Inicie sesión nuevamente.');
      return;
    }

    const activeSucursal = this.authService.getSucursal();
    const consultorioId = activeSucursal?.idConsultorio || 'default_consultorio';

    if (!consultorioId) {
      console.warn('⚠️ No hay un consultorio seleccionado para consultar notificaciones.');
      this.notificationsList = [];
      return;
    }

    this.isLoadingNotifications = true;
    this.cdr.detectChanges(); // Forzar actualización visual al empezar a cargar

    try {
      const payload = {
        idConsultorio: consultorioId,
        idDoctor: idDoctor
      };

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();
      const bodyRequest = { encryptedData: ciphertext };

      const headers = {
        'Content-Type': 'application/json',
        'x-app-signature': this.APP_SECRET_HEADER,
        'x-client-source': 'angular',
        'Authorization': `Bearer ${jwtToken}`
      };

      const url = 'https://getnotifications-o7vmreizjq-uc.a.run.app';

      this.http.post<{ encryptedData: string }>(url, bodyRequest, { headers })
        .subscribe({
          next: (res) => {
            this.isLoadingNotifications = false;

            try {
              const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
              const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
              const response = JSON.parse(decryptedString);

              if (response.success) {
                this.notificationsList = response.notifications || [];
                console.log('📦 Notificaciones obtenidas con éxito:', this.notificationsList);
              } else {
                console.error('Error devuelto por el servidor:', response.error);
                this.notificationsList = [];
              }
            } catch (decryptErr) {
              console.error('Error al desencriptar la respuesta de notificaciones:', decryptErr);
              this.notificationsList = [];
            }
            this.cdr.detectChanges(); // 💡 Obligatorio para refrescar el HTML en Angular
          },
          error: (err) => {
            this.isLoadingNotifications = false;
            console.error('Error de red al obtener notificaciones:', err);
            this.cdr.detectChanges(); // 💡 Obligatorio para quitar el loader si falla
          }
        });

    } catch (err: any) {
      this.isLoadingNotifications = false;
      console.error('Error al preparar la petición encriptada:', err);
      this.cdr.detectChanges();
    }
  }
  hasPermission(moduleKey: string): boolean {
    if (!this.userData) return false;
    const permissions = this.userData.permissions || this.userData;
    const permissionKey = `permission-${moduleKey}`;
    return permissions[permissionKey] === true;
  }

  // --- GESTIÓN DE IMPRESORA BLUETOOTH ---
  checkSavedPrinter() {
    const savedPrinterName = localStorage.getItem('beast_printer_name');
    if (savedPrinterName) {
      this.printerName = savedPrinterName;
      this.printerStatus = 'disconnected';
    } else {
      this.printerStatus = 'unconfigured';
    }
  }

  openPrinterModal() {
    this.showPrinterModal = true;
  }

  closePrinterModal() {
    this.showPrinterModal = false;
  }

  async scanBluetoothDevices() {
    if (!navigator.bluetooth) {
      alert('Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge.');
      return;
    }

    try {
      this.isScanning = true;
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb']
      });

      this.connectToDevice(device);
    } catch (error) {
      console.error('Error al buscar dispositivos bluetooth:', error);
      this.isScanning = false;
    }
  }

  // Añade este método en tu clase MainLayoutComponent para formatear la fecha si lo deseas:
get formattedExpirationDate(): string {
  const sessionData = this.authService.getSession();
  const dateStr = sessionData?.expirationSuscription;
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}
  async connectToDevice(device: any) {
    try {
      this.isScanning = true;
      if (device.gatt) {
        this.bluetoothServer = await device.gatt.connect();
        this.connectedDevice = device;
        this.printerName = device.name || 'Impresora Térmica';
        this.printerStatus = 'connected';

        localStorage.setItem('beast_printer_name', this.printerName);
        localStorage.setItem('beast_printer_id', device.id);

        this.isScanning = false;
        this.closePrinterModal();
      }
    } catch (error) {
      console.error('Error al conectar con la impresora:', error);
      this.isScanning = false;
      alert('No se pudo establecer conexión con la impresora.');
    }
  }
  get hasActivePlan(): boolean {
    const session = this.authService.getSession();
    return session?.statusSuscription === true && !!session?.currentIdSuscription;
  }

  disconnectPrinter() {
    if (this.connectedDevice && this.connectedDevice.gatt?.connected) {
      this.connectedDevice.gatt.disconnect();
    }
    this.connectedDevice = null;
    this.bluetoothServer = null;
    this.printerStatus = 'unconfigured';
    this.printerName = '';
    localStorage.removeItem('beast_printer_name');
    localStorage.removeItem('beast_printer_id');
  }

  confirmLogout() {
    this.showUserMenu = false;
    this.showLogoutConfirm = true;
  }

  logout() {
    this.authService.logout();
    this.showLogoutConfirm = false;
    this.router.navigate(['/login']);
  }

  irACrearConsultorioDESDEModal() {
  this.showBranchModal = false; // Cierra el modal actual
  this.router.navigate(['/consultorios']); // Redirige a la vista de gestión de consultorios
}
}
