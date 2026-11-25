import { Component, inject } from '@angular/core';
import {
  LucideAngularModule,
  BellRing,
  CalendarDays,
  UsersRound,
  Building2,
  UserRound,
  ShieldCheck,
  BadgeCheck,
  X,
} from 'lucide-angular';
import { NotificationUiService } from './notification-ui.service';
@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './notification-toast.component.html',
  styleUrl: './notification-toast.component.css',
})
export class NotificationToastComponent {
  readonly notificationUi = inject(NotificationUiService);
  readonly icons = {
    BellRing,
    CalendarDays,
    UsersRound,
    Building2,
    UserRound,
    ShieldCheck,
    BadgeCheck,
    X,
  };
  get notifications() {
    const notification = this.notificationUi.activeNotification();
    return notification ? [notification] : [];
  }
  category(type: string) {
    const categories: Record<string, string> = {
      appointments: 'Agenda',
      patients: 'Pacientes',
      offices: 'Consultorios',
      notifications: 'Notificaciones',
      followUps: 'Consulta clínica',
      profile: 'Mi perfil',
      billing: 'Mi plan',
      'session-revoked': 'Seguridad',
      'employee-login': 'Equipo de trabajo',
    };
    return categories[type] || 'Clínica Go';
  }
  icon(type: string) {
    switch (type) {
      case 'appointments':
        return CalendarDays;
      case 'patients':
        return UsersRound;
      case 'offices':
        return Building2;
      case 'profile':
        return UserRound;
      case 'billing':
        return BadgeCheck;
      case 'session-revoked':
      case 'employee-login':
        return ShieldCheck;
      default:
        return BellRing;
    }
  }
}
