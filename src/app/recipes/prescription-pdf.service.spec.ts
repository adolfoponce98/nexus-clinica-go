import { TestBed } from '@angular/core/testing';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
describe('Prescription PDF attachments', () => {
  afterEach(() => vi.restoreAllMocks());
  function setup() {
    const api = {
      branchId: () => 'office-a',
      post: vi
        .fn()
        .mockResolvedValue({
          uploadUrl: 'https://storage.example.test/put',
          readUrl: 'https://storage.example.test/read',
        }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ClinicApiService, useValue: api }] });
    return {
      api,
      service: TestBed.inject(PrescriptionPdfService),
      file: new File(['pdf'], 'RX.pdf', { type: 'application/pdf' }),
    };
  }
  it('uses the existing signed upload endpoint with patient, office, record and consultation context', async () => {
    const { api, service, file } = setup();
    const put = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    const attachment = await service.upload(
      file,
      'patient-a',
      'record-a',
      'office-a',
      'consultation-a',
    );
    expect(api.post).toHaveBeenCalledWith(
      API_URLS.GETSIGNEDUPLOADURL,
      expect.objectContaining({
        objectType: 'PATIENT',
        category: 'EXPEDIENT',
        documentType: 'FILE',
        idConsultorio: 'office-a',
        idPatient: 'patient-a',
        idExpedient: 'record-a',
        idFollowups: 'consultation-a',
        contentType: 'application/pdf',
      }),
    );
    expect(put).toHaveBeenCalledWith('https://storage.example.test/put', {
      method: 'PUT',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
    });
    expect(attachment).toEqual({
      name: 'RX.pdf',
      url: 'https://storage.example.test/read',
      type: 'document',
      uploading: false,
      progress: 100,
    });
  });
  it('never returns a completed attachment if the storage upload fails', async () => {
    const { service, file } = setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
    await expect(service.upload(file, 'patient-a', 'record-a', 'office-a')).rejects.toThrow(
      'no se pudo subir el PDF',
    );
  });
  it('rejects a changed office before requesting an upload URL', async () => {
    const { api, service, file } = setup();
    await expect(service.upload(file, 'patient-a', 'record-a', 'office-b')).rejects.toThrow(
      'consultorio cambió',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
