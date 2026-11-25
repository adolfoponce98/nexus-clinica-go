import { PublicRegistrationApiService } from './public-registration-api.service';
import { SECURITY_CONFIG } from '../config/security.config';
import * as CryptoJS from 'crypto-js';
describe('Public registration transport', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('omits credentials and bearer tokens and encrypts the patient payload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            encryptedData: CryptoJS.AES.encrypt(
              JSON.stringify({ success: true, registered: true }),
              SECURITY_CONFIG.ENCRYPTION_KEY,
            ).toString(),
          }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const result = await new PublicRegistrationApiService().post('https://test.invalid', {
      token: 'capability-token',
      form: { firstName: 'Private patient' },
    });
    expect(result.registered).toBe(true);
    const options = fetchMock.mock.calls[0][1];
    expect(options.credentials).toBe('omit');
    expect(options.referrerPolicy).toBe('no-referrer');
    expect(options.headers.Authorization).toBeUndefined();
    expect(options.body).not.toContain('Private patient');
  });
});
