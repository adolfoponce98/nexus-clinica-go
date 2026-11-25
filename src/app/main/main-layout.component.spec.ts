import { CheckInRemindersComponent } from '../reporting/check-in-reminders.component';
import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import * as CryptoJS from 'crypto-js';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../auth/auth.service';
import { FcmService } from '../auth/fcm.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { LocalNotificationsService } from '../auth/local-notifications.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';

describe('MainLayout local notifications', () => {
  let component: MainLayoutComponent;
  let http: HttpTestingController;
  let cache: LocalNotificationsService;
  const context = { user: 'doctor@example.test', branch: 'branch-a' };
  const item = { id: 'n1', estadoRespuesta: 'confirmada' };

  beforeEach(() => {
    localStorage.clear();
    // jsdom does not implement viewport media queries.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChangeDetectorRef, useValue: { detectChanges() {}, markForCheck() {} } },
        { provide: FcmService, useValue: {} },
        { provide: TokenInterceptorService, useValue: {} },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.saveSession({ email: context.user, sessionToken: 'test-token' });
    auth.saveSucursal({ idConsultorio: context.branch });
    cache = TestBed.inject(LocalNotificationsService);
    http = TestBed.inject(HttpTestingController);
    component = TestBed.runInInjectionContext(() => new MainLayoutComponent());
  });

  afterEach(() => {
    http.verify();
    component.ngOnDestroy();
  });
  it('keeps a visible logout state until the request finishes and ignores repeated confirmations', async () => {
    let finish!: () => void;
    const auth = TestBed.inject(AuthService),
      logout = vi
        .spyOn(auth, 'logout')
        .mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    try {
      component.showLogoutConfirm = true;
      const pending = component.logout();
      expect(component.isLoggingOut()).toBe(true);
      expect(component.showLogoutConfirm).toBe(true);
      await component.logout();
      expect(logout).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
      finish();
      await pending;
      expect(component.isLoggingOut()).toBe(false);
      expect(component.showLogoutConfirm).toBe(false);
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
    } finally {
      logout.mockRestore();
      navigate.mockRestore();
    }
  });

  it('requests the owning doctor notifications while keeping local reads separate for the employee', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession({
      email: 'assistant@test.com',
      idDoctor: context.user,
      typeUser: 2,
      sessionToken: 'test-token',
      permissions: { calendar: { read: true } },
    });
    auth.saveSucursal({ idConsultorio: context.branch });
    component.toggleNotifications();
    const request = http.expectOne(API_URLS.GETNOTIFICATIONS);
    const payload = JSON.parse(
      CryptoJS.AES.decrypt(
        request.request.body.encryptedData,
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(CryptoJS.enc.Utf8),
    );
    expect(payload.idDoctor).toBe(context.user);
    request.flush({
      encryptedData: CryptoJS.AES.encrypt(
        JSON.stringify({ success: true, notifications: [item] }),
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(),
    });
    expect(cache.read({ user: 'assistant@test.com', branch: context.branch })).toHaveLength(1);
    expect(cache.read(context)).toBeNull();
  });
  it('downloads once, persists locally, then opens the cached list without a request', () => {
    component.toggleNotifications();
    const request = http.expectOne(API_URLS.GETNOTIFICATIONS);
    request.flush({
      encryptedData: CryptoJS.AES.encrypt(
        JSON.stringify({ success: true, notifications: [item] }),
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(),
    });
    expect(cache.read(context)).toHaveLength(1);
    expect(component.unreadNotificationsCount).toBe(1);
    component.markNotificationRead(component.notificationsList[0]);
    expect(cache.read(context)?.[0].isRead).toBe(true);
    component.toggleNotifications();
    component.toggleNotifications();
    http.expectNone(API_URLS.GETNOTIFICATIONS);
    expect(component.unreadNotificationsCount).toBe(0);
  });

  it('does not re-download an empty cached list', () => {
    cache.save(context, []);
    component.toggleNotifications();
    http.expectNone(API_URLS.GETNOTIFICATIONS);
  });

  it('refreshes explicitly while preserving local reads and adding unread entries', () => {
    cache.save(context, [{ ...item, isRead: true }]);
    component.toggleNotifications();
    component.fetchNotifications(true);
    http
      .expectOne(API_URLS.GETNOTIFICATIONS)
      .flush({
        encryptedData: CryptoJS.AES.encrypt(
          JSON.stringify({ success: true, notifications: [item, { id: 'n2' }] }),
          SECURITY_CONFIG.ENCRYPTION_KEY,
        ).toString(),
      });
    expect(component.unreadNotificationsCount).toBe(1);
    component.markAllNotificationsRead();
    expect(cache.read(context)?.every((n) => n.isRead)).toBe(true);
    http.expectNone(API_URLS.GETNOTIFICATIONS);
  });

  it('retains the saved list on network and decryption errors', () => {
    cache.save(context, [{ ...item, isRead: true }]);
    component.toggleNotifications();
    component.fetchNotifications(true);
    http
      .expectOne(API_URLS.GETNOTIFICATIONS)
      .flush('offline', { status: 503, statusText: 'Offline' });
    expect(component.notificationsList).toHaveLength(1);
    expect(component.notificationsError).not.toBe('');
    component.fetchNotifications(true);
    http.expectOne(API_URLS.GETNOTIFICATIONS).flush({ encryptedData: 'invalid' });
    expect(component.notificationsList[0].isRead).toBe(true);
    expect(cache.read(context)).toHaveLength(1);
  });

  it('allows cancelled slots in Nueva cita and requires a reason before saving', async () => {
    const auth = TestBed.inject(AuthService);
    auth.saveCachedAppointments(
      [{ date: '2030-01-01', time: '09:00', endTime: '10:00', status: '2', syncId: 'cancelled' }],
      true,
    );
    component.selectedModalDate = '2030-01-01';
    component.generateTimeSlots();
    expect(component.availableTimeSlots.find((s) => s.time === '09:00')?.available).toBe(true);
    component.selectedModalHour = '09:00';
    component.patientForm = { name: 'Ana', phone: '1234567890', email: '', reason: ' ' };
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    try {
      await component.saveAppointment();
      expect(alert).toHaveBeenCalledWith(expect.stringContaining('motivo'));
    } finally {
      alert.mockRestore();
    }
    component.toggleUnknownReason(true);
    expect(component.patientForm.reason).toBe('Sin definir');
    component.toggleUnknownReason(false);
    expect(component.patientForm.reason).toBe('');
  });

  it('removes unauthorized sidebar entries in expanded and collapsed mode, including write-only permissions', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession({
      email: 'assistant@test.com',
      idDoctor: context.user,
      typeUser: 2,
      sessionToken: 'test',
      permissions: {
        patients: { read: true },
        devices: { read: true },
        calendar: { read: false, write: true },
        config: { read: false, delete: true },
      },
    });
    const init = vi.spyOn(MainLayoutComponent.prototype, 'ngOnInit').mockImplementation(() => {});
    const reminders = vi
      .spyOn(CheckInRemindersComponent.prototype, 'ngOnInit')
      .mockImplementation(() => {});
    const fixture = TestBed.createComponent(MainLayoutComponent);
    try {
      for (const collapsed of [false, true]) {
        fixture.componentInstance.isSidebarCollapsed = collapsed;
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const sidebar = fixture.nativeElement.querySelector('aside');
        const paths = Array.from(sidebar.querySelectorAll('a[href]')).map((a: any) =>
          a.getAttribute('href'),
        );
        expect(paths).toContain('/pacientes');
        for (const path of [
          '/home',
          '/calendario',
          '/consultorios',
          '/employes',
          '/services',
          '/planes',
          '/profile',
          '/recetas',
        ])
          expect(paths).not.toContain(path);
        expect(sidebar.textContent).not.toContain('WhatsApp');
      }
      auth.saveSession({
        ...auth.getSession(),
        permissions: {
          calendar: { read: true },
          patients: { read: true },
          devices: { read: true },
        },
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('aside a[href="/calendario"]')).not.toBeNull();
    } finally {
      fixture.destroy();
      init.mockRestore();
      reminders.mockRestore();
    }
  });
});
