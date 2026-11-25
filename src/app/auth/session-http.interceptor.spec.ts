import { TestBed } from '@angular/core/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { AuthService } from './auth.service';
import { SessionHttpInterceptor } from './session-http.interceptor';
import { API_URLS } from '../config/api-urls';
import { SECURITY_CONFIG } from '../config/security.config';

describe('HttpClient session renewal', () => {
  let http: HttpClient, controller: HttpTestingController, auth: AuthService;
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: SessionHttpInterceptor, multi: true },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.saveSession({ email: 'doctor@example.test', sessionToken: 'old' });
  });
  afterEach(() => {
    controller.verify();
    vi.unstubAllGlobals();
  });
  it('renews an expired HttpClient token and retries the same encrypted request', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        encryptedData: CryptoJS.AES.encrypt(
          JSON.stringify({ success: true, accessToken: 'new' }),
          SECURITY_CONFIG.ENCRYPTION_KEY,
        ).toString(),
      }),
    });
    const result = firstValueFrom(
      http.post(
        API_URLS.SAVEPATIENTRECORD,
        { encryptedData: 'preserved' },
        { headers: { Authorization: 'Bearer old' } },
      ),
    );
    let first!: TestRequest;
    await vi.waitFor(() => {
      first = controller.expectOne(API_URLS.SAVEPATIENTRECORD);
    });
    expect(first.request.headers.get('Authorization')).toBe('Bearer old');
    first.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    let retry!: TestRequest;
    await vi.waitFor(() => {
      retry = controller.expectOne(API_URLS.SAVEPATIENTRECORD);
    });
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
    expect(retry.request.body).toEqual({ encryptedData: 'preserved' });
    retry.flush({ success: true });
    expect(await result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('does not add credentials or refresh public and signed-upload requests', async () => {
    const result = firstValueFrom(http.put('https://storage.googleapis.com/signed-url', 'file'));
    const request = controller.expectOne('https://storage.googleapis.com/signed-url');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ok: true });
    await result;
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
