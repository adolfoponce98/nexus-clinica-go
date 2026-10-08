import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-recent-patients',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './recent-patients.component.html'
})
export class RecentPatientsComponent {
  readonly ChevronRight = ChevronRight;
  patients = input.required<Array<{ name: string; specialty: string; lastConsult: string; status: string; avatar: string }>>();
}
