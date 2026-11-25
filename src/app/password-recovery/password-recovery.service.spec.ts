import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import CryptoJS from 'crypto-js';
import { PasswordRecoveryService } from './password-recovery.service';
import { PasswordRecoveryComponent } from './password-recovery.component';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { Router } from '@angular/router';
import { ThemeService } from '../theme.service';
function response(data: any) {
  return {
    ok: true,
    json: async () => ({
      encryptedData: CryptoJS.AES.encrypt(
        JSON.stringify(data),
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(),
    }),
  };
}
function body(mock: any, index: number) {
  return JSON.parse(
    CryptoJS.AES.decrypt(
      JSON.parse(mock.mock.calls[index][1].body).encryptedData,
      SECURITY_CONFIG.ENCRYPTION_KEY,
    ).toString(CryptoJS.enc.Utf8),
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  TestBed.resetTestingModule();
});
it('sends purpose-scoped encrypted OTP requests and resets the password with the verified in-memory grant', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response({ success: true, expiresIn: 300, resendAfter: 60 }))
    .mockResolvedValueOnce(response({ success: true, resetToken: 'server-grant' }))
    .mockResolvedValueOnce(response({ success: true }));
  vi.stubGlobal('fetch', fetch);
  const s = TestBed.inject(PasswordRecoveryService);
  expect(await s.requestCode(' DOCTOR@example.test ')).toBe(true);
  expect(body(fetch, 0)).toEqual({ email: 'doctor@example.test', purpose: 'password-reset' });
  expect(s.step()).toBe('otp');
  await s.verifyCode('123456');
  expect(s.step()).toBe('password');
  await s.updatePassword('NewPassword123!', 'NewPassword123!');
  expect(fetch.mock.calls[2][0]).toBe(API_URLS.UPDATE_PASSWORD);
  expect(body(fetch, 2)).toMatchObject({
    resetToken: 'server-grant',
    email: 'doctor@example.test',
    newPassword: 'NewPassword123!',
  });
  expect(fetch.mock.calls[2][1].headers.Authorization).toBeUndefined();
  expect(s.takeNotice()).toContain('actualizada');
  expect(s.takeNotice()).toBe('');
});
it('cannot submit an unverified password or mismatched confirmation', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const s = TestBed.inject(PasswordRecoveryService);
  expect(await s.updatePassword('NewPassword123!', 'NewPassword123!')).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
  expect(await s.updatePassword('NewPassword123!', 'other')).toBe(false);
  expect(s.error()).toContain('coinciden');
});
it('stays on the code step when verification fails and displays the server message', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response({ success: true }))
    .mockResolvedValueOnce(response({ success: false, error: 'Código expirado' }));
  vi.stubGlobal('fetch', fetch);
  const s = TestBed.inject(PasswordRecoveryService);
  await s.requestCode('doctor@example.test');
  expect(await s.verifyCode('123456')).toBe(false);
  expect(s.step()).toBe('otp');
  expect(s.error()).toBe('Código expirado');
  expect(s.busy()).toBe(false);
});
it('disables duplicate requests while waiting for the service', async () => {
  let finish!: (value: any) => void;
  const fetch = vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve)));
  vi.stubGlobal('fetch', fetch);
  const s = TestBed.inject(PasswordRecoveryService);
  const first = s.requestCode('doctor@example.test');
  expect(s.busy()).toBe(true);
  expect(await s.requestCode('doctor@example.test')).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
  finish(response({ success: true }));
  await first;
  expect(s.busy()).toBe(false);
});
it('enables saving only for matching strong passwords, then returns to login after success', async () => {
  const fetch = vi.fn().mockResolvedValue(response({ success: true }));
  vi.stubGlobal('fetch', fetch);
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const recovery = {
    email: () => 'doctor@example.test',
    busy: () => false,
    updatePassword: vi.fn().mockResolvedValue(true),
    reset: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: router },
      { provide: ThemeService, useValue: { isDarkMode: () => false } },
      { provide: PasswordRecoveryService, useValue: recovery },
    ],
  });
  const c = TestBed.runInInjectionContext(() => new PasswordRecoveryComponent());
  c.password = 'NewPassword123!';
  c.confirmation = 'different';
  expect(c.canSave).toBe(false);
  c.confirmation = c.password;
  expect(c.canSave).toBe(true);
  await c.save();
  expect(router.navigate).toHaveBeenCalledWith(['/login']);
  expect(c.password).toBe('');
  c.ngOnDestroy();
});
