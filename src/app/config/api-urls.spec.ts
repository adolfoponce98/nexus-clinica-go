import { describe, it, expect } from 'vitest';
import { API_URLS } from './api-urls';
import { environment } from '../../environments/environment';
describe('API environment URLs', () => {
  it('routes every remote service to the selected Cloud Run suffix', () => {
    for (const url of Object.values(API_URLS)) {
      if (url.startsWith('/')) continue;
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname.endsWith(environment.functionsUrlSuffix)).toBe(true);
      expect(parsed.hostname).toBe(parsed.hostname.toLowerCase());
    }
    expect(API_URLS.SAVEAPPOINTMENT).toBe(
      `https://saveappointment${environment.functionsUrlSuffix}`,
    );
  });
  it('keeps cookie-backed authentication on the same origin', () => {
    expect(API_URLS.LOGINUSER).toBe('/api/auth/login');
    expect(API_URLS.LOGINEMPLOYEE).toBe('/api/auth/employee-login');
    expect(API_URLS.REFRESHTOKEN).toBe('/api/auth/refresh');
    expect(API_URLS.LOGOUT_SESSION).toBe('/api/auth/logout');
  });
});
