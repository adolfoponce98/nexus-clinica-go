import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  ChevronRight,
  Users,
  Calendar,
  Building2,
  Stethoscope,
} from 'lucide-angular';

@Component({
  selector: 'app-reminders', // O cámbialo a 'app-quick-reports' si renombras el componente
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './reminders.component.html',
})
export class RemindersComponent {
  readonly ChevronRight = ChevronRight;

  // Evento opcional para manejar la selección del reporte desde el componente padre (Home)
  reportSelected = output<string>();

  // Datos fijos o configurables para las 4 tarjetas de reportes
  reports = input<
    Array<{ title: string; subtitle: string; icon: any; colorClass: string; type: string }>
  >([
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
  ]);

  onReportClick(report: any) {
    this.reportSelected.emit(report.type);
  }
}
