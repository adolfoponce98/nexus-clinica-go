import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  UserRoundPen,
  Star,
  Plus,
  CheckCircle2
} from 'lucide-angular';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './maestras.component.html'
})
export class StaffComponent {
  readonly UserRoundPen = UserRoundPen;
  readonly Star = Star;
  readonly Plus = Plus;
  readonly CheckCircle2 = CheckCircle2;

  // Estado del instructor seleccionado (null si ninguno)
  selectedStaffId = signal<number | null>(null);

  instructors = signal([
    {
      id: 1, name: 'Valentina Rossi', email: 'v.rossi@spinpro.studio',
      rate: 45.00, rating: 4.9, reviews: 128, role: 'LEAD INSTRUCTOR',
      color: 'bg-rose-500', photo: 'https://i.pravatar.cc/150?u=valentina'
    },
    {
      id: 2, name: 'Marcus Thorne', email: 'm.thorne@spinpro.studio',
      rate: 38.00, rating: 4.7, reviews: 92, role: 'GUEST COACH',
      color: 'bg-cyan-400', photo: 'https://i.pravatar.cc/150?u=marcus'
    },
    {
      id: 3, name: 'Elena Sofia', email: 'e.sofia@spinpro.studio',
      rate: 42.00, rating: 5.0, reviews: 45, role: 'INSTRUCTOR',
      color: 'bg-emerald-400', photo: 'https://i.pravatar.cc/150?u=elena'
    }
  ]);

  // Obtener los datos del instructor seleccionado
  selectedStaff = computed(() =>
    this.instructors().find(i => i.id === this.selectedStaffId())
  );

  selectStaff(id: number) {
    this.selectedStaffId.set(id);
  }
}
