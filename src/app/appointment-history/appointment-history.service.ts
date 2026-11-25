import { versionedFetch } from '../auth/sync-cache';
import { Injectable, inject } from '@angular/core';
import CryptoJS from 'crypto-js';
import { AuthService } from '../auth/auth.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { API_URLS } from '../config/api-urls';
import { SECURITY_CONFIG } from '../config/security.config';
import {
  DateRange,
  HistoryAppointment,
  monthRanges,
  normalizeAppointment,
} from './appointment-history.utils';

@Injectable({ providedIn: 'root' })
export class AppointmentHistoryService {
  private readonly auth = inject(AuthService);
  private readonly tokens = inject(TokenInterceptorService);

  cached(range: DateRange): HistoryAppointment[] {
    return this.auth
      .getCachedAppointments()
      .map((item) => normalizeAppointment(item))
      .filter(
        (item): item is HistoryAppointment =>
          !!item && item.date >= range.startDate && item.date <= range.endDate,
      );
  }

  async load(range: DateRange, signal?: AbortSignal): Promise<HistoryAppointment[]> {
    const branch = this.auth.getSucursal();
    const idConsultorio = branch?.idConsultorio || branch?.id;
    if (!idConsultorio) throw new Error('Selecciona un consultorio para consultar sus citas.');
    const records = new Map<string, HistoryAppointment>();
    for (const period of monthRanges(range)) {
      if (signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
      // year/month retains compatibility with the deployed monthly API.
      // The updated function additionally restricts reads to startDate/endDate.
      const payload = { idConsultorio, ...period };
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(payload),
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString();
      const response = await this.tokens.executeWithAuth((token) =>
        versionedFetch(API_URLS.GETAPPOINTMENTS, {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': SECURITY_CONFIG.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ encryptedData }),
        }),
      );
      if (!response.ok) throw new Error('No se pudieron consultar las citas del servidor.');
      const envelope = await response.json();
      const decoded = JSON.parse(
        CryptoJS.AES.decrypt(envelope.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
          CryptoJS.enc.Utf8,
        ),
      );
      if (!decoded.success || !Array.isArray(decoded.data))
        throw new Error(decoded.error || 'Respuesta de citas inválida.');
      for (const day of decoded.data) {
        if (!day || !day.schedules || typeof day.schedules !== 'object') continue;
        for (const [slot, value] of Object.entries(day.schedules)) {
          const item = normalizeAppointment(value, day.date, slot);
          if (item && item.date >= range.startDate && item.date <= range.endDate)
            records.set(item.id, item);
        }
      }
    }
    // Do not mix historical reads into the incremental synchronization cache.
    return [...records.values()];
  }
}
