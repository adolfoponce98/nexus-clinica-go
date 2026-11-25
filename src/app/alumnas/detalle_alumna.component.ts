import { Component, signal } from '@angular/core';
import { LucideAngularModule, Package, CheckCircle, XCircle } from 'lucide-angular';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './detalle_alumna.component.html',
})
export class StudentDetailComponent {
  readonly Package = Package;
  readonly CheckCircle = CheckCircle;
  readonly XCircle = XCircle;

  stats = signal([
    { label: 'Clases este mes', value: '14', highlight: true },
    { label: 'Créditos restantes', value: '6', highlight: false },
    { label: 'Asistencia Global', value: '92%', highlight: false },
  ]);

  attendance = signal([
    {
      date: '22',
      class: 'Power Ride: Intense',
      instructor: 'Marcos R.',
      time: '07:00 AM',
      attended: true,
    },
    {
      date: '20',
      class: 'Endurance Beats',
      instructor: 'Sarah M.',
      time: '06:30 PM',
      attended: true,
    },
    {
      date: '18',
      class: 'Recovery Flow',
      instructor: 'Elena G.',
      time: '08:00 AM',
      attended: false,
    },
    {
      date: '15',
      class: 'Techno Night Ride',
      instructor: 'Marcos R.',
      time: '09:00 PM',
      attended: true,
    },
  ]);

  payments = signal([
    { date: '01 May, 2024', concept: 'Mensualidad Unlimited - Promo Spring', amount: '$1,850.00' },
    { date: '12 Abr, 2024', concept: 'Compra de Calcetines Grip Spin', amount: '$350.00' },
  ]);
}
