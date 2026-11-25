import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Bell,
  Calendar,
  CheckCircle2,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Store,
  MessageSquare,
} from 'lucide-angular';
import { MainLayoutComponent } from '../main/main-layout.component';
import { AuthService } from '../auth/auth.service';
import {
  filterNotifications,
  localDateKey,
  notificationRange,
  NotificationPeriod,
} from './notification-dates';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
})
export class NotificationsPageComponent implements OnInit {
  // The shell owns the shared inbox: preview and history use the same local read state and requests.
  readonly inbox = inject(MainLayoutComponent);
  private readonly auth = inject(AuthService);
  readonly icons = {
    Bell,
    Calendar,
    CheckCircle2,
    X,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Store,
    MessageSquare,
  };
  readonly periods: { key: NotificationPeriod; label: string }[] = [
    { key: 'day', label: 'Día' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
    { key: 'all', label: 'Todo el historial' },
  ];
  period: NotificationPeriod = 'day';
  anchor = localDateKey(new Date());
  get officeName(): string {
    const office = this.auth.getSucursal();
    return (
      office?.name || office?.nombreConsultorio || office?.nombre || 'Consultorio seleccionado'
    );
  }
  get items() {
    return filterNotifications(this.inbox.notificationsList, this.anchor, this.period);
  }
  get unread(): number {
    return this.items.filter((item) => !item.isRead).length;
  }
  get range(): [string, string] {
    return notificationRange(this.anchor, this.period);
  }
  ngOnInit(): void {
    this.inbox.showNotificationsPopup = false;
    this.inbox.fetchNotifications();
  }
  setDate(value: string): void {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) this.anchor = value;
  }
  move(direction: number): void {
    const [y, m, d] = this.anchor.split('-').map(Number);
    const date = new Date(y, m - 1, this.period === 'month' ? 1 : d, 12);
    if (this.period === 'month') date.setMonth(date.getMonth() + direction);
    else date.setDate(date.getDate() + direction * (this.period === 'week' ? 7 : 1));
    this.anchor = localDateKey(date);
  }
  today(): void {
    this.anchor = localDateKey(new Date());
  }
  markVisibleRead(): void {
    this.inbox.markAllNotificationsRead(this.items);
  }
}
