import { browserDevice } from './browser-device';
import { versionedFetch } from './sync-cache';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root',
})
export class TokenInterceptorService {
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;
  private readonly REFRESH_TOKEN_URL = API_URLS.REFRESHTOKEN;
  private readonly UPDATE_FCM_URL = API_URLS.UPDATEFCMTOKEN;

  /**
   * Envuelve una petición `fetch` con encriptación y maneja el flujo de expiración de token (401) automáticamente.
   */
  async authenticatedFetch(url: string, options: RequestInit): Promise<Response> {
    const headers = new Headers(options.headers);
    if (!headers.has('Authorization')) return versionedFetch(url, options);
    return this.executeWithAuth((token) => {
      const updated = new Headers(headers);
      updated.set('Authorization', `Bearer ${token}`);
      return versionedFetch(url, { ...options, headers: updated });
    });
  }

  async renew(): Promise<string> {
    try {
      return await this.authService.refreshAccessToken();
    } catch (error) {
      if (error instanceof Error && error.name === 'SessionExpiredError') this.expireSession();
      throw error;
    }
  }

  expireSession(): void {
    this.authService.clearSession();
    void this.router.navigate(['/login']);
  }

  renewAfterUnauthorized(previous: string): Promise<string> {
    const current = this.authService.getSession()?.sessionToken;
    return current && current !== previous ? Promise.resolve(current) : this.renew();
  }

  async executeWithAuth(apiCall: (token: string) => Promise<Response>): Promise<Response> {
    let token = this.authService.getSession()?.sessionToken;
    if (!token) token = await this.renew();
    let response = await apiCall(token);
    if (response.status === 401) {
      const current = this.authService.getSession()?.sessionToken;
      const next = current && current !== token ? current : await this.renew();
      response = await apiCall(next);
      if (response.status === 401) {
        this.authService.clearSession();
        void this.router.navigate(['/login']);
        throw new Error('La sesión no es válida. Inicia sesión nuevamente.');
      }
    }
    return response;
  }

  /**
   * 🌟 NUEVA FUNCIÓN: Actualiza de forma exclusiva y segura el tokenFirebase en el servidor.
   * Envía el idDoctor (correo) y el tokenFirebase cifrados con AES y protegidos por el interceptor.
   */
  async updateFirebaseToken(tokenFirebase: string): Promise<any> {
    const sessionData = this.authService.getSession();
    const idDoctor = sessionData?.idDoctor || sessionData?.email; // El idDoctor es el correo electrónico

    if (!idDoctor) {
      console.warn('⚠️ [TokenInterceptor] No se encontró el correo del doctor en la sesión.');
      throw new Error('Sesión de usuario incompleta o sin correo.');
    }

    // 1️⃣ Armar el payload con el correo (idDoctor) y el token de Firebase
    const payload = {
      idDoctor: idDoctor.trim().toLowerCase(),
      device: { ...browserDevice(), tokenFirebase },
      idConsultorio: this.authService.getSucursal()?.idConsultorio,
      tokenFirebase: tokenFirebase,
    };

    // 2️⃣ Encriptar el payload con AES
    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      this.ENCRYPTION_KEY,
    ).toString();

    // 3️⃣ Ejecutar la petición asegurando autenticación con executeWithAuth
    const response = await this.executeWithAuth(async (jwtToken) => {
      return await versionedFetch(this.UPDATE_FCM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ encryptedData: ciphertext }),
      });
    });

    const jsonRes = await response.json();
    if (!response.ok) {
      throw new Error(jsonRes.error || 'Error al actualizar el token de Firebase en el servidor.');
    }

    // 4️⃣ Desencriptar la respuesta recibida del servidor
    const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (!decryptedData.success) {
      throw new Error(
        decryptedData.error || 'No se pudo completar la actualización del token FCM.',
      );
    }

    console.log('💾 [TokenInterceptor] Token Firebase actualizado exitosamente.');
    return decryptedData;
  }
}
