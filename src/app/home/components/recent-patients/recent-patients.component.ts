import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronRight } from 'lucide-angular';
import {
  isAttended,
  normalizeAppointment,
  parseLocalDate,
  sortAppointments,
} from '../../../appointment-history/appointment-history.utils';

@Component({
  selector: 'app-recent-patients',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './recent-patients.component.html',
})
export class RecentPatientsComponent {
  readonly ChevronRight = ChevronRight;
  patients = input.required<Array<any>>();
  viewAllClicked = output<void>();
  onViewAll(): void {
    this.viewAllClicked.emit();
  }
  processedPatients = computed(() => {
    const attended = this.patients().flatMap((item) => {
      const appointment = normalizeAppointment(item);
      return appointment && isAttended(appointment) ? [appointment] : [];
    });
    return sortAppointments(attended, true)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        name: item.patientName,
        statusText: 'Asistió',
        statusClass: 'Asistió',
        lastConsultFormatted: `${parseLocalDate(item.date)!.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}, ${item.time}`,
      }));
  });
}
