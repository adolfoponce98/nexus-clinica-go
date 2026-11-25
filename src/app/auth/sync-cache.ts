import * as CryptoJS from 'crypto-js';
import { API_URLS } from '../config/api-urls';
import { SECURITY_CONFIG } from '../config/security.config';
const PREFIX = 'cliniq-sync:v2:';
const MEMORY_READ_URLS = new Set<string>([
  API_URLS.GETPATIENTFOLLOWUP,
  API_URLS.GETPATIENTEXPEDIENT,
]);
const clinicalMemory = new Map<string, string>();
const readCopy = (request: SyncRequest) =>
  request.memory ? clinicalMemory.get(request.key!) : localStorage.getItem(request.key!);
const READ_URLS = new Set<string>([
  API_URLS.GETPATIENTS,
  API_URLS.GETDOCTORSOFFICE,
  API_URLS.GETNOTIFICATIONS,
  API_URLS.GETPATIENTFOLLOWUP,
  API_URLS.GETPATIENTEXPEDIENT,
  API_URLS.GETAPPOINTMENTS,
  API_URLS.SYNCFOLLOWINGAPPOINTMENTS,
]);
const decode = (body: any) =>
  JSON.parse(
    CryptoJS.AES.decrypt(body.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
      CryptoJS.enc.Utf8,
    ),
  );
const encode = (body: any) => ({
  encryptedData: CryptoJS.AES.encrypt(
    JSON.stringify(body),
    SECURITY_CONFIG.ENCRYPTION_KEY,
  ).toString(),
});
function stable(value: any): any {
  return Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
        )
      : value;
}
export interface SyncRequest {
  body: any;
  key?: string;
  cached?: { version: string; data: any };
  session: string | null;
  memory?: boolean;
}
export function prepareSync(url: string, body: any): SyncRequest {
  const session = localStorage.getItem('cliniq-go-session');
  const result: SyncRequest = { body, session };
  if (!READ_URLS.has(url) || !body?.encryptedData || !session) return result;
  try {
    const account = JSON.parse(session),
      payload = decode(body);
    for (const field of ['clientLastUpdate', 'ultimaSincronizacion', 'client_last_update'])
      delete payload[field];
    const key =
      PREFIX +
      JSON.stringify([account.email, account.idDoctor || account.email, url, stable(payload)]);
    const memory = MEMORY_READ_URLS.has(url);
    if (memory) localStorage.removeItem(key);
    const stored = memory ? clinicalMemory.get(key) : localStorage.getItem(key),
      cached = stored ? JSON.parse(stored) : undefined;
    if (cached?.version && cached?.data?.success) payload.clientLastUpdate = cached.version;
    return { body: encode(payload), key, cached, session, memory };
  } catch {
    return result;
  }
}
export function finishSync(request: SyncRequest, body: any): any {
  if (!request.key || !body?.encryptedData) return body;
  const data = decode(body);
  if (!data.success) return body;
  if (data.notModified) {
    if (!request.cached?.data)
      throw new Error('No existe una copia local para esta consulta. Vuelve a consultar.');
    const latest = readCopy(request);
    if (latest)
      try {
        const newer = JSON.parse(latest);
        if (Date.parse(newer.version) > Date.parse(request.cached.version))
          return encode({ ...newer.data, fromCache: true });
      } catch {}
    return encode({
      ...request.cached.data,
      lastUpdated: data.lastUpdated,
      fromCache: true,
      notModified: false,
    });
  }
  if (data.lastUpdated && request.session === localStorage.getItem('cliniq-go-session')) {
    const current = readCopy(request);
    if (current)
      try {
        const newer = JSON.parse(current);
        if (Date.parse(newer.version) > Date.parse(data.lastUpdated)) return encode(newer.data);
      } catch {}
    try {
      // Store the body and cursor together. A quota failure must never leave a cursor without its data.
      const serialized = JSON.stringify({ version: data.lastUpdated, data });
      if (request.memory) clinicalMemory.set(request.key, serialized);
      else localStorage.setItem(request.key, serialized);
    } catch {
      /* Continue without persistent caching when storage is unavailable/full. */
    }
  }
  return body;
}
export async function versionedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let request: SyncRequest = { body: null, session: null };
  try {
    if (typeof options.body === 'string') request = prepareSync(url, JSON.parse(options.body));
  } catch {}
  const response = await fetch(
    url,
    request.key ? { ...options, body: JSON.stringify(request.body) } : options,
  );
  if (
    response.ok &&
    /https:\/\/(deactivateoffice|registernewpatient|submitpatientregistration|saveorupdateconsultorio|saveorupdateemployee|deleteemploye|newdoctorservice|savedoctorservice|deletedoctorservice|generatemedicalsummary|extractexpedient|generateblankprescription)-/.test(
      url,
    )
  ) {
    try {
      const data = decode(await response.clone().json());
      if (data.success) window.dispatchEvent(new Event('clinic-billing-refresh'));
    } catch {}
  }
  if (!response.ok || !request.key || typeof response.clone !== 'function') return response;
  const body = finishSync(request, await response.clone().json());
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('Content-Encoding');
  return new Response(JSON.stringify(body), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
export function clearSyncCache(): void {
  clinicalMemory.clear();
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('cliniq-sync:')) localStorage.removeItem(key);
  }
}
