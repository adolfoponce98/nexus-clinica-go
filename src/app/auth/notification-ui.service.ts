import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  title: string;
  body: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationUiService {
  // Signal para almacenar la notificación actual que se mostrará en pantalla
  activeNotification = signal<AppNotification | null>(null);

  show(title: string, body: string, data?: any) {
    this.activeNotification.set({ title, body, data });

    // Ocultar automáticamente el popup después de 6 segundos (opcional)
    setTimeout(() => {
      this.dismiss();
    }, 20000);
  }

  dismiss() {
    this.activeNotification.set(null);
  }
}
