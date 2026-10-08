import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Plus, X, CheckCircle2 } from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';

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
  readonly icons = { ChevronLeft, ChevronRight, CalendarIcon, Clock, User, Plus, X, CheckCircle2 };

  private readonly SAVE_APPOINTMENT_URL = 'https://saveappointment-o7vmreizjq-uc.a.run.app';
  private readonly GET_FOLLOWING_APPOINTMENTS_URL = 'https://syncfollowingappointments-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  currentView = signal<'month' | 'week' | 'day'>('month');
  selectedDate = new Date();

  // Modales y Estados de Carga
  showAppointmentModal = false;
  showSuccessModal = false;
  isSaving = false; // 🔄 Loader al guardar
  targetDate = '';
  targetHour = '09:00';
  selectedDurationMinutes: number = 60;

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

    // Actualizar la línea cada minuto
    this.timeInterval = setInterval(() => {
      this.updateCurrentTimeIndicator();
    }, 60000);
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
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

  async saveAppointment() {
    if (!this.patientForm.name || !this.patientForm.phone) {
      alert('Por favor ingresa al menos el nombre y teléfono del paciente.');
      return;
    }

    try {
      this.isSaving = true; // Activar loader
      this.cdr.detectChanges();

      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        alert('No se encontró una sesión activa o token JWT. Inicie sesión nuevamente.');
        this.isSaving = false;
        return;
      }

      const normalizedStartTime = this.convertTo24Hour(this.targetHour);
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

      // 💾 Guardado local inmediato sin requerir recarga de servidor
      this.authService.saveCachedAppointments([newAppointmentData]);
      this.appointmentsList.set(this.authService.getCachedAppointments());

      this.showAppointmentModal = false;
      this.showSuccessModal = true;
    } catch (error: any) {
      console.error('Error al guardar la cita:', error);
      alert(error.message || 'Hubo un error al registrar la cita.');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  private convertTo24Hour(timeStr: string): string {
    const totalMins = this.parseTimeToMinutes(timeStr);
    return this.formatMinutesToTime(totalMins);
  }

  openAppointmentModal(dateStr: string, hour?: string) {
    this.targetDate = dateStr;
    this.targetHour = hour || (this.availableHoursCatalog.length > 0 ? this.availableHoursCatalog[0] : '09:00');
    this.selectedDurationMinutes = 60;
    this.patientForm = { name: '', phone: '', email: '', reason: '' };
    this.showAppointmentModal = true;
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
      const mappedApps = existingApps.map(app => {
        const pos = this.calculateAppointmentPosition(app.time, app.endTime);
        return { ...app, topPx: pos.topPx, heightPx: pos.heightPx };
      });

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
    const mappedApps = existingApps.map(app => {
      const pos = this.calculateAppointmentPosition(app.time, app.endTime);
      return { ...app, topPx: pos.topPx, heightPx: pos.heightPx };
    });

    return { dateStr, appointments: mappedApps };
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
}
