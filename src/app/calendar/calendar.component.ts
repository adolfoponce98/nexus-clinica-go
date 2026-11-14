import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Plus, X, CheckCircle2 } from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';
import { Subscription } from 'rxjs';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
interface PatientAppointment {
  time: string; // Hora de inicio (Ej. "09:00")
  endTime: string; // Hora de fin (Ej. "10:00")
  durationMinutes: number;
  durationLabel: string;
  patientName: string;
  phone: string;
  email: string;
  reason: string;
  date: string; // YYYY-MM-DD
  syncId?: string;
  colorClass?: string;
  status?: number;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LucideAngularModule],
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
    private tokenInterceptor = inject(TokenInterceptorService);
  readonly icons = { ChevronLeft, ChevronRight, CalendarIcon, Clock, User, Plus, X, CheckCircle2 };
  private appointmentsSub?: Subscription;
  private readonly SAVE_APPOINTMENT_URL = 'https://saveappointment-o7vmreizjq-uc.a.run.app';
  private readonly GET_FOLLOWING_APPOINTMENTS_URL = 'https://syncfollowingappointments-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';
  private readonly MODIFY_APPOINTMENT_URL = 'https://modifyOrDeleteAppointment-o7vmreizjq-uc.a.run.app';

  currentView = signal<'month' | 'week' | 'day'>('month');
  selectedDate = new Date();
selectedModalHour: string = ''; // Hora seleccionada mediante chips
availableTimeSlots: { time: string; label: string; available: boolean }[] = [];
  // 🛑 Estados para el diálogo de confirmación de cancelación
  showCancelConfirmModal = false;
  isCancelling = false;
  cancelSuccessMessage = signal<string | null>(null);
  showAppointmentModal = false;
  showSuccessModal = false;
  isSaving = false;
  isAdvancedModal =false;
  targetDate = '';
  targetHour = '09:00';
  selectedDurationMinutes: number = 60;
  // 1. Agregar estas propiedades en tu clase CalendarComponent
filteredPatients: any[] = [];
showPatientDropdown = false;

availableServices: any[] = [];
filteredServices: any[] = [];
showServiceDropdown = false;
focusedIndices = new Map<string, number>();
  patientForm = {
    name: '',
    phone: '',
    email: '',
    reason: ''
  };

  appointmentsList = signal<PatientAppointment[]>([]);
  isLoading = false;

  hoursList = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'
  ];

  // 🕒 Control de la hora actual en tiempo real
  currentTimeTopPx = signal<number>(0);
  private timeInterval: any;

ngOnInit() {
    this.loadAppointments();
    this.updateCurrentTimeIndicator();

    // 🔄 Suscribirse a los cambios emitidos por el servicio
    this.appointmentsSub = this.authService.appointmentsUpdated$.subscribe(() => {
      const cachedApps = this.authService.getCachedAppointments();
      this.appointmentsList.set(cachedApps);
      this.cdr.detectChanges(); // Refrescar vista al instante
    });

    this.timeInterval = setInterval(() => {
      this.updateCurrentTimeIndicator();
    }, 60000);
  }

 ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    // 🧹 Limpiar suscripción para evitar fugas de memoria
    if (this.appointmentsSub) {
      this.appointmentsSub.unsubscribe();
    }
  }

  // 🔍 Mostrar pacientes en caché al hacer clic o dar foco al input
  onPatientFocus() {
    const allPatients = this.authService.getCachedPatients() || [];
    this.filteredPatients = allPatients;
    this.showPatientDropdown = true;
  }

  // 🔎 Filtrar pacientes al escribir en el campo de nombre
  onPatientInput(event: any) {
    const query = event.target.value.toLowerCase();
    this.patientForm.name = event.target.value;

    const allPatients = this.authService.getCachedPatients() || [];

    if (query.trim() === '') {
      this.filteredPatients = allPatients;
      this.showPatientDropdown = true;
    } else {
      this.filteredPatients = allPatients.filter((p: any) =>
        (p.nombre && p.nombre.toLowerCase().includes(query)) ||
        (p.telefono && p.telefono.includes(query))
      );
      this.showPatientDropdown = true;
    }
  }

  // ✨ Seleccionar un paciente del combo y autocompletar sus datos
  selectPatient(patient: any) {
    this.patientForm.name = patient.nombre || '';
    this.patientForm.phone = patient.telefono || '';
    this.patientForm.email = patient.correo || '';
    this.showPatientDropdown = false;
    this.filteredPatients = [];
  }

  // 🔎 Filtrar servicios al escribir en el campo de motivo
  onReasonInput(event: any) {
    const query = event.target.value.toLowerCase();
    this.patientForm.reason = event.target.value;

    if (this.availableServices.length > 0) {
      this.filteredServices = this.availableServices.filter((s: any) =>
        s.nombre && s.nombre.toLowerCase().includes(query)
      );
      this.showServiceDropdown = true;
    } else {
      this.showServiceDropdown = false;
    }
  }

  // ✨ Seleccionar un servicio del combo y precargar su nombre
  selectServiceReason(service: any) {
    this.patientForm.reason = service.nombre || '';
    this.showServiceDropdown = false;
  }

  // 🔄 Cargar servicios de la sucursal activa al abrir cualquier modal de cita
  openAppointmentModal(dateStr: string, hour?: string) {
    this.targetDate = dateStr;
    this.selectedDurationMinutes = 60;
    this.patientForm = { name: '', phone: '', email: '', reason: '' };

    // Limpiar estados de dropdowns
    this.filteredPatients = [];
    this.showPatientDropdown = false;
    this.showServiceDropdown = false;

    // Cargar servicios de la sucursal activa desde el AuthService
    const activeSucursal = this.authService.getSucursal();
    this.availableServices = activeSucursal?.services || [];
    this.filteredServices = [...this.availableServices];

    if (hour) {
      this.targetHour = this.convertTo24Hour(hour);
      this.isAdvancedModal = false;
    } else {
      this.generateTimeSlots();
      this.selectedModalHour = '';
      this.isAdvancedModal = true;
    }

    this.showAppointmentModal = true;
  }



  updateCurrentTimeIndicator() {
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const PIXELS_PER_MINUTE = 64 / 60;
    // 6:00 AM es el inicio de la grilla (360 minutos)
    const GRID_START_MINUTES = 6 * 60;
    const adjustedMinutes = Math.max(0, totalMinutes - GRID_START_MINUTES);
    this.currentTimeTopPx.set(adjustedMinutes * PIXELS_PER_MINUTE);
    this.cdr.detectChanges();
  }

  isToday(dateStr: string): boolean {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return dateStr === `${year}-${month}-${day}`;
  }

  selectedAppointment = signal<any | null>(null);
  isAppointmentDetailModalOpen = signal(false);

  openAppointmentDetail(appointment: any) {
    this.selectedAppointment.set(appointment);
    this.isAppointmentDetailModalOpen.set(true);
  }

  closeAppointmentDetailModal() {
    this.selectedAppointment.set(null);
    this.isAppointmentDetailModalOpen.set(false);
  }

  get availableHoursCatalog(): string[] {
    const sucursal = this.authService.getSucursal();
    if (sucursal && sucursal.branchInfo && sucursal.branchInfo.schedulersStudio) {
      return sucursal.branchInfo.schedulersStudio;
    }
    return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00'];
  }

  get currentMonthYearLabel(): string {
    return this.selectedDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  navigate(direction: number) {
    const d = new Date(this.selectedDate);
    if (this.currentView() === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else if (this.currentView() === 'week') {
      d.setDate(d.getDate() + (direction * 7));
    } else {
      d.setDate(d.getDate() + direction);
    }
    this.selectedDate = d;
    this.loadAppointments();
  }

  /**
   * Carga híbrida: Muestra datos locales y consulta solo los nuevos agregados en otras computadoras
   */
  async loadAppointments() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      // 1️⃣ Cargar instantáneamente del caché local
      const cachedApps = this.authService.getCachedAppointments();
      if (cachedApps.length > 0) {
        this.appointmentsList.set(cachedApps);
      }

      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;
      if (!jwtToken) {
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      const activeSucursal = this.authService.getSucursal();
      const consultorioId = activeSucursal?.idConsultorio || 'default_consultorio';
      const lastSync = this.authService.getLastSyncDateAppointments();

      // 2️⃣ Consultar al servidor solo los registros nuevos (sincronización incremental)
      const payload = {
        idConsultorio: consultorioId,
        client_last_update: lastSync
      };

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
      if (response.ok) {
        const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
        const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        if (decryptedResponse && decryptedResponse.success && Array.isArray(decryptedResponse.appointments) && decryptedResponse.appointments.length > 0) {
          // Guardar en caché y combinar localmente
          this.authService.saveCachedAppointments(decryptedResponse.appointments);
          this.appointmentsList.set(this.authService.getCachedAppointments());
        }
      }
    } catch (error) {
      console.error('Error al sincronizar citas:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
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
async saveAppointment() {
  const timeToUse = this.isAdvancedModal ? this.selectedModalHour : this.targetHour;
 if (!this.targetDate || !timeToUse) {
    alert('Por favor selecciona una fecha y un horario disponible.');
    return;
  }
  if (!this.patientForm.name || !this.patientForm.phone) {
    alert('Por favor ingresa al menos el nombre y teléfono del paciente.');
    return;
  }

  try {
    this.isSaving = true;
    this.cdr.detectChanges();

    const normalizedStartTime = this.convertTo24Hour(timeToUse);
    const { endTime, durationLabel } = this.calculateEndTimeAndLabel(normalizedStartTime, Number(this.selectedDurationMinutes));
    const activeSucursal = this.authService.getSucursal();
    const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';

    const newAppointmentData: PatientAppointment = {
      time: normalizedStartTime,
      endTime: endTime,
      durationMinutes: Number(this.selectedDurationMinutes),
      durationLabel: durationLabel,
      patientName: this.patientForm.name,
      phone: this.patientForm.phone,
      email: this.patientForm.email,
      reason: this.patientForm.reason,
      date: this.targetDate,
      colorClass: this.getRandomStrongColor(),

      syncId: new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    };

    const payload = {
      idConsultorio: idConsultorio,
      appointmentData: newAppointmentData
    };

    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

    const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
      const fetchRes = await fetch(this.SAVE_APPOINTMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });
      return fetchRes;
    });

    const jsonRes = await response.json();
    if (!response.ok) {
      throw new Error(jsonRes.error || 'Error al registrar la cita en el servidor.');
    }

    this.authService.saveCachedAppointments([newAppointmentData]);
    this.appointmentsList.set(this.authService.getCachedAppointments());

    this.showAppointmentModal = false;
    this.showSuccessModal = true;
  } catch (error: any) {
    console.error('❌ Error al guardar la cita:', error);
    alert(error.message || 'Hubo un error al registrar la cita.');
  } finally {
    this.isSaving = false;
    this.cdr.detectChanges();
  }
}


reassignAppointment() {
    const appointment = this.selectedAppointment();
    if (!appointment) return;

    // 1. Cerrar el modal de detalle actual
    this.closeAppointmentDetailModal();

    // 2. Abrir el modal de creación utilizando la misma fecha y hora de la cita cancelada
    // Usamos openAppointmentModal pasando la fecha y la hora (formato de 12 o 24 horas según maneje tu grilla)
    this.openAppointmentModal(appointment.date, appointment.time);

    // Opcional: Si quieres conservar el motivo de la consulta anterior para el nuevo paciente
    this.patientForm.reason = appointment.reason || '';
  }
// Modal para las Vistas Semanal y Diaria (con selector de hora fija)
openSlotAppointmentModal(dateStr: string, hour: string) {
  this.targetDate = dateStr;
  this.targetHour = this.convertTo24Hour(hour);
  this.selectedDurationMinutes = 60;
  this.patientForm = { name: '', phone: '', email: '', reason: '' };

  // Indicamos que use el modal clásico de hora fija
  this.isAdvancedModal = false;
  this.showAppointmentModal = true;
}

get filteredAvailableTimeSlots() {
  return this.availableTimeSlots.filter(slot => slot.available);
}
  private convertTo24Hour(timeStr: string): string {
    const totalMins = this.parseTimeToMinutes(timeStr);
    return this.formatMinutesToTime(totalMins);
  }


generateTimeSlots() {
  const cachedApps = this.authService.getCachedAppointments() || [];
  const signalApps = this.appointmentsList() || [];

  const allAppsMap = new Map();
  [...cachedApps, ...signalApps].forEach(app => {
    const key = app.syncId || `${app.date}-${app.time}-${app.patientName}`;
    allAppsMap.set(key, app);
  });

  const combinedApps = Array.from(allAppsMap.values());
  const appsForDay = combinedApps.filter(app => app.date === this.targetDate);

  const slots = [];
  let currentMinutes = 8 * 60; // 08:00 AM
  const endMinutes = 20 * 60;  // 20:00 PM
  const interval = 30;         // Intervalos de 30 minutos

  const durationMins = Number(this.selectedDurationMinutes) || 60;

  while (currentMinutes + durationMins <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60);
    const startM = currentMinutes % 60;
    const timeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

    const slotEndMins = currentMinutes + durationMins;

    let isOccupied = false;
    for (const app of appsForDay) {
      const appStartMins = this.parseTimeToMinutes(app.time);
      const appEndMins = this.parseTimeToMinutes(app.endTime || this.calculateEndTimeAndLabel(app.time, app.durationMinutes || 60).endTime);

      if (currentMinutes < appEndMins && slotEndMins > appStartMins) {
        isOccupied = true;
        break;
      }
    }

    slots.push({
      time: timeStr,
      label: timeStr,
      available: !isOccupied
    });

    currentMinutes += interval;
  }

  this.availableTimeSlots = slots;

  const currentSelected = this.availableTimeSlots.find(s => s.time === this.selectedModalHour);
  if (!currentSelected || !currentSelected.available) {
    this.selectedModalHour = '';
  }
}

  get daysInMonthGrid() {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    let days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: '', dateStr: '', appointments: [] });
    }
    for (let i = 1; i <= totalDays; i++) {
      const dayStr = i.toString().padStart(2, '0');
      const monthStr = (month + 1).toString().padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const appsForDay = this.appointmentsList().filter(a => a.date === dateStr);
      days.push({ dayNumber: i, dateStr, appointments: appsForDay });
    }
    return days;
  }





  formatDateHeader(): string {
    return this.selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatTo12Hour(time24: string): string {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }

  private parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const cleanStr = timeStr.trim().toUpperCase();
    const isPM = cleanStr.includes('PM');
    const isAM = cleanStr.includes('AM');
    const timeOnly = cleanStr.replace(/AM|PM/g, '').trim();
    const parts = timeOnly.split(':');
    if (parts.length < 2) return 0;
    let hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    if (isPM && hours < 12) hours += 12;
    else if (isAM && hours === 12) hours = 0;
    return (hours * 60) + minutes;
  }

  private formatMinutesToTime(totalMins: number): string {
    const normalizedMins = (totalMins + 1440) % 1440;
    const h = Math.floor(normalizedMins / 60) % 24;
    const m = normalizedMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

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

  calculateAppointmentPosition(startTime: string, endTime?: string) {
    const startTotalMinutes = this.parseTimeToMinutes(startTime || '09:00');
    let endTotalMinutes = startTotalMinutes + 60;
    if (endTime) {
      endTotalMinutes = this.parseTimeToMinutes(endTime);
      if (endTotalMinutes <= startTotalMinutes) {
        endTotalMinutes = startTotalMinutes + 30;
      }
    }
    const durationMinutes = Math.max(endTotalMinutes - startTotalMinutes, 30);
    const PIXELS_PER_MINUTE = 64 / 60;
    const GRID_START_MINUTES = 6 * 60;
    const adjustedTopMinutes = Math.max(0, startTotalMinutes - GRID_START_MINUTES);

    return {
      topPx: adjustedTopMinutes * PIXELS_PER_MINUTE,
      heightPx: durationMinutes * PIXELS_PER_MINUTE
    };
  }

  promptCancelAppointment() {
    this.showCancelConfirmModal = true;
    this.cancelSuccessMessage.set(null);
  }

  /**
   * ⚡ Ejecuta la cancelación de la cita consumiendo el servicio con actionType = 2
   */
  async executeCancelAppointment() {
    const cita = this.selectedAppointment();
    if (!cita) return;

    this.isCancelling = true;
    this.cancelSuccessMessage.set(null);
    this.cdr.detectChanges();

    try {
      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';
      const actionType = 2; // 2 = Cancelar
      const newStatus = 2;

      const appointmentDataPayload = {
        colorClass: cita.colorClass || '',
        date: cita.date || '',
        durationLabel: cita.durationLabel || '',
        durationMinutes: cita.durationMinutes || 0,
        email: cita.email || '',
        endTime: cita.endTime || '',
        patientName: cita.patientName || cita.name || '',
        phone: cita.phone || '',
        reason: cita.reason || cita.specialty || '',
        syncId: cita.syncId || '',
        time: cita.time || '',
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      const payload = {
        idConsultorio: idConsultorio,
        actionType: actionType,
        appointmentData: appointmentDataPayload
      };

      const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();
        return await fetch(this.MODIFY_APPOINTMENT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ encryptedData: ciphertext })
        });
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al procesar la solicitud en el servidor.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedResponse && decryptedResponse.success) {
        const cached = this.authService.getCachedAppointments();
        const updatedList = cached.map((item: any) => {
          if (this.isSameAppointment(item, cita)) {
            return {
              ...item,
              status: newStatus,
              updatedAt: appointmentDataPayload.updatedAt
            };
          }
          return item;
        });

        // 🚀 Sobrescribir la caché limpiamente y actualizar la signal local
        this.authService.saveCachedAppointments(updatedList, true);
        this.appointmentsList.set(this.authService.getCachedAppointments());

        // Actualizar el detalle actual para reflejar el cambio al instante
        this.selectedAppointment.set({ ...cita, status: newStatus });

        this.cancelSuccessMessage.set('¡Cita cancelada correctamente!');

        setTimeout(() => {
          this.showCancelConfirmModal = false;
          this.cancelSuccessMessage.set(null);
          this.closeAppointmentDetailModal();
        }, 1500);
      }
    } catch (err: any) {
      console.error('❌ Error al cancelar la cita:', err);
      alert(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      this.isCancelling = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * 🔍 Validador auxiliar para comparar si dos citas son la misma
   */
  private isSameAppointment(item1: any, item2: any): boolean {
    if (item1.syncId && item2.syncId && item1.syncId === item2.syncId) {
      return true;
    }
    return item1.date === item2.date && item1.time === item2.time && (item1.patientName === item2.patientName || item1.name === item2.name);
  }

  get weekDaysGrid() {
    const current = new Date(this.selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day;
    const sunday = new Date(current.setDate(diff));

    let week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(sunday);
      nextDay.setDate(sunday.getDate() + i);
      const year = nextDay.getFullYear();
      const month = (nextDay.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = nextDay.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;

      const existingApps = this.appointmentsList().filter(a => a.date === dateStr);

      // 💡 Algoritmo para calcular solapamientos y acomodarlas hacia la derecha
      const mappedApps = this.processOverlappingAppointments(existingApps);

      week.push({
        name: nextDay.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase(),
        dayNumber: nextDay.getDate(),
        dateStr,
        appointments: mappedApps
      });
    }
    return week;
  }

  get currentDayData() {
    const year = this.selectedDate.getFullYear();
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = this.selectedDate.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const existingApps = this.appointmentsList().filter(a => a.date === dateStr);

    // 💡 Aplicar el mismo algoritmo para la vista diaria
    const mappedApps = this.processOverlappingAppointments(existingApps);

    return { dateStr, appointments: mappedApps };
  }

/**
   * 📐 Agrupa citas concurrentes, ordena las vigentes primero y prepara el scroll horizontal
   */
  private processOverlappingAppointments(apps: any[]) {
    // Ordenar: Primero las vigentes (status !== 2) y luego por hora de inicio
    const sorted = [...apps].sort((a, b) => {
      const aIsCancelled = a.status === 2 ? 1 : 0;
      const bIsCancelled = b.status === 2 ? 1 : 0;
      if (aIsCancelled !== bIsCancelled) {
        return aIsCancelled - bIsCancelled; // Las vigentes (0) van primero que las canceladas (1)
      }
      return this.parseTimeToMinutes(a.time) - this.parseTimeToMinutes(b.time);
    });

    const processed = sorted.map(app => {
      const pos = this.calculateAppointmentPosition(app.time, app.endTime);
      return {
        ...app,
        topPx: pos.topPx,
        heightPx: pos.heightPx,
        startMins: this.parseTimeToMinutes(app.time),
        endMins: this.parseTimeToMinutes(app.endTime || this.calculateEndTimeAndLabel(app.time, app.durationMinutes || 60).endTime)
      };
    });

    // Calcular la posición horizontal para el scroll lateral
    return processed.map((app, index, array) => {
      // Filtrar cuántas citas se solapan con esta en el mismo horario
      const overlappingBefore = array.filter((other, otherIdx) => {
        if (otherIdx >= index) return false;
        return app.startMins < other.endMins && app.endMins > other.startMins;
      });

      const colIndex = overlappingBefore.length; // Índice secuencial hacia la derecha

      return {
        ...app,
        colIndex: colIndex
      };
    });
  }

  scrollDayHorizontally(event: MouseEvent, direction: number) {
    event.stopPropagation();
    const target = (event.currentTarget as HTMLElement).parentElement?.querySelector('.scrollable-day-container');
    if (target) {
      target.scrollBy({ left: direction * 190, behavior: 'smooth' });
    }
  }

  /**
   * Obtiene el índice enfocado actual para un día específico
   */
  getFocusedIndex(dateStr: string): number {
    return this.focusedIndices.get(dateStr) || 0;
  }
/**
   * 🎯 Establece el foco en un item específico al hacer clic, lo centra y maneja bucle circular si es necesario
   */
  focusAppointment(appointment: any, dayStr: string, event: MouseEvent) {
    event.stopPropagation();
    const currentIndex = this.getFocusedIndex(dayStr);

    // Si ya está en foco, abrir el detalle de la cita
    if (currentIndex === appointment.colIndex) {
      this.openAppointmentDetail(appointment);
      return;
    }

    // Si no está en foco, mover el foco hacia él y centrarlo
    this.focusedIndices.set(dayStr, appointment.colIndex);
    this.scrollToIndex(dayStr, appointment.colIndex);
  }

  /**
   * ➡️ Mueve el carrusel mediante las flechas de forma circular (si llega al final, pasa al primero)
   */
  slideCarousel(dayStr: string, direction: number, maxIndex: number, event: MouseEvent) {
    event.stopPropagation();
    let current = this.getFocusedIndex(dayStr);
    let next = current + direction;

    // 🔄 Bucle circular infinito
    if (next > maxIndex) {
      next = 0; // Si pasa del final, regresa al primero
    } else if (next < 0) {
      next = maxIndex; // Si va antes del primero, salta al último
    }

    this.focusedIndices.set(dayStr, next);
    this.scrollToIndex(dayStr, next);
  }

  /**
   * 📐 Desplaza suavemente el contenedor para centrar exactamente la tarjeta enfocada
   */
  private scrollToIndex(dayStr: string, index: number) {
    const containers = document.querySelectorAll('.scrollable-day-container');
    containers.forEach((container: any) => {
      if (container.dataset.date === dayStr) {
        const cardWidth = 165; // Ancho de la tarjeta en píxeles
        const cardLeft = 6 + (index * 175); // Posición left de la tarjeta según su índice
        const containerWidth = container.clientWidth; // Ancho visible del contenedor del día

        // Calcular la posición exacta de scroll para que la tarjeta quede al centro
        const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);

        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
      }
    });
  }

  getCarouselArrowsTop(dayAppointments: any[]): number {
    if (!dayAppointments || dayAppointments.length === 0) return 10;
    // Encontrar la posición 'top' más alta (menor en píxeles) entre las citas de ese horario
    const minTop = Math.min(...dayAppointments.map(a => a.topPx || 0));
    // Colocar las flechitas un poco arriba de la tarjeta (con un margen de 28px para que respire)
    return Math.max(10, minTop - 28);
  }
}
