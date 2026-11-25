import { signal } from '@angular/core';
import { BillingService } from '../planes/billing.service';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  PrescriptionComposerComponent,
  MEDICATION_FIELDS,
  prescriptionPatient,
} from './prescription-composer.component';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { PermissionService } from '../auth/permission.service';
import { API_URLS } from '../config/api-urls';
const patient = {
  expedienteId: 'record-a',
  fichaDeIdentificacion: {
    nombreCompleto: 'Paciente real',
    edad: 35,
    fechaNacimiento: '1991-01-20',
  },
};
function setup(attach = true, allowed = true) {
  const prescription = {
    folio: 'RX-123456-prueba',
    idPaciente: 'patient-a',
    expedienteId: 'record-a',
    header: { patient: { fullName: 'Paciente real' }, author: {}, office: {} },
    medications: [],
    qrData: 'cifrado',
    templateId: 'rose',
  };
  const api = {
    branchId: vi.fn(() => 'office-a'),
    post: vi.fn(async (url: string) =>
      url === API_URLS.GET_PRESCRIPTION_SETTINGS
        ? {
            doctor: { fullName: 'Doctora real' },
            office: { idConsultorio: 'office-a', name: 'Clínica real' },
            settings: { templateId: 'rose' },
          }
        : url === API_URLS.GET_CLINICAL_IDENTITY
          ? { profile: { signatureImage: 'data:image/png;base64,prueba' } }
          : url === API_URLS.GETPATIENTEXPEDIENT
            ? { patient }
            : { prescription, integrityHash: 'hash' },
    ),
  };
  const billing = {
    allows: () => true,
    active: vi.fn(() => true),
    error: signal(''),
    state: signal({ aiCredits: 200 }),
    refresh: vi.fn().mockResolvedValue(undefined),
  };
  const attachment = {
    name: 'RX.pdf',
    url: 'https://storage.example.test/file',
    type: 'document',
    uploading: false,
    progress: 100,
  };
  const pdf = {
    generate: vi.fn().mockResolvedValue(new File(['pdf'], 'RX.pdf', { type: 'application/pdf' })),
    upload: vi.fn().mockResolvedValue(attachment),
    download: vi.fn(),
  };
  const ref = { close: vi.fn() };
  TestBed.configureTestingModule({
    imports: [PrescriptionComposerComponent],
    providers: [
      { provide: BillingService, useValue: billing },
      {
        provide: MAT_DIALOG_DATA,
        useValue: { patientId: 'patient-a', attachToConsultation: attach },
      },
      { provide: MatDialogRef, useValue: ref },
      { provide: ClinicApiService, useValue: api },
      { provide: PermissionService, useValue: { can: () => allowed } },
      { provide: PrescriptionPdfService, useValue: pdf },
    ],
  });
  const fixture = TestBed.createComponent(PrescriptionComposerComponent),
    c = fixture.componentInstance;
  return { fixture, c, api, pdf, ref, attachment, billing };
}
async function prepare(c: PrescriptionComposerComponent) {
  await c.load();
  c.medications = [Object.fromEntries(MEDICATION_FIELDS.map((f) => [f.key, 'Texto completo']))];
  c.acknowledged = true;
  c.generalAcknowledged = true;
  c.document = { nativeElement: { querySelector: () => ({}) } } as any;
  vi.spyOn(c as any, 'waitForQr').mockResolvedValue(undefined);
}
describe('Contextual prescription issuance', () => {
  it('loads actual patient, default template and saved doctor signature', async () => {
    const { c } = setup();
    await c.load();
    expect(c.preview.templateId).toBe('rose');
    expect(c.preview.header.patient.fullName).toBe('Paciente real');
    expect(c.preview.header.author.signatureImage).toContain('data:image/png');
    expect(c.expedienteId).toBe('record-a');
    expect(c.valid).toBe(false);
  });
  it('issues once and uploads the generated PDF before returning a completed attachment', async () => {
    const { c, api, pdf, ref, attachment } = setup();
    await prepare(c);
    await c.save();
    expect(api.post).toHaveBeenCalledWith(
      API_URLS.ISSUE_PRESCRIPTION,
      expect.objectContaining({
        idPaciente: 'patient-a',
        expedienteId: 'record-a',
        idConsultorio: 'office-a',
        patient: expect.objectContaining({ fullName: 'Paciente real' }),
      }),
    );
    expect(pdf.upload).toHaveBeenCalledWith(
      expect.any(File),
      'patient-a',
      'record-a',
      'office-a',
      undefined,
    );
    expect(ref.close).toHaveBeenCalledWith({ attachment, folio: 'RX-123456-prueba' });
  });
  it('retries failed uploads without issuing another prescription', async () => {
    const { c, api, pdf, ref } = setup();
    await prepare(c);
    pdf.upload.mockRejectedValueOnce(new Error('Sin conexión'));
    await c.save();
    expect(ref.close).not.toHaveBeenCalled();
    expect(c.error()).toBe('Sin conexión');
    await c.save();
    expect(api.post.mock.calls.filter(([url]) => url === API_URLS.ISSUE_PRESCRIPTION)).toHaveLength(
      1,
    );
    expect(pdf.generate).toHaveBeenCalledTimes(1);
    expect(pdf.upload).toHaveBeenCalledTimes(2);
    expect(ref.close).toHaveBeenCalledTimes(1);
  });
  it('downloads from the record without uploading or changing the consultation', async () => {
    const { c, pdf, ref } = setup(false);
    await prepare(c);
    await c.save();
    expect(pdf.download).toHaveBeenCalledWith(expect.any(File));
    expect(pdf.upload).not.toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
  });
  it('prevents issuance without permission or after changing office', async () => {
    const { c, api } = setup(true, false);
    await prepare(c);
    await c.save();
    expect(api.post.mock.calls.some(([url]) => url === API_URLS.ISSUE_PRESCRIPTION)).toBe(false);
  });
  it('does not issue against an office changed while the editor was open', async () => {
    const { c, api } = setup();
    await prepare(c);
    api.branchId.mockReturnValue('office-b');
    await c.save();
    expect(c.error()).toContain('Cambió el consultorio');
    expect(api.post.mock.calls.some(([url]) => url === API_URLS.ISSUE_PRESCRIPTION)).toBe(false);
  });
  it('allows correcting a request explicitly rejected by the service', async () => {
    const { c, api } = setup();
    await prepare(c);
    const original = api.post.getMockImplementation()!;
    api.post.mockImplementation(async (url: string) => {
      if (url === API_URLS.ISSUE_PRESCRIPTION)
        throw Object.assign(new Error('Corrige las indicaciones'), {
          name: 'ClinicApiResponseError',
        });
      return original(url);
    });
    await c.save();
    expect(c.pending).toBeNull();
    expect(c.frozen).toBe(false);
  });
  it('does not invent age or birth date when missing from the record', () => {
    expect(prescriptionPatient({ fichaDeIdentificacion: { nombreCompleto: 'Paciente' } })).toEqual({
      fullName: 'Paciente',
      age: '',
      birthDate: '',
    });
  });
  it('organizes multiple dictated medicines, fills the preview and keeps manual edits and removal available', async () => {
    const { c, api } = setup();
    await c.load();
    c.dictation = 'Dictado de dos medicamentos';
    const meds = [
      {
        ...Object.fromEntries(MEDICATION_FIELDS.map((f) => [f.key, ''])),
        genericName: 'Medicamento uno',
        dose: 'Una tableta',
      },
      {
        ...Object.fromEntries(MEDICATION_FIELDS.map((f) => [f.key, ''])),
        brandName: 'Marca dictada',
      },
    ];
    api.post.mockResolvedValueOnce({
      data: {
        medications: meds,
        instructions: 'Indicación dictada',
        warnings: ['Completa los datos pendientes'],
      },
    } as any);
    await c.generateFromDictation();
    expect(c.medications).toHaveLength(2);
    expect(c.preview.medications[0]['genericName']).toBe('Medicamento uno');
    expect(c.medications[1]['genericName']).toBe('Marca dictada');
    expect(c.aiWarnings()).toContain('Completa los datos pendientes');
    c.medications[0]['dose'] = 'Corrección manual';
    c.remove(1);
    expect(c.preview.medications[0]['dose']).toBe('Corrección manual');
    expect(c.medications).toHaveLength(1);
    expect(c.valid).toBe(false);
    c.remove(0);
    expect(c.medications).toHaveLength(0);
    expect(c.valid).toBe(false);
  });
  it('keeps existing medicines unless replacement is explicitly selected and never applies a dictation twice', async () => {
    const { c, api } = setup();
    await c.load();
    c.medications[0]['genericName'] = 'Original';
    c.dictation = 'Dictado medicamento nuevo';
    api.post.mockResolvedValueOnce({ data: { medications: [{ genericName: 'Nuevo' }] } } as any);
    await c.generateFromDictation();
    expect(c.medications.map((m) => m['genericName'])).toEqual(['Original', 'Nuevo']);
    const calls = api.post.mock.calls.length;
    await c.generateFromDictation();
    expect(api.post.mock.calls).toHaveLength(calls);
    c.dictation = 'Dictado de reemplazo';
    c.replaceMedications = true;
    api.post.mockResolvedValueOnce({
      data: { medications: [{ genericName: 'Reemplazo' }] },
    } as any);
    await c.generateFromDictation();
    expect(c.medications.map((m) => m['genericName'])).toEqual(['Reemplazo']);
  });
  it('shows progress, preserves manual input on error and reuses the request ID on retry', async () => {
    const { c, api } = setup();
    await c.load();
    c.dictation = 'Un medicamento dictado';
    c.medications[0]['genericName'] = 'Manual';
    let reject!: (e: Error) => void;
    api.post.mockImplementationOnce(() => new Promise((_, r) => (reject = r)));
    const pending = c.generateFromDictation();
    expect(c.aiBusy()).toBe(true);
    expect(c.frozen).toBe(true);
    const id = (api.post.mock.calls.at(-1) as any)[1].requestId;
    reject(new Error('Sin conexión'));
    await pending;
    expect(c.aiBusy()).toBe(false);
    expect(c.medications[0]['genericName']).toBe('Manual');
    api.post.mockResolvedValueOnce({ data: { medications: [{ genericName: 'Dictado' }] } } as any);
    await c.generateFromDictation();
    expect((api.post.mock.calls.at(-1) as any)[1].requestId).toBe(id);
  });
  it('does not apply late AI results after the dialog is destroyed', async () => {
    const { c, api } = setup();
    await c.load();
    c.dictation = 'Un medicamento dictado';
    let resolve!: (value: any) => void;
    api.post.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = c.generateFromDictation();
    c.ngOnDestroy();
    resolve({ data: { medications: [{ genericName: 'Tardío' }] } });
    await pending;
    expect(c.medications[0]['genericName']).toBe('');
  });

  it('captures voice transcription and releases the microphone when the dialog is destroyed', async () => {
    const { c } = setup();
    await c.load();
    let speech: any;
    class Speech {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: any;
      onerror: any;
      onend: any;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
      constructor() {
        speech = this;
      }
    }
    vi.stubGlobal('SpeechRecognition', Speech);
    try {
      c.startDictation();
      expect(c.recording()).toBe(true);
      expect(speech.lang).toBe('es-MX');
      speech.onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'Medicamento dictado, una tableta' }], { isFinal: true }),
        ],
      });
      expect(c.dictation).toContain('Medicamento dictado');
      c.stopDictation();
      speech.onend();
      expect(c.recording()).toBe(false);
      expect(c.stopping()).toBe(false);
      c.ngOnDestroy();
      expect(speech.abort).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('allows subscribed users to generate dictation with zero credits', async () => {
    const { c, api, billing } = setup();
    await c.load();
    billing.state.set({ aiCredits: 0 });
    c.dictation = 'Prescripción dictada';
    api.post.mockResolvedValueOnce({ data: { medications: [{ genericName: 'Dictado' }] } } as any);
    await c.generateFromDictation();
    expect(c.medications[0]['genericName']).toBe('Dictado');
  });
  it('requires credits only on FREE and permits a FREE account with a positive balance', async () => {
    const { c, api, billing } = setup();
    await c.load();
    billing.active.mockReturnValue(false);
    billing.state.set({ aiCredits: 0 });
    c.dictation = 'Prescripción dictada';
    await c.generateFromDictation();
    expect(c.speechError()).toContain('créditos');
    expect(
      api.post.mock.calls.some(([url]) => url === API_URLS.GENERATE_PRESCRIPTION_FROM_DICTATION),
    ).toBe(false);
    billing.state.set({ aiCredits: 1 });
    api.post.mockResolvedValueOnce({
      data: { medications: [{ genericName: 'Dictado FREE' }] },
    } as any);
    await c.generateFromDictation();
    expect(c.medications[0]['genericName']).toBe('Dictado FREE');
  });

  it('enables issuance with only name, dose, frequency and duration while preserving both confirmation checks', async () => {
    const { c } = setup();
    await c.load();
    c.medications = [
      {
        genericName: 'Medicamento dictado',
        dose: 'Una tableta',
        frequency: 'Cada ocho horas',
        duration: 'Tres días',
      },
    ];
    expect(c.valid).toBe(false);
    c.acknowledged = true;
    expect(c.valid).toBe(false);
    c.generalAcknowledged = true;
    expect(c.valid).toBe(true);
    for (const key of ['genericName', 'dose', 'frequency', 'duration']) {
      const old = c.medications[0][key];
      c.medications[0][key] = ' ';
      expect(c.valid).toBe(false);
      c.medications[0][key] = old;
    }
    expect(MEDICATION_FIELDS.some((f) => f.key === 'brandName' || f.key === 'quantity')).toBe(
      false,
    );
  });
  it('submits the four-field prescription without requiring concentration, presentation or route', async () => {
    const { c, api } = setup();
    await c.load();
    c.medications = [
      {
        genericName: 'Medicamento dictado',
        dose: 'Una tableta',
        frequency: 'Cada ocho horas',
        duration: 'Tres días',
      },
    ];
    c.acknowledged = true;
    c.generalAcknowledged = true;
    c.document = { nativeElement: { querySelector: () => ({}) } } as any;
    vi.spyOn(c as any, 'waitForQr').mockResolvedValue(undefined);
    await c.save();
    expect(api.post).toHaveBeenCalledWith(
      API_URLS.ISSUE_PRESCRIPTION,
      expect.objectContaining({
        medications: [
          {
            genericName: 'Medicamento dictado',
            dose: 'Una tableta',
            frequency: 'Cada ocho horas',
            duration: 'Tres días',
          },
        ],
      }),
    );
  });
});
