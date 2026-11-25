import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { CalendarComponent } from './calendar.component';
import { AuthService } from '../auth/auth.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { SECURITY_CONFIG } from '../config/security.config';

describe('Calendar future appointment selection', () => {
  let component: CalendarComponent;
  let tokens: { executeWithAuth: ReturnType<typeof vi.fn> };
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 17, 14, 15, 30));
    localStorage.clear();
    tokens = {
      executeWithAuth: vi.fn((call: (token: string) => Promise<Response>) => call('test-token')),
    };
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeDetectorRef, useValue: { detectChanges() {} } },
        { provide: TokenInterceptorService, useValue: tokens },
      ],
    });
    TestBed.inject(AuthService).saveSession({
      email: 'doctor@test.com',
      typeUser: 1,
      sessionToken: 'test',
    });
    TestBed.inject(AuthService).saveSucursal({ idConsultorio: 'test-office', services: [] });
    component = TestBed.runInInjectionContext(() => new CalendarComponent());
  });
  afterEach(() => {
    component.ngOnDestroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('opens the practice outside inert real content and defers calendar requests until exit', () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.tutorialOpen()).toBe(true);
    expect(el.querySelector('app-calendar-onboarding')?.closest('[inert]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    el.querySelector<HTMLButtonElement>('.welcome .primary')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.replica-calendar')).toBeTruthy();
    fixture.destroy();
  });
  it('keeps appointment details readable while denying booking to a read-only employee', () => {
    TestBed.inject(AuthService).saveSession({
      email: 'assistant@test.com',
      idDoctor: 'doctor@test.com',
      permissions: { calendar: { read: true } },
    });
    component.openAppointmentModal('2026-11-18');
    expect(component.showAppointmentModal).toBe(false);
    component.openAppointmentDetail({
      date: '2026-11-18',
      time: '15:00',
      status: 0,
      patientName: 'Ana',
    });
    expect(component.isAppointmentDetailModalOpen()).toBe(true);
  });
  it('blocks yesterday in the month selector while allowing today and future dates', () => {
    component.openAppointmentModal('2026-11-16');
    expect(component.showAppointmentModal).toBe(false);
    expect(component.isPastBookingDay('2026-11-16')).toBe(true);
    component.openAppointmentModal('2026-11-17');
    expect(component.showAppointmentModal).toBe(true);
    expect(component.isPastBookingDay('2026-11-18')).toBe(false);
  });
  it('blocks elapsed times through both day/week entry points and normalizes 12-hour input', () => {
    component.openAppointmentModal('2026-11-17', '2:00 PM');
    expect(component.showAppointmentModal).toBe(false);
    component.openSlotAppointmentModal('2026-11-16', '3:00 PM');
    expect(component.showAppointmentModal).toBe(false);
    component.openSlotAppointmentModal('2026-11-17', '3:00 PM');
    expect(component.showAppointmentModal).toBe(true);
    expect(component.targetHour).toBe('15:00');
  });
  it('only offers future time slots today and keeps early times available tomorrow', () => {
    component.targetDate = '2026-11-17';
    component.generateTimeSlots();
    expect(component.availableTimeSlots.find((slot) => slot.time === '14:00')?.available).toBe(
      false,
    );
    expect(component.filteredAvailableTimeSlots[0].time).toBe('14:30');
    component.targetDate = '2026-11-18';
    component.generateTimeSlots();
    expect(component.filteredAvailableTimeSlots[0].time).toBe('07:00');
    component.targetDate = '2026-11-16';
    component.generateTimeSlots();
    expect(component.filteredAvailableTimeSlots).toEqual([]);
  });
  it('rejects invalid dates and times instead of coercing them into an allowed slot', () => {
    expect(component.canBookSlot('2026-02-30', '15:00')).toBe(false);
    expect(component.canBookSlot('2026-11-17', '25:00')).toBe(false);
    component.openAppointmentModal('2026-11-18', 'not-a-time');
    expect(component.showAppointmentModal).toBe(false);
  });
  it('expires a selected slot while its dialog stays open', () => {
    vi.setSystemTime(new Date(2026, 10, 17, 14, 29, 59));
    component.openAppointmentModal('2026-11-17');
    component.selectModalHour('14:30');
    expect(component.canSaveBookingTime()).toBe(true);
    vi.setSystemTime(new Date(2026, 10, 17, 14, 30, 1));
    component.updateCurrentTimeIndicator();
    expect(component.selectedModalHour).toBe('');
    expect(component.canSaveBookingTime()).toBe(false);
    expect(component.bookingTimeError()).toContain('ya pasó');
  });
  it('cannot select a stale chip directly after the clock advances', () => {
    component.openAppointmentModal('2026-11-17');
    vi.setSystemTime(new Date(2026, 10, 17, 14, 31));
    component.selectModalHour('14:30');
    expect(component.selectedModalHour).toBe('');
  });
  it('checks again on save and never contacts the server for an expired selection', async () => {
    component.isAdvancedModal = true;
    component.targetDate = '2026-11-17';
    component.selectedModalHour = '14:00';
    component.patientForm = {
      name: 'Test patient',
      phone: '0000000000',
      email: '',
      reason: 'Consulta',
    };
    await component.saveAppointment();
    expect(tokens.executeWithAuth).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(component.bookingTimeError()).toContain('ya pasaron');
  });
  it('revalidates immediately before fetch if authentication delays cross the appointment start', async () => {
    component.openAppointmentModal('2026-11-17', '3:00 PM');
    component.patientForm = {
      name: 'Test patient',
      phone: '0000000000',
      email: '',
      reason: 'Consulta',
    };
    tokens.executeWithAuth.mockImplementation(
      async (call: (token: string) => Promise<Response>) => {
        vi.setSystemTime(new Date(2026, 10, 17, 15, 0, 1));
        return call('test-token');
      },
    );
    await component.saveAppointment();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(component.isSaving).toBe(false);
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('ya pasó'));
  });
  it('still saves a valid future appointment', async () => {
    component.openAppointmentModal('2026-11-17', '3:00 PM');
    component.patientForm = {
      name: 'Test patient',
      phone: '0000000000',
      email: '',
      reason: 'Consulta',
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        encryptedData: CryptoJS.AES.encrypt(
          JSON.stringify({ success: true }),
          SECURITY_CONFIG.ENCRYPTION_KEY,
        ).toString(),
      }),
    });
    await component.saveAppointment();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(component.showSuccessModal).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const payload = JSON.parse(
      CryptoJS.AES.decrypt(body.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
        CryptoJS.enc.Utf8,
      ),
    );
    expect(payload.appointmentData).toMatchObject({ date: '2026-11-17', time: '15:00' });
  });
  it('updates the minimum date at midnight and moves reassignment of an old appointment to today', () => {
    vi.setSystemTime(new Date(2026, 10, 18, 0, 0, 1));
    component.updateCurrentTimeIndicator();
    expect(component.minBookingDate).toBe('2026-11-18');
    component.openAppointmentDetail({
      date: '2026-11-17',
      time: '15:00',
      status: 2,
      reason: 'Consulta anterior',
    });
    expect(component.isAppointmentDetailModalOpen()).toBe(true);
    component.reassignAppointment();
    expect(component.targetDate).toBe('2026-11-18');
    expect(component.isAdvancedModal).toBe(true);
    expect(component.patientForm.reason).toBe('Consulta anterior');
  });
  it('refreshes on the next minute boundary and cleans up the clock on destroy', () => {
    vi.setSystemTime(new Date(2026, 10, 17, 14, 29, 59));
    vi.spyOn(component, 'loadAppointments').mockResolvedValue();
    component.ngOnInit();
    component.openAppointmentModal('2026-11-17');
    component.selectModalHour('14:30');
    vi.advanceTimersByTime(1010);
    expect(component.selectedModalHour).toBe('');
    component.ngOnDestroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases cancelled slots while still blocking overlapping active appointments', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveCachedAppointments(
      [
        { date: '2026-11-18', time: '09:00', endTime: '10:00', status: 2, syncId: 'cancelled' },
        { date: '2026-11-18', time: '10:00', endTime: '11:00', status: 0, syncId: 'active' },
      ],
      true,
    );
    component.openAppointmentModal('2026-11-18');
    expect(component.availableTimeSlots.find((s) => s.time === '09:00')?.available).toBe(true);
    expect(component.availableTimeSlots.find((s) => s.time === '09:30')?.available).toBe(false);
  });
  it('requires a reason and uses Sin definir only when the unknown-reason switch is on', async () => {
    component.openAppointmentModal('2026-11-18', '9:00 AM');
    component.patientForm = { name: 'Ana', phone: '1234567890', email: '', reason: '   ' };
    await component.saveAppointment();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('motivo'));
    component.patientForm.reason = 'Consulta';
    component.selectedServiceId = 'service';
    component.toggleUnknownReason(true);
    expect(component.patientForm.reason).toBe('Sin definir');
    expect(component.selectedServiceId).toBe('');
    component.toggleUnknownReason(false);
    expect(component.patientForm.reason).toBe('Consulta');
    expect(component.selectedServiceId).toBe('service');
    component.toggleUnknownReason(true);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        encryptedData: CryptoJS.AES.encrypt(
          JSON.stringify({ success: true }),
          SECURITY_CONFIG.ENCRYPTION_KEY,
        ).toString(),
      }),
    });
    await component.saveAppointment();
    const payload = JSON.parse(
      CryptoJS.AES.decrypt(
        JSON.parse(fetchMock.mock.calls[0][1].body).encryptedData,
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(CryptoJS.enc.Utf8),
    );
    expect(payload.appointmentData.reason).toBe('Sin definir');
    expect(payload.appointmentData.serviceId).toBeUndefined();
  });
});
