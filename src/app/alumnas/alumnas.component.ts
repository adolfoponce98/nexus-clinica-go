import { Component, signal } from '@angular/core';
import { LucideAngularModule, MoreHorizontal, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-angular';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './alumnas.component.html'
})
export class StudentsComponent {
  readonly MoreHorizontal = MoreHorizontal;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly TrendingUp = TrendingUp;

  // Datos simulados basados en la captura
  students = signal([
    { id: 'SP-8842', name: 'Valeria Martínez', phone: '+52 55 1234 5678', email: 'valeria.mtz@email.com', status: 'ACTIVO', avatar: 'https://i.pravatar.cc/150?u=valeria' },
    { id: 'SP-9120', name: 'Sofía García', phone: '+52 55 9876 5432', email: 'sofia.garcia@gmail.com', status: 'VENCIDO', avatar: 'https://i.pravatar.cc/150?u=sofia' },
    { id: 'SP-7756', name: 'Carlos Ruiz', phone: '+52 55 4567 1234', email: 'carlos.ruiz@outlook.com', status: 'ACTIVO', avatar: 'https://i.pravatar.cc/150?u=carlos' },
    { id: 'SP-4321', name: 'Ana Paula Lozano', phone: '+52 55 3210 9876', email: 'anap.lozano@me.com', status: 'ACTIVO', avatar: 'https://i.pravatar.cc/150?u=ana' },
  ]);

  getStatusClass(status: string) {
    const base = "px-3 py-1 rounded-full text-[8px] font-black tracking-widest ";
    return status === 'ACTIVO'
      ? base + "bg-emerald-100 text-emerald-600"
      : base + "bg-rose-100 text-rose-600";
  }
}
