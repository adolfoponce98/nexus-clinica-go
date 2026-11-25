import { OfficeSyncService } from '../auth/office-sync.service';
import { SectionSkeletonComponent } from '../shared/section-skeleton.component';
import { SubscriptionLockComponent } from '../planes/subscription-lock.component';
import { BillingService } from '../planes/billing.service';
import { CurrentAppointmentComponent } from './current-appointment.component';
import { PermissionService } from '../auth/permission.service';
import { versionedFetch } from '../auth/sync-cache';
import {
  isAttended,
  normalizeAppointment,
  normalizedTime,
  sortAppointments,
} from '../appointment-history/appointment-history.utils';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import CryptoJS from 'crypto-js';
import {
  LucideAngularModule,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Building2,
  Users,
  Bell,
  ArrowRight,
  UserCheck,
  CreditCard,
  FileText,
  Plus,
  Search,
  FilePlus,
  Stethoscope,
  Activity,
  TrendingUp,
  ChevronRight,
  X,
} from 'lucide-angular';

import { SpecialtyChartComponent } from '../home/components/speciality/speciality-chart.component';
import { PatientEvolutionComponent } from '../home/components/patient-evolution/patient-evolution.component';
import { RecentPatientsComponent } from '../home/components/recent-patients/recent-patients.component';
import { QuickActionsComponent } from '../home/components/quick-actions/quick-actions.component';
import { UpcomingAppointmentsComponent } from '../home/components/upcoming-appointments/upcoming-appointments.component';
import { RemindersComponent } from '../home/components/reminders/reminders.component';
import { AuthService } from '../auth/auth.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { AppointmentsEvolutionComponent } from '../home/components/appointments-evolution/appointments-evolution.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    SectionSkeletonComponent,
    SubscriptionLockComponent,
    CurrentAppointmentComponent,
    CommonModule,
    LucideAngularModule,
    SpecialtyChartComponent,
    PatientEvolutionComponent,
    RecentPatientsComponent,
    QuickActionsComponent,
    AppointmentsEvolutionComponent,
    UpcomingAppointmentsComponent,
    RemindersComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly billing = inject(BillingService);
  readonly permissions = inject(PermissionService);
  private authService = inject(AuthService);
  private readonly sync = inject(OfficeSyncService);
  readonly contextLoading = signal(true);
  readonly appointmentsLoading = signal(true);
  readonly patientsLoading = signal(true);
  readonly metricsLoading = signal(true);
  readonly loadError = signal('');
  private loadSequence = 0;
  private patientsSub?: Subscription;
  get billingPending() {
    return !this.billing.state() && !this.billing.error();
  }
  private tokenInterceptor = inject(TokenInterceptorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private appointmentsSub?: Subscription;
  private branchSub?: Subscription;
  private queryParamsSub?: Subscription;

  cachedAppointmentsSignal = signal<any[]>([]);

  readonly icons = {
    Building2,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Users,
    Bell,
    ArrowRight,
    UserCheck,
    CreditCard,
    FileText,
    Plus,
    Search,
    FilePlus,
    Stethoscope,
    Activity,
    TrendingUp,
    ChevronRight,
    X,
  };

  userData: any = null;
  currentDateText = '';
  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;

  objectKeys = Object.keys;
  todayAppointmentsCount = 0;
  todayAppointmentsSubText = '0 confirmadas • 0 por confirmar';
  private readonly activePatientsCount = signal(0);
  get totalActivePatientsCount() {
    return this.activePatientsCount();
  }

  // 🌟 Nuevas métricas para el mes actual
  canceledThisMonthCount = 0;
  unconfirmedThisMonthCount = 0;

  appointmentsGrouped = signal<any>({});

  recentPatients: Array<any> = [];
  upcomingAppointments: Array<{
    date: string;
    time: string;
    name: string;
    specialty: string;
    status: any;
    avatar: string;
  }> = [];

  reportsList = [
    {
      title: 'Reportes de pacientes',
      subtitle: 'Historial, demografía y estatus',
      icon: Users,
      colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      type: 'patients',
    },
    {
      title: 'Reportes de citas',
      subtitle: 'Flujo, asistencias y cancelaciones',
      icon: Calendar,
      colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      type: 'appointments',
    },
    {
      title: 'Reportes del consultorio',
      subtitle: 'Ocupación, sucursales y horarios',
      icon: Building2,
      colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      type: 'office',
    },
    {
      title: 'Reportes de servicios',
      subtitle: 'Especialidades y procedimientos',
      icon: Stethoscope,
      colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      type: 'services',
    },
  ];

  patientEvolutionDataMap = signal<Record<number, number>>({});
  specialtyData: Array<{ name: string; count: number; percentage: number; color: string }> = [];

  ngOnInit(): void {
    this.userData = this.authService.getSession();
    this.cargarDatosHome();
    this.currentDateText = this.obtenerFechaActualFormateada();

    // Payment return parameters never prove payment; the result page verifies Stripe.
    if (
      this.route.snapshot.queryParamMap.has('success') ||
      this.route.snapshot.queryParamMap.has('canceled')
    )
      void this.router.navigate(['/planes'], { replaceUrl: true });

    this.appointmentsSub = this.authService.appointmentsUpdated$.subscribe(() => {
      this.loadAppointmentsFromCache();
      this.loadRecentPatientsFromCache();
      this.loadReasonsChartData();
    });

    this.patientsSub = this.authService.patientsUpdated$.subscribe(() =>
      this.loadActivePatientsCount(),
    );
    this.branchSub = this.authService.branchChanged$.subscribe(() => {
      this.cargarDatosHome();
    });
  }

  private obtenerFechaActualFormateada(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const fechaFormateada = new Date().toLocaleDateString('es-ES', options);
    return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  }

  ngOnDestroy(): void {
    this.loadSequence++;
    this.patientsSub?.unsubscribe();
    if (this.appointmentsSub) this.appointmentsSub.unsubscribe();
    if (this.branchSub) this.branchSub.unsubscribe();
    if (this.queryParamsSub) this.queryParamsSub.unsubscribe();
  }

  async cargarDatosHome() {
    const sequence = ++this.loadSequence;
    this.contextLoading.set(true);
    this.appointmentsLoading.set(true);
    this.patientsLoading.set(true);
    this.metricsLoading.set(true);
    this.loadError.set('');
    this.patientEvolutionDataMap.set({});
    try {
      await this.sync.ensureOfficeContext();
      if (sequence !== this.loadSequence) return;
      this.contextLoading.set(false);
      const office = this.authService.getSucursal();
      if (!(office?.idConsultorio || office?.id)) {
        this.loadAppointmentsFromCache();
        this.loadActivePatientsCount();
        this.appointmentsLoading.set(false);
        this.patientsLoading.set(false);
        this.metricsLoading.set(false);
        return;
      }
      this.loadReasonsChartData();
      this.loadAppointmentsFromCache();
      this.loadRecentPatientsFromCache();
      this.loadActivePatientsCount();
      this.appointmentsLoading.set(
        this.permissions.can('calendar') && !this.authService.hasCachedAppointments(),
      );
      this.patientsLoading.set(
        this.permissions.can('patients') && !this.authService.hasCachedPatients(),
      );
      const appointments = async () => {
        try {
          if (this.permissions.can('calendar')) await this.sync.ensureResource('appointments');
        } catch {
          if (sequence === this.loadSequence)
            this.loadError.set('No se pudieron actualizar las citas. Puedes reintentar la carga.');
        } finally {
          if (sequence === this.loadSequence) {
            this.loadAppointmentsFromCache();
            this.loadRecentPatientsFromCache();
            this.loadReasonsChartData();
            this.appointmentsLoading.set(false);
          }
        }
      };
      const patients = async () => {
        try {
          if (this.permissions.can('patients')) await this.sync.ensureResource('patients');
        } catch {
          if (sequence === this.loadSequence)
            this.loadError.set(
              'No se pudieron actualizar los pacientes. Puedes reintentar la carga.',
            );
        } finally {
          if (sequence === this.loadSequence) {
            this.loadActivePatientsCount();
            this.patientsLoading.set(false);
          }
        }
      };
      const metrics = async () => {
        try {
          await this.billing.ensureFresh();
          if (sequence === this.loadSequence && this.billing.allows('charts'))
            await this.loadPatientEvolutionMetrics(sequence);
        } finally {
          if (sequence === this.loadSequence) this.metricsLoading.set(false);
        }
      };
      await Promise.allSettled([appointments(), patients(), metrics()]);
    } catch {
      if (sequence === this.loadSequence) {
        this.loadError.set(
          'No se pudo cargar la información de tus consultorios. Reintenta para continuar.',
        );
        this.contextLoading.set(false);
        this.appointmentsLoading.set(false);
        this.patientsLoading.set(false);
        this.metricsLoading.set(false);
      }
    }
  }

  async loadPatientEvolutionMetrics(sequence = this.loadSequence) {
    try {
      const sessionData = this.authService.getSession();
      const idDoctor = String(sessionData?.idDoctor || sessionData?.email || '')
        .trim()
        .toLowerCase()
        .replace(/[\/\\]/g, '_');
      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || activeSucursal?.id;
      if (!idDoctor || !idConsultorio) return;
      const currentYear = new Date().getFullYear();

      const payload = { idDoctor, idConsultorio, year: currentYear };

      const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
        const ciphertext = CryptoJS.AES.encrypt(
          JSON.stringify(payload),
          this.ENCRYPTION_KEY,
        ).toString();

        return await versionedFetch(API_URLS.GETOFFICEMETRICS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ encryptedData: ciphertext }),
        });
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al obtener métricas del servidor.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (
        sequence === this.loadSequence &&
        (this.authService.getSucursal()?.idConsultorio || this.authService.getSucursal()?.id) ===
          idConsultorio &&
        decryptedResponse &&
        decryptedResponse.success
      ) {
        const yearKey = String(currentYear);
        const monthsData =
          decryptedResponse.resumeByMonths?.[yearKey]?.evolutionPatientsByMonth || {};
        this.patientEvolutionDataMap.set(monthsData);
      }
    } catch (err) {
      console.error('❌ Error al cargar métricas de evolución:', err);
      if (sequence === this.loadSequence)
        this.loadError.set(
          'No se pudo actualizar la gráfica de pacientes. Puedes reintentar la carga.',
        );
    }
  }

  loadReasonsChartData() {
    const cached = this.authService.getCachedAppointments();
    if (!cached || cached.length === 0) {
      this.specialtyData = [];
      return;
    }

    const countsMap = new Map<string, number>();
    cached.forEach((item: any) => {
      const reason =
        item.reason && item.reason.trim() !== '' ? item.reason.trim() : 'Sin motivo especificado';
      countsMap.set(reason, (countsMap.get(reason) || 0) + 1);
    });

    const totalCitas = cached.length;
    const colorPalette = [
      '#34d399',
      '#60a5fa',
      '#a855f7',
      '#f43f5e',
      '#fbbf24',
      '#38bdf8',
      '#fb7185',
      '#c084fc',
      '#4ade80',
      '#818cf8',
    ];

    let index = 0;
    const processed = Array.from(countsMap.entries()).map(([name, count]) => {
      const percentage = totalCitas > 0 ? Math.round((count / totalCitas) * 100) : 0;
      const color = colorPalette[index % colorPalette.length];
      index++;
      return { name, count, percentage, color };
    });

    this.specialtyData = processed;
  }

  openReport(type: string): void {
    void this.router.navigate(this.billing.allows('reports') ? ['/reportes', type] : ['/planes']);
  }
  showAllRecentPatients(): void {
    void this.router.navigate(['/pacientes-atendidos']);
  }
  showAllAppointments(): void {
    void this.router.navigate(['/citas']);
  }

  loadRecentPatientsFromCache() {
    const attended = this.authService.getCachedAppointments().flatMap((item) => {
      const appointment = normalizeAppointment(item);
      return appointment && isAttended(appointment) ? [appointment] : [];
    });
    this.recentPatients = sortAppointments(attended, true).map((item) => ({
      ...item,
      name: item.patientName,
      specialty: item.reason,
    }));
  }

  loadAppointmentsFromCache() {
    const cached = this.authService.getCachedAppointments();

    if (cached && cached.length > 0) {
      this.cachedAppointmentsSignal.set(cached);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentDateStr = `${currentYear}-${currentMonth}-${day}`;
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // 🔍 Filtrar citas que pertenecen al mes y año actual
      const currentMonthPrefix = `${currentYear}-${currentMonth}`;
      const thisMonthAppointments = cached.filter(
        (item: any) => item.date && item.date.startsWith(currentMonthPrefix),
      );

      // ❌ Contar canceladas en el mes (status === 2)
      this.canceledThisMonthCount = thisMonthAppointments.filter(
        (item: any) => Number(item.status) === 2,
      ).length;

      // ⏳ Contar sin confirmar en el mes (status === 0 o undefined/null)
      this.unconfirmedThisMonthCount = thisMonthAppointments.filter(
        (item: any) =>
          Number(item.status) === 0 || item.status === undefined || item.status === null,
      ).length;

      const todayUpcoming = cached.filter((item: any) => {
        const isToday = item.date === currentDateStr;
        const time = normalizedTime(item.time);
        const isFutureTime = !!time && time >= currentTimeStr;
        return isToday && isFutureTime && [0, 1].includes(Number(item.status ?? 0));
      });

      this.todayAppointmentsCount = todayUpcoming.length;
      const confirmedCount = todayUpcoming.filter((i: any) => Number(i.status) === 1).length;
      const pendingCount = todayUpcoming.filter(
        (i: any) => Number(i.status) === 0 || !i.status,
      ).length;
      this.todayAppointmentsSubText = `${confirmedCount} confirmadas • ${pendingCount} por confirmar`;

      this.upcomingAppointments = todayUpcoming.map((item: any) => ({
        ...item,
        date: item.date || '',
        time: item.time || '00:00',
        name: item.patientName || 'Sin nombre',
        specialty: item.reason || 'Consulta General',
        status: item.status,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      }));
    } else {
      this.cachedAppointmentsSignal.set([]);
      this.todayAppointmentsCount = 0;
      this.todayAppointmentsSubText = '0 confirmadas • 0 por confirmar';
      this.canceledThisMonthCount = 0;
      this.unconfirmedThisMonthCount = 0;
      this.upcomingAppointments = [];
    }
  }

  loadActivePatientsCount() {
    const patients = this.authService.getCachedPatients();
    this.activePatientsCount.set(patients ? patients.length : 0);
  }

  triggerAction(actionName: string) {
    alert(`Acción seleccionada: ${actionName}`);
  }
}
