import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-upcoming-appointments',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: 'upcoming-appointments.component.html'
})
export class UpcomingAppointmentsComponent {
  readonly ChevronRight = ChevronRight;
  appointments = input.required<Array<{ time: string; name: string; specialty: string; status: string; avatar: string }>>();
}
