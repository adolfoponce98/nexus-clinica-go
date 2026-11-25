import { versionedFetch } from '../auth/sync-cache';
import { Injectable, inject } from '@angular/core';
import CryptoJS from 'crypto-js';
import { AuthService } from '../auth/auth.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { SECURITY_CONFIG } from '../config/security.config';

@Injectable({ providedIn: 'root' })
export class ClinicApiService {
  private readonly auth = inject(AuthService);
  private readonly tokens = inject(TokenInterceptorService);
  async post(url: string, payload: unknown): Promise<any> {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECURITY_CONFIG.ENCRYPTION_KEY,
    ).toString();
    const response = await this.tokens.executeWithAuth((token) =>
      versionedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': SECURITY_CONFIG.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ encryptedData }),
      }),
    );
    if (!response.ok)
      throw new Error(
        'No se pudo completar la solicitud. Comprueba tu conexión y que los servicios estén desplegados.',
      );
    const envelope = await response.json();
    const data = JSON.parse(
      CryptoJS.AES.decrypt(envelope.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
        CryptoJS.enc.Utf8,
      ),
    );
    if (!data.success)
      throw Object.assign(new Error(data.error || 'No se pudo completar la operación'), {
        name: 'ClinicApiResponseError',
      });
    return data;
  }
  branchId(): string {
    const branch = this.auth.getSucursal();
    return branch?.idConsultorio || branch?.id || '';
  }
  mergeAppointment(appointment: any, branchId: string): void {
    if (branchId !== this.branchId()) return;
    const cached = this.auth.getCachedAppointments();
    const index = cached.findIndex((a) =>
      appointment.appointmentId && a.appointmentId
        ? a.appointmentId === appointment.appointmentId
        : a.date === appointment.date && a.time === appointment.time,
    );
    if (index >= 0) cached[index] = { ...cached[index], ...appointment };
    else cached.push(appointment);
    this.auth.saveCachedAppointments(cached, true);
  }
}
