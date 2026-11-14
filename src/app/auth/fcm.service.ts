import { Injectable, inject } from '@angular/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { AuthService } from '../auth/auth.service';
import { getApp } from 'firebase/app';
import { TokenInterceptorService } from './token-interceptor.service';
import { NotificationUiService } from './notification-ui.service'; // Ajusta la ruta
@Injectable({
  providedIn: 'root'
})
export class FcmService {
  private tokenInterceptor = inject(TokenInterceptorService);
  // Usar las funciones de Angular Fire directamente como inicializadores
 private firestore = getFirestore(getApp(), 'nexus-cliniq-dev');
  private messaging = getMessaging();
  private authService = inject(AuthService);
private notificationUi = inject(NotificationUiService);
  // Reemplaza con tu VAPID Key obtenida en la consola de Firebase
  private readonly VAPID_KEY = 'BOAWodenFSAHbDkNWvq9sXK118FQMqf_fM1iUKqjnpSwD9OOddSpjS6nG32hbjb64PrWmCdrcCy_RVjR9rOO6Kc';

  public initPushNotifications() {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('🔔 Permiso de notificaciones concedido.');
        this.getTokenAndSave();
      } else {
        console.warn('⚠️ Permiso de notificaciones denegado.');
      }
    });

    // Escuchar mensajes cuando la app está abierta en primer plano
    onMessage(this.messaging, (payload) => {
      console.log('📥 Mensaje recibido en primer plano:', payload);
      const audio = new Audio('assets/sounds/notification.mp3');
       audio.play().catch(err => console.warn('⚠️ No se pudo reproducir el audio automáticamente:', err));
      if (payload.notification) {
        const title = payload.notification.title || 'Nexus Cliniq';
        const body = payload.notification.body || 'Tienes una nueva actualización.';
        new Notification(payload.notification.title || 'Nexus Cliniq', {
          body: payload.notification.body,
          icon: '/assets/logo_nexus.png'
        });
        this.notificationUi.show(title, body, payload.data);
      }
    });
  }

  private async getTokenAndSave() {
    try {
      const currentToken = await getToken(this.messaging, { vapidKey: this.VAPID_KEY });
   if (currentToken) {
        // Llamada limpia a través de tu interceptor encriptado
        await this.tokenInterceptor.updateFirebaseToken(currentToken);
      } else {
        console.warn('⚠️ No se pudo obtener el token de registro FCM.');
      }
    } catch (err) {
      console.error('❌ Error al obtener el token FCM:', err);
    }
  }
}
