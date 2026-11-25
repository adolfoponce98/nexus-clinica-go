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

  readonly durationMs = 10000;
  private timer?: ReturnType<typeof setTimeout>;

  show(title: string, body: string, data?: any) {
    if (this.timer) clearTimeout(this.timer);
    this.activeNotification.set({ title, body, data });

    // Los avisos locales permanecen visibles diez segundos.
    this.timer = setTimeout(() => {
      this.dismiss();
    }, this.durationMs);
  }

  dismiss() {
    if (this.timer) clearTimeout(this.timer);
    this.activeNotification.set(null);
  }
}
