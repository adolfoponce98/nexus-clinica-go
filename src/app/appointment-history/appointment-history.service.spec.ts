import { TestBed } from '@angular/core/testing';
import CryptoJS from 'crypto-js';
import { AuthService } from '../auth/auth.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { AppointmentHistoryService } from './appointment-history.service';

describe('AppointmentHistoryService', () => {
  let service: AppointmentHistoryService;
  const encrypted = (value: unknown) => ({
    ok: true,
    json: async () => ({
      encryptedData: CryptoJS.AES.encrypt(
        JSON.stringify(value),
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(),
    }),
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TokenInterceptorService,
          useValue: { executeWithAuth: (call: any) => call('test-token') },
        },
      ],
    });
    TestBed.inject(AuthService).saveSucursal({ idConsultorio: 'branch-a' });
    service = TestBed.inject(AppointmentHistoryService);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads every month, clips the results and preserves attendance and pending states', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        encrypted({
          success: true,
          data: [
            { date: '2026-12-30', schedules: { '08:00': { patientName: 'Outside', status: 3 } } },
            { date: '2026-12-31', schedules: { '09:00': { patientName: 'Attended', status: 3 } } },
          ],
        }),
      )
      .mockResolvedValueOnce(
        encrypted({
          success: true,
          data: [
            { date: '2027-01-01', schedules: { '10:00': { patientName: 'Pending', status: 0 } } },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const result = await service.load({ startDate: '2026-12-31', endDate: '2027-01-02' });
    expect(result.map((item) => item.status)).toEqual([3, 0]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(
      CryptoJS.AES.decrypt(
        JSON.parse(fetchMock.mock.calls[0][1].body).encryptedData,
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(CryptoJS.enc.Utf8),
    );
    expect(payload).toMatchObject({
      idConsultorio: 'branch-a',
      year: 2026,
      month: 12,
      startDate: '2026-12-31',
      endDate: '2026-12-31',
    });
    expect(TestBed.inject(AuthService).getCachedAppointments()).toEqual([]);
  });
  it('fails the whole range when a month fails instead of returning a partial successful list', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(encrypted({ success: true, data: [] }))
        .mockRejectedValueOnce(new Error('offline')),
    );
    await expect(service.load({ startDate: '2026-12-31', endDate: '2027-01-02' })).rejects.toThrow(
      'offline',
    );
  });
  it('cancels superseded requests before sending and scopes cached fallback to the selected dates', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();
    await expect(
      service.load({ startDate: '2026-11-17', endDate: '2026-11-17' }, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
    TestBed.inject(AuthService).saveCachedAppointments(
      [
        { date: '2026-11-16', time: '09:00', status: 3 },
        { date: '2026-11-17', time: '10:00', status: 0 },
      ],
      true,
    );
    expect(
      service.cached({ startDate: '2026-11-17', endDate: '2026-11-17' }).map((item) => item.status),
    ).toEqual([0]);
  });
});
