import { Injectable, inject } from '@angular/core';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { OfficeSyncService } from './office-sync.service';
import { AuthService } from './auth.service';
@Injectable({ providedIn: 'root' })
export class FcmService {
  private readonly sync = inject(OfficeSyncService);
  private readonly auth = inject(AuthService);
  private unsubscribe?: () => void;
  private initialized = false;
  private registering = false;
  private readonly VAPID_KEY =
    'BOAWodenFSAHbDkNWvq9sXK118FQMqf_fM1iUKqjnpSwD9OOddSpjS6nG32hbjb64PrWmCdrcCy_RVjR9rOO6Kc';
  async initPushNotifications() {
    this.sync.start();
    if (this.initialized) return;
    this.initialized = true;
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.addEventListener('message', this.background);
    this.auth.branchChanged$.subscribe(() => {
      void this.updateRegistration();
    });
    try {
      if (!(await isSupported())) return;
      const messaging = getMessaging();
      this.unsubscribe = onMessage(messaging, (payload) =>
        this.sync.receive(payload.data, payload.notification?.title, payload.notification?.body),
      );
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission === 'granted') await this.updateRegistration();
    } catch {
      /* Login and synchronization remain usable when browser push is unavailable. */
    }
  }
  private readonly background = (event: MessageEvent) => {
    if (event.data?.type === 'CLINIQ_PUSH') this.sync.receive(event.data.data);
  };
  async updateRegistration() {
    if (
      this.registering ||
      !this.auth.isLoggedIn() ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    )
      return;
    this.registering = true;
    try {
      if (!(await isSupported())) return;
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(getMessaging(), {
        vapidKey: this.VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (token) await this.sync.register(token);
    } catch {
    } finally {
      this.registering = false;
    }
  }
}
