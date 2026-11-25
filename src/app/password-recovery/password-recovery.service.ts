import { Injectable, signal } from '@angular/core';
import CryptoJS from 'crypto-js';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  readonly email = signal('');
  readonly step = signal<'email' | 'otp' | 'password'>('email');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly codeExpiresAt = signal(0);
  readonly resendAt = signal(0);
  private resetToken = '';
  private notice = '';
  private async request(url: string, payload: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'x-app-signature': SECURITY_CONFIG.APP_SECRET_HEADER,
        'x-client-source': 'angular',
      },
      body: JSON.stringify({
        encryptedData: CryptoJS.AES.encrypt(
          JSON.stringify(payload),
          SECURITY_CONFIG.ENCRYPTION_KEY,
        ).toString(),
      }),
    });
    const envelope = await response.json();
    const data = envelope.encryptedData
      ? JSON.parse(
          CryptoJS.AES.decrypt(envelope.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
            CryptoJS.enc.Utf8,
          ),
        )
      : envelope;
    if (!response.ok || !data.success)
      throw new Error(data.error || 'No se pudo completar la solicitud. Intenta de nuevo.');
    return data;
  }
  private async run(action: () => Promise<void>) {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
      return true;
    } catch (error: any) {
      this.error.set(error.message || 'No se pudo conectar con el servicio.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  requestCode(email: string) {
    return this.run(async () => {
      email = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Ingresa un correo electrónico válido.');
      const result = await this.request(API_URLS.SENDOTP, { email, purpose: 'password-reset' });
      this.email.set(email);
      this.resetToken = '';
      this.step.set('otp');
      this.codeExpiresAt.set(Date.now() + (result.expiresIn || 300) * 1000);
      this.resendAt.set(Date.now() + (result.resendAfter || 60) * 1000);
    });
  }
  verifyCode(otp: string) {
    return this.run(async () => {
      if (!/^\d{6}$/.test(otp)) throw new Error('Ingresa los seis dígitos del código.');
      const result = await this.request(API_URLS.VERIFYOTP, {
        email: this.email(),
        otp,
        purpose: 'password-reset',
      });
      if (!result.resetToken)
        throw new Error(
          'El servicio no devolvió la autorización. Actualiza verifyOtp e intenta de nuevo.',
        );
      this.resetToken = result.resetToken;
      this.step.set('password');
    });
  }
  updatePassword(password: string, confirmation: string) {
    return this.run(async () => {
      if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
      if (!this.resetToken) throw new Error('Primero verifica el código de tu correo.');
      await this.request(API_URLS.UPDATE_PASSWORD, {
        email: this.email(),
        resetToken: this.resetToken,
        newPassword: password,
        confirmPassword: confirmation,
      });
      this.notice = 'Tu contraseña fue actualizada. Inicia sesión con tus nuevas credenciales.';
      this.resetToken = '';
      this.step.set('email');
    });
  }
  reset() {
    if (this.busy()) return;
    this.resetToken = '';
    this.email.set('');
    this.step.set('email');
    this.error.set('');
  }
  takeNotice() {
    const message = this.notice;
    this.notice = '';
    return message;
  }
}
