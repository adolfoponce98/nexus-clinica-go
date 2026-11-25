import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  title: string;
  body: string;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationUiService {
  // Signal para almacenar la notificación actual que se mostrará en pantalla
  activeNotification = signal<AppNotification | null>(null);

  private timer?: ReturnType<typeof setTimeout>;

  show(title: string, body: string, data?: any) {
    if (this.timer) clearTimeout(this.timer);
    this.activeNotification.set({ title, body, data });

    // Ocultar automáticamente el popup después de 6 segundos (opcional)
    this.timer = setTimeout(() => {
      this.dismiss();
    }, 10000);
  }

  dismiss() {
    if (this.timer) clearTimeout(this.timer);
    this.activeNotification.set(null);
  }
}
