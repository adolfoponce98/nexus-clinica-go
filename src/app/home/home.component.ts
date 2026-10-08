import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import CryptoJS from 'crypto-js';
import {
  LucideAngularModule, Calendar, Clock, AlertCircle, CheckCircle2,Building2,
  Users, Bell, ArrowRight, UserCheck, CreditCard, FileText, Plus, Search, FilePlus, Stethoscope, Activity, TrendingUp, ChevronRight
} from 'lucide-angular';

import { SpecialtyChartComponent } from '../home/components/speciality/speciality-chart.component';
import { PatientEvolutionComponent } from '../home/components/patient-evolution/patient-evolution.component';
import { RecentPatientsComponent } from '../home/components/recent-patients/recent-patients.component';
import { QuickActionsComponent } from '../home/components/quick-actions/quick-actions.component';
import { UpcomingAppointmentsComponent } from '../home/components/upcoming-appointments/upcoming-appointments.component';
import { RemindersComponent } from '../home/components/reminders/reminders.component';
import { AuthService } from '../auth/auth.service'; // Asegúrate de ajustar la ruta de importación de tu AuthService

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
    UpcomingAppointmentsComponent,
    RemindersComponent
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);

  readonly icons = {
    Building2,
    Calendar, Clock, AlertCircle, CheckCircle2,
    Users, Bell, ArrowRight, UserCheck, CreditCard, FileText, Plus, Search, FilePlus, Stethoscope, Activity, TrendingUp, ChevronRight
  };

  currentDateText = 'Jueves, 26 de junio de 2025';
  // Claves de seguridad para encriptar el payload hacia savePatientFollowUp
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  patientEvolutionData = [
    { month: 'Ene', total: 60, spacing: '20px' },
    { month: 'Feb', total: 85, spacing: '45px' },
    { month: 'Mar', total: 110, spacing: '70px' },
    { month: 'Abr', total: 135, spacing: '95px' },
    { month: 'May', total: 180, spacing: '130px' },
    { month: 'Jun', total: 248, spacing: '160px' }
  ];

  recentPatients = [
    { name: 'María González', specialty: 'Medicina General', lastConsult: '26 jun 2025, 08:00', status: 'Activa', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { name: 'Carlos Ramírez', specialty: 'Cardiología', lastConsult: '25 jun 2025, 10:30', status: 'Activa', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
    { name: 'Laura Martínez', specialty: 'Nutrición', lastConsult: '24 jun 2025, 09:15', status: 'Activa', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    { name: 'Jorge Sánchez', specialty: 'Medicina Interna', lastConsult: '23 jun 2025, 11:00', status: 'Activa', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
    { name: 'Patricia Torres', specialty: 'Pediatría', lastConsult: '22 jun 2025, 16:20', status: 'En seguimiento', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' }
  ];

  quickActions = [
    { title: 'Nueva cita', icon: Calendar, colorClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    { title: 'Buscar paciente', icon: Search, colorClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    { title: 'Crear expediente', icon: FilePlus, colorClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
    { title: 'Recetar', icon: FileText, colorClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
    { title: 'Subir estudio', icon: Stethoscope, colorClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    { title: 'Generar reporte', icon: TrendingUp, colorClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' }
  ];

  // 🔄 Lista reactiva o arreglo que se llenará con las citas de la caché
  upcomingAppointments: Array<{ time: string; name: string; specialty: string; status: string; avatar: string }> = [];

 reportsList = [
    { title: 'Reportes de pacientes', subtitle: 'Historial, demografía y estatus', icon: Users, colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20', type: 'patients' },
    { title: 'Reportes de citas', subtitle: 'Flujo, asistencias y cancelaciones', icon: Calendar, colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', type: 'appointments' },
    { title: 'Reportes del consultorio', subtitle: 'Ocupación, sucursales y horarios', icon: Building2, colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20', type: 'office' },
    { title: 'Reportes de servicios', subtitle: 'Especialidades y procedimientos', icon: Stethoscope, colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', type: 'services' }
  ];

  patientEvolutionDataMap: Record<number, number> = {};

async loadPatientEvolutionMetrics() {
    try {
      const sessionData = this.authService.getSession();
      console.log('Session Data:', sessionData);
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        console.warn('No se encontró un token JWT válido para cargar las métricas.');
        return;
      }

      const idDoctor = sessionData.email ? sessionData.email.trim().toLowerCase().replace(/[\/\\]/g, "_") : 'default_doctor';
      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';
      const currentYear = new Date().getFullYear(); // 2026

      const payload = {
        idDoctor: idDoctor,
        idConsultorio: idConsultorio,
        year: currentYear
      };

      // 📥 LOG: Ver el request antes de ser encriptado
      console.log('📤 [Request] Payload para getOfficeMetrics (Sin encriptar):', payload);

      // Encriptar payload usando la llave de tu app
      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      const response = await fetch('https://getofficemetrics-o7vmreizjq-uc.a.run.app', {
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
        throw new Error(jsonRes.error || 'Error al obtener métricas del servidor.');
      }

      // Desencriptar respuesta
      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      // 📥 LOG: Ver la respuesta completa ya desencriptada del servidor
      console.log('📥 [Response] Datos de métricas desencriptados:', decryptedResponse);

      if (decryptedResponse && decryptedResponse.success) {
        const yearKey = String(currentYear);
        const monthsData = decryptedResponse.resumeByMonths?.[yearKey]?.evolutionPatientsByMonth || {};

        console.log('📊 Meses de evolución cargados:', monthsData);
        this.patientEvolutionDataMap = monthsData;
      }
    } catch (err) {
      console.error('❌ Error al cargar métricas de evolución:', err);
    }
  }

  specialtyData: Array<{ name: string; count: number; percentage: number; color: string }> = [];

  loadReasonsChartData() {
    const cached = this.authService.getCachedAppointments();
    if (!cached || cached.length === 0) {
      this.specialtyData = [];
      return;
    }

    // 1. Contar frecuencias por cada 'reason' diferente
    const countsMap = new Map<string, number>();
    cached.forEach((item: any) => {
      const reason = (item.reason && item.reason.trim() !== '') ? item.reason.trim() : 'Sin motivo especificado';
      countsMap.set(reason, (countsMap.get(reason) || 0) + 1);
    });

    const totalCitas = cached.length;
    const colorPalette = ['#34d399', '#60a5fa', '#a855f7', '#f43f5e', '#fbbf24', '#38bdf8', '#fb7185', '#c084fc', '#4ade80', '#818cf8'];

    // 2. Mapear al formato requerido calculando su porcentaje global
    let index = 0;
    const processed = Array.from(countsMap.entries()).map(([name, count]) => {
      const percentage = totalCitas > 0 ? Math.round((count / totalCitas) * 100) : 0;
      const color = colorPalette[index % colorPalette.length];
      index++;
      return { name, count, percentage, color };
    });

    this.specialtyData = processed;
  }

  ngOnInit(): void {
    this.loadReasonsChartData();
    this.loadAppointmentsFromCache();
    this.loadRecentPatientsFromCache();
    this.loadPatientEvolutionMetrics();
  }
  loadRecentPatientsFromCache() {
    const cached = this.authService.getCachedAppointments();
    const now = new Date();

    if (cached && cached.length > 0) {
      // Filtrar solo las citas que ya pasaron (fecha + hora de término < ahora)
      const pastAppointments = cached.filter((item: any) => {
        if (!item.date || !item.endTime) return false;
        const appointmentEndDateTime = new Date(`${item.date}T${item.endTime}:00`);
        return appointmentEndDateTime < now;
      });

      // Mapearlas al formato requerido por RecentPatientsComponent
      this.recentPatients = pastAppointments.map((item: any) => ({
        name: item.patientName || 'Sin nombre',
        specialty: item.reason || 'Consulta general', // Usando el motivo (reason)
        lastConsult: `${item.date} - ${item.time}`,
        status: item.status || 'Completada', // O 'Tomada' / 'Cancelada' según corresponda
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' // Avatar genérico
      }));
    } else {
      this.recentPatients = [];
    }
  }

  loadAppointmentsFromCache() {
    const cached = this.authService.getCachedAppointments();
    if (cached && cached.length > 0) {
      // Mapeamos los datos reales del caché a la estructura que requiere el componente de próximas citas
      this.upcomingAppointments = cached.map((item: any) => ({
        time: item.time || '00:00',
        name: item.patientName || 'Sin nombre',
        specialty: item.reason || 'Consulta General',
        status: 'Confirmada', // Por defecto o basado en alguna propiedad si la trae
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' // Avatar genérico solicitado
      }));
    }
  }

  triggerAction(actionName: string) {
    alert(`Acción seleccionada: ${actionName}`);
  }
}
