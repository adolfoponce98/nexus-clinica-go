import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { AuthService } from './auth.service';
import { TokenInterceptorService } from './token-interceptor.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';

describe('Secure browser sessions', () => {
  let auth: AuthService;
  let tokens: TokenInterceptorService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  const envelope = (data: any) =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        encryptedData: CryptoJS.AES.encrypt(
          JSON.stringify(data),
          SECURITY_CONFIG.ENCRYPTION_KEY,
        ).toString(),
      }),
    }) as Response;
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    navigate = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigate } }] });
    auth = TestBed.inject(AuthService);
    tokens = TestBed.inject(TokenInterceptorService);
    auth.saveSession({
      email: 'doctor@example.test',
      sessionToken: 'old-access',
      refreshToken: 'never-store',
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('persists metadata but keeps both authentication credentials out of Web Storage', () => {
    const raw = localStorage.getItem('cliniq-go-session')!;
    expect(JSON.parse(raw)).toEqual({ email: 'doctor@example.test' });
    expect(raw).not.toContain('old-access');
    expect(raw).not.toContain('never-store');
    expect(auth.getSession()?.sessionToken).toBe('old-access');
    expect(auth.isLoggedIn()).toBe(true);
  });
  it('removes credentials left by the old client without trusting them', () => {
    localStorage.setItem(
      'cliniq-go-session',
      JSON.stringify({
        email: 'doctor@example.test',
        sessionToken: 'legacy',
        refreshToken: 'legacy-refresh',
      }),
    );
    const fresh = new AuthService();
    expect(fresh.getSession()?.sessionToken).toBe('');
    expect(fresh.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('cliniq-go-session')).not.toContain('legacy');
  });
  it('restores after reload through the cookie, without sending a token in the body', async () => {
    const fresh = new AuthService();
    fetchMock.mockResolvedValue(envelope({ success: true, accessToken: 'restored' }));
    expect(await fresh.ensureSession()).toBe(true);
    expect(fresh.getSession()?.sessionToken).toBe('restored');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(API_URLS.REFRESHTOKEN);
    expect(options.credentials).toBe('same-origin');
    expect(options.headers['x-session-request']).toBe('1');
    const payload = JSON.parse(
      CryptoJS.AES.decrypt(
        JSON.parse(options.body).encryptedData,
        SECURITY_CONFIG.ENCRYPTION_KEY,
      ).toString(CryptoJS.enc.Utf8),
    );
    expect(payload).toEqual({ deviceId: expect.any(String) });
    expect(payload.refreshToken).toBeUndefined();
    expect(localStorage.getItem('cliniq-go-session')).not.toContain('restored');
  });
  it('shares one refresh across parallel 401 responses and retries both calls once', async () => {
    fetchMock.mockResolvedValue(envelope({ success: true, accessToken: 'new-access' }));
    const call = vi.fn(
      async (token: string) =>
        ({ ok: token === 'new-access', status: token === 'new-access' ? 200 : 401 }) as Response,
    );
    const results = await Promise.all([tokens.executeWithAuth(call), tokens.executeWithAuth(call)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(call.mock.calls.filter(([t]) => t === 'new-access')).toHaveLength(2);
  });
  it('discards local authentication if refresh is rejected', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    await expect(
      tokens.executeWithAuth(async () => ({ status: 401 }) as Response),
    ).rejects.toThrow();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getSession()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
  it('does not renew on 403 authorization errors', async () => {
    const response = await tokens.executeWithAuth(async () => ({ status: 403 }) as Response);
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(auth.isLoggedIn()).toBe(true);
  });
  it('does not erase a valid session on an ordinary network failure', async () => {
    await expect(
      tokens.executeWithAuth(async () => {
        throw new TypeError('Failed to fetch');
      }),
    ).rejects.toThrow();
    expect(auth.isLoggedIn()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('stops after one retry when the new access token is rejected', async () => {
    fetchMock.mockResolvedValue(envelope({ success: true, accessToken: 'new-access' }));
    const call = vi.fn(async () => ({ status: 401 }) as Response);
    await expect(tokens.executeWithAuth(call)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(2);
    expect(auth.isLoggedIn()).toBe(false);
  });
  it('logout calls the server with cookies and removes local authentication', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await auth.logout();
    expect(fetchMock.mock.calls[0][0]).toBe(API_URLS.LOGOUT_SESSION);
    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin');
    expect(auth.getSession()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(await auth.ensureSession()).toBe(false);
  });
  it('reports server logout failures while still removing the local session', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    await expect(auth.logout()).rejects.toThrow('servidor');
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getSession()).toBeNull();
  });
  it('does not resurrect an old session when a refresh completes after local logout', async () => {
    let complete!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (complete = resolve)));
    const pending = auth.refreshAccessToken();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    auth.clearSession();
    complete(envelope({ success: true, accessToken: 'too-late' }));
    await expect(pending).rejects.toThrow();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getSession()).toBeNull();
  });
  it('renews direct authenticated fetch calls but leaves public requests alone', async () => {
    fetchMock
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce(envelope({ success: true, accessToken: 'new-access' }))
      .mockResolvedValueOnce({ status: 200 });
    const response = await tokens.authenticatedFetch('https://service.example.test', {
      headers: { Authorization: 'Bearer old-access' },
    });
    expect(response.status).toBe(200);
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get('Authorization')).toBe(
      'Bearer new-access',
    );
    fetchMock.mockResolvedValueOnce({ status: 200 });
    await tokens.authenticatedFetch('/public', {});
    expect(fetchMock).toHaveBeenLastCalledWith('/public', {});
  });
});
