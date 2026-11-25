import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { SECURITY_CONFIG } from '../config/security.config';
export class PublicRegistrationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
@Injectable({ providedIn: 'root' })
export class PublicRegistrationApiService {
  async post(url: string, payload: any) {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encryptedData: CryptoJS.AES.encrypt(
          JSON.stringify(payload),
          SECURITY_CONFIG.ENCRYPTION_KEY,
        ).toString(),
      }),
    });
    const envelope = await response.json();
    let data: any;
    if (envelope.encryptedData)
      data = JSON.parse(
        CryptoJS.AES.decrypt(envelope.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
          CryptoJS.enc.Utf8,
        ),
      );
    else data = envelope;
    if (!response.ok || !data.success)
      throw new PublicRegistrationError(
        data.error || 'No se pudo enviar la información. Intenta de nuevo.',
        data.code || 'SERVICE_ERROR',
      );
    return data;
  }
}
