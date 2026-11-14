import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import CryptoJS from 'crypto-js';
import {
  LucideAngularModule, Calendar, Clock, AlertCircle, CheckCircle2, Building2,
  Users, Bell, ArrowRight, UserCheck, CreditCard, FileText, Plus, Search, FilePlus, Stethoscope, Activity, TrendingUp, ChevronRight, X
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
    CommonModule,
    LucideAngularModule,
    SpecialtyChartComponent,
    PatientEvolutionComponent,
    RecentPatientsComponent,
    QuickActionsComponent,
    AppointmentsEvolutionComponent,
    UpcomingAppointmentsComponent,
    RemindersComponent
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private tokenInterceptor = inject(TokenInterceptorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private appointmentsSub?: Subscription;
  private branchSub?: Subscription;
  private queryParamsSub?: Subscription;

  cachedAppointmentsSignal = signal<any[]>([]);

  readonly icons = {
    Building2, Calendar, Clock, AlertCircle, CheckCircle2,
    Users, Bell, ArrowRight, UserCheck, CreditCard, FileText, Plus, Search, FilePlus, Stethoscope, Activity, TrendingUp, ChevronRight, X
  };

  userData: any = null;
  currentDateText = '';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  objectKeys = Object.keys;
  todayAppointmentsCount = 0;
  todayAppointmentsSubText = '0 confirmadas • 0 por confirmar';
  totalActivePatientsCount = 0;

  // 🌟 Nuevas métricas para el mes actual
  canceledThisMonthCount = 0;
  unconfirmedThisMonthCount = 0;

  appointmentsGrouped = signal<any>({});

  showPaymentModal = signal<boolean>(false);
  paymentStatusType = signal<'success' | 'canceled'>('success');
  paymentTitle = signal<string>('');
  paymentMessage = signal<string>('');

  recentPatients: Array<any> = [];
  upcomingAppointments: Array<{ date: string; time: string; name: string; specialty: string; status: any; avatar: string }> = [];

  reportsList = [
    { title: 'Reportes de pacientes', subtitle: 'Historial, demografía y estatus', icon: Users, colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20', type: 'patients' },
    { title: 'Reportes de citas', subtitle: 'Flujo, asistencias y cancelaciones', icon: Calendar, colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', type: 'appointments' },
    { title: 'Reportes del consultorio', subtitle: 'Ocupación, sucursales y horarios', icon: Building2, colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20', type: 'office' },
    { title: 'Reportes de servicios', subtitle: 'Especialidades y procedimientos', icon: Stethoscope, colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', type: 'services' }
  ];

  patientEvolutionDataMap = signal<Record<number, number>>({});
  specialtyData: Array<{ name: string; count: number; percentage: number; color: string }> = [];

  ngOnInit(): void {
    this.userData = this.authService.getSession();
    this.cargarDatosHome();
    this.currentDateText = this.obtenerFechaActualFormateada();

    this.queryParamsSub = this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true') {
        this.paymentStatusType.set('success');
        this.paymentTitle.set('¡Pago y Suscripción Exitosa!');
        this.paymentMessage.set('Tu pago se ha procesado correctamente y tu suscripción ha sido activada en el sistema.');
        this.showPaymentModal.set(true);
        this.limpiarQueryStringURL();
      } else if (params['canceled'] === 'true') {
        this.paymentStatusType.set('canceled');
        this.paymentTitle.set('Proceso Cancelado');
        this.paymentMessage.set('El proceso de pago fue cancelado. No se ha realizado ninguna transacción ni cargo a tu cuenta.');
        this.showPaymentModal.set(true);
        this.limpiarQueryStringURL();
      }
    });

    this.appointmentsSub = this.authService.appointmentsUpdated$.subscribe(() => {
      this.loadAppointmentsFromCache();
      this.loadReasonsChartData();
    });

    this.branchSub = this.authService.branchChanged$.subscribe(() => {
      this.cargarDatosHome();
    });
  }

  private limpiarQueryStringURL() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { success: null, canceled: null },
      queryParamsHandling: 'merge'
    });
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
  }

  private obtenerFechaActualFormateada(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const fechaFormateada = new Date().toLocaleDateString('es-ES', options);
    return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  }

  ngOnDestroy(): void {
    if (this.appointmentsSub) this.appointmentsSub.unsubscribe();
    if (this.branchSub) this.branchSub.unsubscribe();
    if (this.queryParamsSub) this.queryParamsSub.unsubscribe();
  }

  cargarDatosHome() {
    this.loadReasonsChartData();
    this.loadAppointmentsFromCache();
    this.loadRecentPatientsFromCache();
    this.loadPatientEvolutionMetrics();
    this.loadActivePatientsCount();
  }

  async loadPatientEvolutionMetrics() {
    try {
      const sessionData = this.authService.getSession();
      const idDoctor = sessionData?.email ? sessionData.email.trim().toLowerCase().replace(/[\/\\]/g, "_") : 'default_doctor';
      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';
      const currentYear = new Date().getFullYear();

      const payload = { idDoctor, idConsultorio, year: currentYear };

      const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

        return await fetch('https://getofficemetrics-o7vmreizjq-uc.a.run.app', {
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
        throw new Error(jsonRes.error || 'Error al obtener métricas del servidor.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedResponse && decryptedResponse.success) {
        const yearKey = String(currentYear);
        const monthsData = decryptedResponse.resumeByMonths?.[yearKey]?.evolutionPatientsByMonth || {};
        this.patientEvolutionDataMap.set(monthsData);
      }
    } catch (err) {
      console.error('❌ Error al cargar métricas de evolución:', err);
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
      const reason = (item.reason && item.reason.trim() !== '') ? item.reason.trim() : 'Sin motivo especificado';
      countsMap.set(reason, (countsMap.get(reason) || 0) + 1);
    });

    const totalCitas = cached.length;
    const colorPalette = ['#34d399', '#60a5fa', '#a855f7', '#f43f5e', '#fbbf24', '#38bdf8', '#fb7185', '#c084fc', '#4ade80', '#818cf8'];

    let index = 0;
    const processed = Array.from(countsMap.entries()).map(([name, count]) => {
      const percentage = totalCitas > 0 ? Math.round((count / totalCitas) * 100) : 0;
      const color = colorPalette[index % colorPalette.length];
      index++;
      return { name, count, percentage, color };
    });

    this.specialtyData = processed;
  }

  loadRecentPatientsFromCache() {
    const cached = this.authService.getCachedAppointments();
    if (cached && cached.length > 0) {
      this.recentPatients = cached.map((item: any) => ({
        name: item.patientName || 'Sin nombre',
        specialty: item.reason || 'Consulta general',
        date: item.date || '',
        time: item.time || '00:00',
        endTime: item.endTime || item.time || '00:00',
        lastConsult: `${item.date || ''} - ${item.time || ''}`,
        status: item.status || 'Completada',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      }));
    } else {
      this.recentPatients = [];
    }
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
      const thisMonthAppointments = cached.filter((item: any) => item.date && item.date.startsWith(currentMonthPrefix));

      // ❌ Contar canceladas en el mes (status === 2)
      this.canceledThisMonthCount = thisMonthAppointments.filter((item: any) => Number(item.status) === 2).length;

      // ⏳ Contar sin confirmar en el mes (status === 0 o undefined/null)
      this.unconfirmedThisMonthCount = thisMonthAppointments.filter((item: any) => Number(item.status) === 0 || item.status === undefined || item.status === null).length;

      const todayUpcoming = cached.filter((item: any) => {
        const isToday = item.date === currentDateStr || item.date?.includes(`${now.getDate()}`);
        const isFutureTime = (item.time || '00:00') >= currentTimeStr;
        return isToday && isFutureTime;
      });

      this.todayAppointmentsCount = todayUpcoming.length;
      const confirmedCount = todayUpcoming.filter((i: any) => Number(i.status) === 1).length;
      const pendingCount = todayUpcoming.filter((i: any) => Number(i.status) === 0 || !i.status).length;
      this.todayAppointmentsSubText = `${confirmedCount} confirmadas • ${pendingCount} por confirmar`;

      this.upcomingAppointments = todayUpcoming.map((item: any) => ({
        date: item.date || '',
        time: item.time || '00:00',
        name: item.patientName || 'Sin nombre',
        specialty: item.reason || 'Consulta General',
        status: item.status,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
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
    this.totalActivePatientsCount = patients ? patients.length : 0;
  }

  triggerAction(actionName: string) {
    alert(`Acción seleccionada: ${actionName}`);
  }
}
