import { BillingService } from '../planes/billing.service';
import { SessionIdleService } from '../auth/session-idle.service';
import { BookingDatePickerComponent } from '../scheduling/booking-date-picker.component';
import {
  officePeriods,
  officeBookingSlots,
  isOfficeBookingAllowed,
  timeMinutes,
  clockTime,
} from '../scheduling/office-hours';
import { appointmentPatientLink, patientId } from '../appointments/appointment-patient';
import { patientSummary } from '../patient/patient-summary';
import { PermissionDirective } from '../auth/permission.directive';
import { PermissionService } from '../auth/permission.service';
import { OfficeSyncService } from '../auth/office-sync.service';
import { versionedFetch } from '../auth/sync-cache';
import { CheckInRemindersComponent } from '../reporting/check-in-reminders.component';
import { AppointmentBillingComponent } from '../reporting/appointment-billing.component';
import {
  LocalNotificationsService,
  InfoNotification,
  NotificationContext,
} from '../auth/local-notifications.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { Component, OnInit, inject, signal, ChangeDetectorRef, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
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

export interface Paciente {
  id: string;
  idPaciente?: string;
  expedienteId?: string;
  numeroDeExpediente?: string;
  isExistingPatient?: boolean;
  isNewPatient?: boolean;
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
  imports: [
    BookingDatePickerComponent,
    PermissionDirective,
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    HttpClientModule,
    FormsModule,
    FloatingChatComponent,
    NotificationToastComponent,
    AppointmentBillingComponent,
    CheckInRemindersComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit {
  readonly billing = inject(BillingService);

  readonly permissions = inject(PermissionService);
  private tokenInterceptor = inject(TokenInterceptorService);
  private officeSync = inject(OfficeSyncService);
  private liveSyncSub?: Subscription;
  private patientSyncSub?: Subscription;
  private fcmService = inject(FcmService);
  private cdr = inject(ChangeDetectorRef);
  private readonly idleSession = inject(SessionIdleService);
  readonly icons = { X };
  isSwitchingBranch = signal<boolean>(false);
  isAppointmentDetailModalOpen = signal<boolean>(false);
  selectedAppointment = signal<any | null>(null);
  private readonly GET_FOLLOWING_APPOINTMENTS_URL = API_URLS.SYNCFOLLOWINGAPPOINTMENTS;
  private readonly SAVE_APPOINTMENT_URL = API_URLS.SAVEAPPOINTMENT;
  private readonly GET_PATIENTS_URL = API_URLS.GETPATIENTS;
  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;
  private readonly GET_DOCTORS_OFFICE_URL = API_URLS.GETDOCTORSOFFICE;
  private authService = inject(AuthService);
  router = inject(Router);
  private http = inject(HttpClient);
  themeService = inject(ThemeService);
  pacientes = signal<Paciente[]>([]);
  showUserMenu = false;
  showLogoutConfirm = false;
  readonly isLoggingOut = signal(false);
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
  selectedPatientId = '';
  selectedServiceId = '';
  reasonUnknown = false;
  private previousReason = '';
  private previousServiceId = '';
  toggleUnknownReason(checked: boolean): void {
    if (checked) {
      this.previousReason = this.patientForm.reason;
      this.previousServiceId = this.selectedServiceId;
      this.patientForm.reason = 'Sin definir';
      this.selectedServiceId = '';
    } else {
      this.patientForm.reason = this.previousReason;
      this.selectedServiceId = this.previousServiceId;
    }
    this.reasonUnknown = checked;
    this.showServiceDropdown = false;
  }
  patientForm = {
    name: '',
    phone: '',
    email: '',
    reason: '',
  };
  private appointmentsSub?: Subscription;
  private branchNotificationsSub?: Subscription;
  private notificationsRequest?: Subscription;
  private sidebarViewport = window.matchMedia('(max-width: 1439px)');
  private onSidebarViewportChange = (event: MediaQueryListEvent) => {
    this.isSidebarCollapsed = event.matches;
    this.cdr.markForCheck();
  };
  specialtyIcons = {
    general: Stethoscope,
    pediatria: Baby,
    cardiologia: HeartPulse,
    dermatologia: Sparkles,
    ginecologia: UserCheck,
    traumatologia: Bone,
    dentista: Smile,
    default: Layers,
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

    return this.upcomingAppointments().filter(
      (app) =>
        (app.patientName && app.patientName.toLowerCase().includes(query)) ||
        (app.phone && app.phone.toLowerCase().includes(query)) ||
        (app.reason && app.reason.toLowerCase().includes(query)) ||
        (app.date && app.date.toLowerCase().includes(query)),
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
        await this.router.navigate([this.permissions.firstRoute()]);

        // 4️⃣ Sincronizar en paralelo la información del nuevo consultorio
        await Promise.all([
          this.cargarFollowingAppointments(nuevoConsultorioId),
          this.cargarPacientes(nuevoConsultorioId),
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

  get bookingOffice() {
    return this.authService.getSucursal();
  }
  generateTimeSlots() {
    const cachedApps = this.authService.getCachedAppointments();
    // Filtrar citas que correspondan estrictamente a la fecha seleccionada en el modal
    const appsForDay = cachedApps.filter((app) => app.date === this.selectedModalDate);

    const slots = [];
    // Supongamos un horario de atención de 08:00 a 20:00 (8 AM a 8 PM)
    const durationMins = Number(this.selectedDurationMinutes) || 60;
    for (const allowedTime of officeBookingSlots(
      this.bookingOffice,
      this.selectedModalDate,
      durationMins,
    )) {
      const currentMinutes = timeMinutes(allowedTime);
      const startH = Math.floor(currentMinutes / 60);
      const startM = currentMinutes % 60;
      const timeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

      const slotEndMins = currentMinutes + durationMins;

      // Verificar si se cruza con alguna cita existente en ese día
      let isOccupied = false;
      for (const app of appsForDay) {
        if (Number(app.status) === 2) continue;
        const appStartMins = this.parseTimeToMinutes(app.time);
        const appEndMins = this.parseTimeToMinutes(
          app.endTime || this.calculateEndTimeAndLabel(app.time, 60).endTime,
        );

        // Comprobación de solapamiento de rangos [start, end)
        if (currentMinutes < appEndMins && slotEndMins > appStartMins) {
          isOccupied = true;
          break;
        }
      }

      slots.push({
        time: timeStr,
        label: timeStr, // Puedes formatearlo a 12h si prefieres (ej. 09:00 AM)
        available:
          !isOccupied && new Date(this.selectedModalDate + 'T' + timeStr).getTime() > Date.now(),
      });
    }

    this.availableTimeSlots = slots;

    // Si la hora seleccionada actualmente ya no está disponible, la limpiamos
    const currentSelected = this.availableTimeSlots.find((s) => s.time === this.selectedModalHour);
    if (!currentSelected || !currentSelected.available) {
      this.selectedModalHour = '';
    }
  }
  getSpecialtyIcon(code: string | undefined) {
    if (!code) return this.specialtyIcons.default;

    const mapping: Record<string, any> = {
      GEN: this.specialtyIcons.general,
      PED: this.specialtyIcons.pediatria,
      CAR: this.specialtyIcons.cardiologia,
      DER: this.specialtyIcons.dermatologia,
      GINE: this.specialtyIcons.ginecologia,
      TRAUM: this.specialtyIcons.traumatologia,
      DENT: this.specialtyIcons.dentista,
    };

    return mapping[code] || this.specialtyIcons.default;
  }
  async saveAppointment() {
    if (this.isSaving) return;
    if (!this.selectedModalDate || !this.selectedModalHour) {
      alert('Por favor selecciona una fecha y un horario disponible.');
      return;
    }
    this.patientForm.reason = this.reasonUnknown ? 'Sin definir' : this.patientForm.reason.trim();
    if (!this.patientForm.reason) {
      alert('Indica el motivo de la cita o selecciona “No lo sé aún”.');
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
      if (
        !isOfficeBookingAllowed(
          this.bookingOffice,
          this.selectedModalDate,
          normalizedStartTime,
          this.selectedDurationMinutes,
        )
      )
        throw new Error('El horario está fuera de atención o cruza un descanso.');
      const { endTime, durationLabel } = this.calculateEndTimeAndLabel(
        normalizedStartTime,
        Number(this.selectedDurationMinutes),
      );
      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';

      const newAppointmentData: any = {
        time: normalizedStartTime,
        endTime: endTime,
        durationMinutes: Number(this.selectedDurationMinutes),
        durationLabel: durationLabel,
        ...appointmentPatientLink(
          this.authService.getCachedPatients().find((p) => patientId(p) === this.selectedPatientId),
        ),
        serviceId: this.selectedServiceId || undefined,
        patientName: this.patientForm.name,
        phone: this.patientForm.phone,
        email: this.patientForm.email,
        reason: this.patientForm.reason.trim(),
        date: this.selectedModalDate,
        status: 0,
        colorClass: this.getRandomStrongColor(),
      };

      const payload = {
        idConsultorio: idConsultorio,
        appointmentData: newAppointmentData,
      };

      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(payload),
        this.ENCRYPTION_KEY,
      ).toString();

      const response = await this.tokenInterceptor.authenticatedFetch(this.SAVE_APPOINTMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ encryptedData: ciphertext }),
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al registrar la cita en el servidor.');
      }

      // 💾 Guardado local inmediato en caché y actualización de la señal
      const saved = JSON.parse(
        CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY).toString(
          CryptoJS.enc.Utf8,
        ),
      );
      if (!saved.success) throw new Error(saved.error || 'No se pudo guardar la cita');
      this.authService.saveCachedAppointments([saved.appointment || newAppointmentData]);
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

    return hours * 60 + minutes;
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
    this.reasonUnknown = false;
    this.previousReason = '';
    this.previousServiceId = '';
    this.selectedPatientId = '';
    this.selectedServiceId = '';
    this.patientForm = {
      name: '',
      phone: '',
      email: '',
      reason: '',
    };
    this.filteredPatients = [];
    this.showPatientDropdown = false;
    this.showServiceDropdown = false;

    // Cargar servicios de la sucursal activa desde el AuthService
    const activeSucursal = this.authService.getSucursal();
    this.availableServices = activeSucursal?.services || activeSucursal?.servicesInOffice || [];
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
    if (this.reasonUnknown) return;
    this.selectedServiceId = '';
    const query = event.target.value.toLowerCase();
    this.patientForm.reason = event.target.value;

    if (this.availableServices.length > 0) {
      this.filteredServices = this.availableServices.filter((s: any) =>
        s.nombre.toLowerCase().includes(query),
      );
      this.showServiceDropdown = true;
    } else {
      this.showServiceDropdown = false;
    }
  }

  // ✨ Seleccionar un servicio del combo y precargar su nombre
  selectServiceReason(service: any) {
    this.reasonUnknown = false;
    this.selectedServiceId = service.id || '';
    this.patientForm.reason = service.nombre;
    this.showServiceDropdown = false;
  }
  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }
  ngOnInit() {
    this.idleSession.start();
    this.isSidebarCollapsed = this.sidebarViewport.matches;
    this.sidebarViewport.addEventListener('change', this.onSidebarViewportChange);
    this.patientSyncSub = this.authService.patientsUpdated$.subscribe(() => {
      this.pacientes.set(this.authService.getCachedPatients());
      this.cdr.detectChanges();
    });
    this.liveSyncSub = this.officeSync.updates.subscribe((type) => {
      if (type === 'offices') {
        this.availableBranches = this.authService.getAllBranches();
        this.initSelectedBranch();
      }
      if (type === 'notifications') this.restoreNotifications();
      if (type === 'profile') this.userData = this.authService.getSession();
      this.cdr.detectChanges();
    });
    this.restoreNotifications();
    this.branchNotificationsSub = this.authService.branchChanged$.subscribe(() => {
      this.notificationsRequest?.unsubscribe();
      this.isLoadingNotifications = false;
      this.restoreNotifications();
      if (this.showNotificationsPopup) this.fetchNotifications();
    });
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
    // OfficeSyncService loads authorized resources after resolving the selected office.

    this.appointmentsSub = this.authService.appointmentsUpdated$.subscribe(() => {
      const cachedApps = this.authService.getCachedAppointments();
      this.upcomingAppointments.set(cachedApps);
      this.cdr.detectChanges();
    });
  }
  ngOnDestroy() {
    this.idleSession.stop();
    this.sidebarViewport.removeEventListener('change', this.onSidebarViewportChange);
    this.officeSync.stop();
    this.liveSyncSub?.unsubscribe();
    this.patientSyncSub?.unsubscribe();
    this.branchNotificationsSub?.unsubscribe();
    this.notificationsRequest?.unsubscribe();
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
      'bg-fuchsia-600 border-fuchsia-400',
    ];

    // Si la cita ya tiene un color asignado previamente, podemos conservarlo para que no cambie al hacer scroll o refrescar.
    // O podemos seleccionarlo aleatoriamente basado en su nombre o ID único.
    const randomIndex = Math.floor(Math.random() * strongColors.length);
    return strongColors[randomIndex];
  }

  async cargarFollowingAppointments(consultorioId: string) {
    if (!consultorioId || !this.permissions.can('calendar')) return;
    await this.officeSync.ensureResource('appointments');
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
    this.selectedPatientId = '';
    const query = event.target.value.toLowerCase();
    this.patientForm.name = event.target.value;

    const allPatients = this.authService.getCachedPatients();

    if (query.trim() === '') {
      this.filteredPatients = allPatients; // Muestra todos si borra el texto
      this.showPatientDropdown = true;
    } else {
      this.filteredPatients = allPatients.filter(
        (p: any) => p.nombre.toLowerCase().includes(query) || p.telefono?.includes(query),
      );
      this.showPatientDropdown = true;
    }
  }

  selectPatient(patient: any) {
    this.selectedPatientId = patient.idPaciente || patient.idPatient || patient.id || '';
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
    if (!consultorioId || !this.permissions.can('patients')) return;
    try {
      const requestSession = this.authService.getSession();
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
          ultimaSincronizacion: lastSync,
        };
        const ciphertext = CryptoJS.AES.encrypt(
          JSON.stringify(payload),
          this.ENCRYPTION_KEY,
        ).toString();

        return await versionedFetch(this.GET_PATIENTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ encryptedData: ciphertext }),
        });
      };

      const response = await this.tokenInterceptor.executeWithAuth(fetchPacientes);

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al obtener los pacientes.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      // Si el servidor envía nuevos datos o una lista actualizada
      const active = this.authService.getSucursal(),
        current = this.authService.getSession();
      if (
        (active?.idConsultorio || active?.id) !== consultorioId ||
        current?.email !== requestSession?.email ||
        current?.idDoctor !== requestSession?.idDoctor ||
        current?.sessionId !== requestSession?.sessionId
      )
        return;
      if (decryptedData.success && Array.isArray(decryptedData.patients)) {
        const listaMapeada: Paciente[] = decryptedData.patients.map(patientSummary);

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
    const requestSession = this.authService.getSession();
    try {
      await this.officeSync.refresh('offices', false);
      const current = this.authService.getSession();
      if (
        current?.email !== requestSession?.email ||
        current?.idDoctor !== requestSession?.idDoctor ||
        current?.sessionId !== requestSession?.sessionId
      )
        return;
      this.availableBranches = this.authService.getAllBranches();
      this.showNoConsultoriosModal.set(this.availableBranches.length === 0);
      if (this.availableBranches.length) this.initSelectedBranch();
    } catch (error) {
      console.error('Error al cargar consultorios:', error);
    } finally {
      this.isLoadingBranches = false;
      this.cdr.markForCheck();
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
    this.tempSelectedBranch =
      current || (this.availableBranches.length > 0 ? this.availableBranches[0] : null);
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

  readonly localNotifications = inject(LocalNotificationsService);
  notificationsError = '';

  get unreadNotificationsCount(): number {
    return this.notificationsList.filter((item) => !item.isRead).length;
  }

  private notificationContext(): NotificationContext | null {
    const user = this.authService.getSession()?.email;
    const branch = this.authService.getSucursal();
    const branchId = branch?.idConsultorio || branch?.id;
    return user && branchId ? { user, branch: branchId } : null;
  }

  private restoreNotifications(): void {
    const context = this.notificationContext();
    this.notificationsList = context ? this.localNotifications.read(context) || [] : [];
    this.notificationsError = '';
  }

  markNotificationRead(item: InfoNotification): void {
    item.isRead = true;
    this.persistNotifications();
  }

  markAllNotificationsRead(items: InfoNotification[] = this.notificationsList): void {
    const ids = new Set(items.map((item) => item.id));
    this.notificationsList = this.notificationsList.map((item) =>
      ids.has(item.id) ? { ...item, isRead: true } : item,
    );
    this.persistNotifications();
  }

  private persistNotifications(): void {
    const context = this.notificationContext();
    if (context) this.localNotifications.save(context, this.notificationsList);
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
  readonly LogOutIcon = LogOutIcon;
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
    if (this.showNotificationsPopup) this.fetchNotifications();
  }

  fetchNotifications(force = false): void {
    if (!this.permissions.can('calendar')) return;
    if (this.isLoadingNotifications) return;
    const context = this.notificationContext();
    const jwtToken = this.authService.getSession()?.sessionToken;
    if (!context || !jwtToken) {
      this.notificationsError = 'Selecciona un consultorio con una sesión activa.';
      return;
    }
    const cached = this.localNotifications.read(context);
    if (!force && cached !== null) {
      this.notificationsList = cached;
      return;
    }
    this.isLoadingNotifications = true;
    this.notificationsError = '';
    const payload = {
      idConsultorio: context.branch,
      idDoctor: (this.authService.getSession()?.idDoctor || context.user)
        .trim()
        .toLowerCase()
        .replace(/[\/\\]/g, '_'),
    };
    try {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(payload),
        this.ENCRYPTION_KEY,
      ).toString();
      this.notificationsRequest = this.http
        .post<{ encryptedData: string }>(
          API_URLS.GETNOTIFICATIONS,
          { encryptedData },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-app-signature': this.APP_SECRET_HEADER,
              'x-client-source': 'angular',
              Authorization: `Bearer ${jwtToken}`,
            },
          },
        )
        .subscribe({
          next: (res) => {
            try {
              const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
              const response = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
              if (!response.success || !Array.isArray(response.notifications)) {
                throw new Error('Respuesta de notificaciones inválida');
              }
              this.notificationsList = this.localNotifications.merge(
                this.notificationsList,
                response.notifications,
              );
              this.localNotifications.save(context, this.notificationsList);
            } catch {
              this.notificationsError =
                'No se pudieron actualizar las notificaciones. Se conserva la lista local.';
            }
            this.isLoadingNotifications = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.isLoadingNotifications = false;
            this.notificationsError =
              'No se pudo conectar. Puedes consultar las notificaciones guardadas.';
            this.cdr.detectChanges();
          },
        });
    } catch {
      this.isLoadingNotifications = false;
      this.notificationsError = 'No se pudo preparar la consulta de notificaciones.';
    }
  }
  hasPermission(moduleKey: string): boolean {
    return this.permissions.can(moduleKey === 'sucursal' ? 'followUps' : moduleKey);
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
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
        ],
      });

      this.connectToDevice(device);
    } catch (error) {
      console.error('Error al buscar dispositivos bluetooth:', error);
      this.isScanning = false;
    }
  }

  // Añade este método en tu clase MainLayoutComponent para formatear la fecha si lo deseas:
  get formattedExpirationDate(): string {
    const dateStr = this.billing.state()?.expiresAt;
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  }
  get formattedPaidThrough(): string {
    const value = this.billing.state()?.paidThrough;
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
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
    return this.billing.active();
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

  async logout() {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    try {
      try {
        await this.authService.logout();
      } catch (error) {
        alert((error as Error).message);
      }
      this.showLogoutConfirm = false;
      await this.router.navigate(['/login']);
    } finally {
      this.isLoggingOut.set(false);
    }
  }

  irACrearConsultorioDESDEModal() {
    this.showBranchModal = false; // Cierra el modal actual
    this.router.navigate(['/consultorios']); // Redirige a la vista de gestión de consultorios
  }
}
