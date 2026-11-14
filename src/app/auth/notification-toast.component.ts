import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationUiService } from './notification-ui.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (notificationUi.activeNotification(); as notif) {
      <div class="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-emerald-500/50 text-white p-4 rounded-xl shadow-2xl backdrop-blur-md animate-bounce-in transition-all">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <div class="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h4 class="font-bold text-sm text-emerald-400">{{ notif.title }}</h4>
              <p class="text-xs text-slate-300 mt-1">{{ notif.body }}</p>
            </div>
          </div>
          <button (click)="notificationUi.dismiss()" class="text-slate-400 hover:text-white text-lg font-bold px-2">
            &times;
          </button>
        </div>

        @if (notif.data?.idAppointment) {
          <div class="mt-3 pt-2 border-t border-slate-800 flex justify-end">
            <span class="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-1 rounded">
              Cita ID: {{ notif.data.idAppointment }}
            </span>
          </div>
        }
      </div>
    }
  `
})
export class NotificationToastComponent {
  notificationUi = inject(NotificationUiService);
}
