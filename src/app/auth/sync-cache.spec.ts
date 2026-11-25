import * as CryptoJS from 'crypto-js';
import { prepareSync, finishSync, versionedFetch, clearSyncCache } from './sync-cache';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
const encode = (data: any) => ({
  encryptedData: CryptoJS.AES.encrypt(
    JSON.stringify(data),
    SECURITY_CONFIG.ENCRYPTION_KEY,
  ).toString(),
});
const decode = (data: any) =>
  JSON.parse(
    CryptoJS.AES.decrypt(data.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
      CryptoJS.enc.Utf8,
    ),
  );
describe('Versioned local query cache', () => {
  beforeEach(() => {
    clearSyncCache();
    localStorage.clear();
    localStorage.setItem('cliniq-go-session', JSON.stringify({ email: 'doctor@example.test' }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('uses only the server cursor and reconstructs an unchanged response from local data', () => {
    const body = encode({ idConsultorio: 'a', ultimaSincronizacion: '2099-01-01' });
    const first = prepareSync(API_URLS.GETPATIENTS, body);
    expect(decode(first.body).clientLastUpdate).toBeUndefined();
    finishSync(
      first,
      encode({
        success: true,
        lastUpdated: '2026-11-18T10:00:00.001Z',
        patients: [{ idPaciente: 'p1' }],
      }),
    );
    const next = prepareSync(API_URLS.GETPATIENTS, body);
    expect(decode(next.body).clientLastUpdate).toBe('2026-11-18T10:00:00.001Z');
    const result = decode(
      finishSync(
        next,
        encode({ success: true, notModified: true, lastUpdated: '2026-11-18T10:00:00.001Z' }),
      ),
    );
    expect(result.patients).toEqual([{ idPaciente: 'p1' }]);
    expect(result.fromCache).toBe(true);
  });
  it('isolates account, owner, office, patient and date-range copies', () => {
    const body = encode({ idConsultorio: 'a', startDate: '2026-11-18', endDate: '2026-11-18' });
    const first = prepareSync(API_URLS.GETAPPOINTMENTS, body);
    finishSync(first, encode({ success: true, lastUpdated: '2026-11-18T10:00:00Z', data: [] }));
    for (const payload of [
      { idConsultorio: 'b', startDate: '2026-11-18', endDate: '2026-11-18' },
      { idConsultorio: 'a', startDate: '2026-11-19', endDate: '2026-11-19' },
    ])
      expect(
        decode(prepareSync(API_URLS.GETAPPOINTMENTS, encode(payload)).body).clientLastUpdate,
      ).toBeUndefined();
    localStorage.setItem('cliniq-go-session', JSON.stringify({ email: 'other@example.test' }));
    expect(
      decode(prepareSync(API_URLS.GETAPPOINTMENTS, body).body).clientLastUpdate,
    ).toBeUndefined();
  });
  it('never overwrites a newer copy with an older in-flight response', () => {
    const request = prepareSync(API_URLS.GETPATIENTS, encode({ idConsultorio: 'a' }));
    finishSync(
      request,
      encode({ success: true, lastUpdated: '2026-11-18T11:00:00Z', patients: [{ id: 'new' }] }),
    );
    const result = decode(
      finishSync(
        request,
        encode({ success: true, lastUpdated: '2026-11-18T10:00:00Z', patients: [{ id: 'old' }] }),
      ),
    );
    expect(result.patients).toEqual([{ id: 'new' }]);
  });
  it('does not retain a cursor when storage cannot save the accompanying data', () => {
    const request = prepareSync(API_URLS.GETPATIENTS, encode({ idConsultorio: 'a' }));
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() =>
      finishSync(
        request,
        encode({ success: true, lastUpdated: '2026-11-18T10:00:00Z', patients: [] }),
      ),
    ).not.toThrow();
    spy.mockRestore();
    expect(
      decode(prepareSync(API_URLS.GETPATIENTS, encode({ idConsultorio: 'a' })).body)
        .clientLastUpdate,
    ).toBeUndefined();
  });
  it('does not reuse another patient query or cache a command that sends reminders', () => {
    const body = encode({
      idConsultorio: 'a',
      idPatient: 'p1',
      expedienteId: 'e',
      followUpId: 'f',
    });
    const first = prepareSync(API_URLS.GETPATIENTFOLLOWUP, body);
    finishSync(first, encode({ success: true, lastUpdated: '2026-11-18T10:00:00Z', followUp: {} }));
    expect(
      decode(
        prepareSync(
          API_URLS.GETPATIENTFOLLOWUP,
          encode({ idConsultorio: 'a', idPatient: 'p2', expedienteId: 'e', followUpId: 'f' }),
        ).body,
      ).clientLastUpdate,
    ).toBeUndefined();
    expect(prepareSync(API_URLS.CENTERNOTIFICATIONS, body).key).toBeUndefined();
  });
  it('keeps clinical notes only in RAM, removes old persistent copies and clears them on logout', () => {
    const body = encode({
      idConsultorio: 'a',
      idPatient: 'sensitive-patient',
      expedienteId: 'e',
      followUpId: 'f',
    });
    const request = prepareSync(API_URLS.GETPATIENTFOLLOWUP, body);
    localStorage.setItem(
      request.key!,
      JSON.stringify({
        version: '2026-11-18',
        data: { success: true, followUp: { private: 'legacy' } },
      }),
    );
    prepareSync(API_URLS.GETPATIENTFOLLOWUP, body);
    expect(localStorage.getItem(request.key!)).toBeNull();
    finishSync(
      request,
      encode({
        success: true,
        lastUpdated: '2026-11-18T10:00:00Z',
        followUp: { private: 'clinical note' },
      }),
    );
    expect(localStorage.getItem(request.key!)).toBeNull();
    expect(decode(prepareSync(API_URLS.GETPATIENTFOLLOWUP, body).body).clientLastUpdate).toBe(
      '2026-11-18T10:00:00Z',
    );
    clearSyncCache();
    expect(
      decode(prepareSync(API_URLS.GETPATIENTFOLLOWUP, body).body).clientLastUpdate,
    ).toBeUndefined();
  });
  it('sends encrypted request versions and returns cached data through fetch', async () => {
    const version = '2026-11-18T10:00:00Z';
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(encode({ success: true, lastUpdated: version, patients: [{ id: 'p1' }] })),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(encode({ success: true, lastUpdated: version, notModified: true })),
        ),
      );
    vi.stubGlobal('fetch', mock);
    const options = { method: 'POST', body: JSON.stringify(encode({ idConsultorio: 'a' })) };
    await versionedFetch(API_URLS.GETPATIENTS, options);
    const second = await versionedFetch(API_URLS.GETPATIENTS, options);
    expect(decode(JSON.parse(mock.mock.calls[1][1].body)).clientLastUpdate).toBe(version);
    expect(decode(await second.json()).patients).toEqual([{ id: 'p1' }]);
    clearSyncCache();
    expect(
      decode(prepareSync(API_URLS.GETPATIENTS, encode({ idConsultorio: 'a' })).body)
        .clientLastUpdate,
    ).toBeUndefined();
  });
});
