import { Component, OnInit, inject,signal ,ChangeDetectorRef,computed} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule,HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme.service';
import * as CryptoJS from 'crypto-js';
import { FormsModule } from '@angular/forms';
import { SPECIALTY_MAP } from './../utils/specialties.constants'; // Ajusta la ruta según corresponda
import { FloatingChatComponent } from '../home/chatbot/floating-chat.component'; // 1. Importa la ruta correcta de tu componente
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
  Smile
} from 'lucide-angular';

declare global {
  interface Navigator {
    bluetooth: any;
  }
}

export interface InfoNotification {
  id: string;
  body: string;
  title: string;
  read: boolean;
  type: number;
  timestamp: string;
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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, HttpClientModule,FormsModule,FloatingChatComponent],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit {
   private cdr = inject(ChangeDetectorRef);
   readonly icons = { X };
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
// 🔍 Estado y lista para el buscador de próximas citas
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
      if (!this.patientForm.name || !this.patientForm.phone) {
        alert('Por favor ingresa al menos el nombre y teléfono del paciente.');
        return;
      }

      const { endTime, durationLabel } = this.calculateEndTimeAndLabel(this.targetHour, Number(this.selectedDurationMinutes));

      // Validar traslapes de horario en la misma fecha
      const [newH, newM] = this.targetHour.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const newStartMins = newH * 60 + newM;
      const newEndMins = endH * 60 + endM;

      try {
        const sessionData = this.authService.getSession();
        const jwtToken = sessionData?.sessionToken;

        if (!jwtToken) {
          alert('No se encontró una sesión activa o token JWT. Inicie sesión nuevamente.');
          return;
        }
 // Asegurar formato de 24 horas para el backend (Ej. "09:00" o "14:00")
       const normalizedStartTime = this.convertTo24Hour(this.targetHour);
       const { endTime, durationLabel } = this.calculateEndTimeAndLabel(normalizedStartTime, Number(this.selectedDurationMinutes));
        const idConsultorio = 'default_consultorio';
        const newAppointmentData = {
  time: normalizedStartTime, // 🕒 Siempre en 24 hrs para el back (ej. "09:00")
      endTime: endTime,
          durationMinutes: Number(this.selectedDurationMinutes),
          durationLabel: durationLabel,
          patientName: this.patientForm.name,
          phone: this.patientForm.phone,
          email: this.patientForm.email,
          reason: this.patientForm.reason,
          date: this.targetDate,
          updatedAt: new Date().toISOString()
        };

        const payload = {
          idConsultorio: idConsultorio,
          appointmentData: newAppointmentData
        };

        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

        // 🔐 Encabezados estrictos requeridos por la Cloud Function también al guardar
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

        this.showAppointmentModal = false;
        this.showSuccessModal = true;
        this.cdr.detectChanges();

      } catch (error: any) {
        console.error('Error al guardar la cita:', error);
        alert(error.message || 'Hubo un error al registrar la cita.');
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

openNewAppointmentModal() {
  // Opcional: limpiar formulario al abrir
  this.patientForm = {
    name: '',
    phone: '',
    email: '',
    reason: ''
  };
  this.filteredPatients = [];
  this.showPatientDropdown = false;

  // Abre el modal
  this.showAppointmentModal = true;
}
  ngOnInit() {
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
  }

// 🆕 Método para consumir el servicio getFollowingAppointments de forma encriptada y segura
  async cargarFollowingAppointments(consultorioId: string) {
    try {
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) return;

      const clientLastUpdate = this.authService.getLastSyncDateAppointments();

      const payload = {
        idConsultorio: consultorioId,
        client_last_update: clientLastUpdate
      };

      // 🔍 LOG: Muestra el payload plano antes de ser encriptado
      console.log('📤 [Request Payload - cargarFollowingAppointments]:', payload);

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      const response = await fetch(this.GET_FOLLOWING_APPOINTMENTS_URL, {
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
      if (!response.ok) return;

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
  onPatientInput(event: any) {
  const query = event.target.value.toLowerCase();
  this.patientForm.name = event.target.value;

  // Obtenemos los pacientes desde el caché local mediante el AuthService o tu señal de pacientes
  const allPatients = this.authService.getCachedPatients();

  if (query.trim() === '') {
    this.filteredPatients = [];
    this.showPatientDropdown = false;
  } else {
    this.filteredPatients = allPatients.filter((p: any) =>
      p.nombre.toLowerCase().includes(query) || p.telefono?.includes(query)
    );
    this.showPatientDropdown = true;
  }
}

selectPatient(patient: any) {
  this.patientForm.name = patient.nombre;
  this.patientForm.phone = patient.telefono;
  this.patientForm.email = patient.correo;
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
      const refreshTokenValue = sessionData?.refreshToken;
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
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken || sessionData?.token;

    if (!jwtToken) {
      console.warn('No se encontró una sesión activa o token JWT para cargar los consultorios.');
      this.isLoadingBranches = false;
      return;
    }

    const email = sessionData?.email || '';
    const idDoctor = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

    const payload = {
      idDoctor: idDoctor
    };

    // Encriptar el request con CryptoJS AES
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

    const response = await fetch(this.GET_DOCTORS_OFFICE_URL, {
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

  confirmBranchChange() {
    if (this.tempSelectedBranch) {
      this.selectedBranch = this.tempSelectedBranch.name;
      // Guardar completo en el almacenamiento local mediante el AuthService
      this.authService.saveSucursal(this.tempSelectedBranch);

      // Toast o mensaje requerido al confirmar cambio de sucursal
      console.log('Datos de sucursal obtenidos exitosamente');
    }
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
    this.isLoadingNotifications = true;
    const bodyRequest = {
      email: this.userData?.email || '',
      downloadAll: true,
      paginationDate: ''
    };

    this.http.post<NotificationsResponse>('https://getnotifications-rdotx3vmaq-uc.a.run.app', bodyRequest)
      .subscribe({
        next: (response) => {
          this.isLoadingNotifications = false;
          if (!response.error) {
            this.notificationsList = response.notifications || [];
          }
        },
        error: (err) => {
          this.isLoadingNotifications = false;
          console.error('Error al obtener notificaciones:', err);
        }
      });
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
