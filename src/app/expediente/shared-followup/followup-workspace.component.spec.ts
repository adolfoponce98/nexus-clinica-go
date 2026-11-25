import { BillingService } from '../../planes/billing.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { FollowupWorkspaceComponent } from './followup-workspace.component';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { AuthService } from '../../auth/auth.service';
import { PermissionService } from '../../auth/permission.service';
import { AppointmentContextService } from '../../appointments/appointment-context.service';
import { PrescriptionComposerService } from '../../recipes/prescription-composer.service';
import { API_URLS } from '../../config/api-urls';
function setup(code = 'GEN', note: any = null) {
  const route = {
    snapshot: {
      paramMap: convertToParamMap({ id: 'patient-a' }),
      queryParamMap: convertToParamMap(
        note ? { followUpId: note.followUpId, expedienteId: 'record-a' } : {},
      ),
    },
    paramMap: of(convertToParamMap({ id: 'patient-a' })),
    queryParamMap: of(convertToParamMap({})),
  };
  const patient = {
    idPaciente: 'patient-a',
    expedienteId: 'record-a',
    clinicalHistoryClosedAt: '2026-01-01',
    fichaDeIdentificacion: { nombreCompleto: 'Paciente de prueba', alergias: [] },
  };
  const api = {
    branchId: () => 'office-a',
    post: vi.fn(
      async (url: string, p: any): Promise<any> =>
        url === API_URLS.GETPATIENTEXPEDIENT
          ? { patient }
          : url === API_URLS.GETPATIENTFOLLOWUP
            ? { followUp: note }
            : url === API_URLS.GET_PRIVATE_PSYCHOTHERAPY_NOTES
              ? { text: 'Nota privada' }
              : url === API_URLS.GENERATEMEDICALSUMMARY
                ? {
                    data: {
                      clinicalCore: { chiefComplaint: 'Del dictado' },
                      specialtyData: { mood: 'Capturado' },
                      summaryText: 'Resumen',
                    },
                  }
                : { followUpId: p.requestId, numeroDeConsulta: 'EXP-C-001' },
    ),
  };
  const permissions = { can: vi.fn(() => true) },
    closed = new Subject<any>();
  const prescriptions = { open: vi.fn(() => closed) };
  TestBed.configureTestingModule({
    imports: [FollowupWorkspaceComponent],
    providers: [
      {
        provide: BillingService,
        useValue: {
          allows: () => true,
          state: () => ({ aiCredits: 10 }),
          refresh: () => Promise.resolve(),
        },
      },
      { provide: ActivatedRoute, useValue: route },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: ClinicApiService, useValue: api },
      {
        provide: AuthService,
        useValue: {
          getSession: () => ({ email: 'doctor', typeUser: 1 }),
          getSucursal: () => ({ name: 'Clínica' }),
        },
      },
      { provide: PermissionService, useValue: permissions },
      { provide: AppointmentContextService, useValue: { current: () => null } },
      { provide: PrescriptionComposerService, useValue: prescriptions },
    ],
  });
  const fixture = TestBed.createComponent(FollowupWorkspaceComponent),
    c = fixture.componentInstance;
  c.specialtyCode = code;
  return { fixture, c, api, permissions, closed, prescriptions };
}
describe('Specialty follow-up workspace', () => {
  it('writes clinical core, specialty version, attachments and stable consultation ID', async () => {
    const { c, api } = setup('PED');
    await c.load();
    c.attachments.set([
      { id: 'f', name: 'Rx.pdf', url: 'signed', type: 'document', progress: 100, uploading: false },
    ]);
    await c.save();
    const write = api.post.mock.calls.find(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP)![1];
    expect(write.specialtyCode).toBe('PED');
    expect(write.specialtySchemaVersion).toBe(1);
    expect(write.specialtyData.vaccines).toEqual([]);
    expect(write.attachedImagesUrls).toEqual([{ name: 'Rx.pdf', url: 'signed', type: 'document' }]);
    expect(write.requestId).toBe(c.requestId);
    expect(write.privatePsychotherapyNotes).toBeUndefined();
  });
  it('never sends private psychotherapy notes to AI and stores them separately in the save payload', async () => {
    const { c, api } = setup('PSI');
    await c.load();
    c.transcript = 'Dictado oficial';
    c.privateNotes = 'Apunte privado';
    await c.extract();
    expect(api.post).toHaveBeenCalledWith(
      API_URLS.GENERATEMEDICALSUMMARY,
      expect.objectContaining({
        texto: 'Dictado oficial',
        specialtyCode: 'PSI',
        especiality: 'Psicología',
        tratementType: '',
        requestId: expect.any(String),
      }),
    );
    c.applyProposal();
    await c.save();
    const write = api.post.mock.calls.find(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP)![1];
    expect(write.privatePsychotherapyNotes).toBe('Apunte privado');
    expect(write.specialtyData.privatePsychotherapyNotes).toBeUndefined();
  });
  it('does not overwrite private notes when their protected lookup fails', async () => {
    const note = {
      followUpId: 'follow-a',
      specialtyCode: 'PSI',
      specialtySchemaVersion: 1,
      state: 'DRAFT',
      revision: 3,
      registeredBy: 'doctor',
      clinicalCore: {},
      specialtyData: {},
    };
    const { c, api } = setup('PSI', note);
    const original = api.post.getMockImplementation()!;
    api.post.mockImplementation(async (url, p) => {
      if (url === API_URLS.GET_PRIVATE_PSYCHOTHERAPY_NOTES) throw new Error('offline');
      return original(url, p);
    });
    await c.load();
    expect(c.privateNotesLoaded).toBe(false);
    await c.save();
    const write = api.post.mock.calls.find(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP)![1];
    expect(write.privatePsychotherapyNotes).toBeUndefined();
    expect(write.expectedRevision).toBe(3);
  });
  it('uses the specialty stored in a consultation instead of the current profile and blocks other-author editing', async () => {
    const { c } = setup('GEN', {
      followUpId: 'f',
      specialtyCode: 'OFTA',
      specialtySchemaVersion: 1,
      specialtyData: { acuityRight: '20/20' },
      state: 'DRAFT',
      registeredBy: 'other',
    });
    await c.load();
    expect(c.code).toBe('OFTA');
    expect(c.specialtyData.acuityRight).toBe('20/20');
    expect(c.canWrite).toBe(false);
  });
  it('keeps read-only users and closed notes from saving', async () => {
    const { c, api, permissions } = setup();
    await c.load();
    permissions.can.mockReturnValue(false);
    await c.save();
    expect(api.post.mock.calls.some(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP)).toBe(false);
    permissions.can.mockReturnValue(true);
    c.note = { state: 'LEGACY' };
    expect(c.canWrite).toBe(false);
    c.note = { state: 'LOCKED' };
    await c.save();
    expect(api.post.mock.calls.some(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP)).toBe(false);
  });
  it('clears the previous patient and blocks saving if reloading a record fails', async () => {
    const { c, api } = setup();
    await c.load();
    expect(c.canWrite).toBe(true);
    api.post.mockRejectedValue(new Error('Sin conexión'));
    await c.load();
    expect(c.patient).toEqual({});
    expect(c.canWrite).toBe(false);
  });
  it('dictates final and interim text without duplicating confirmed segments', async () => {
    class Speech {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: any;
      onend: any;
      onerror: any;
      start = vi.fn();
      stop = vi.fn();
    }
    const original = (window as any).SpeechRecognition;
    (window as any).SpeechRecognition = Speech;
    try {
      const { c } = setup();
      await c.load();
      c.initSpeech();
      c.transcript = 'Texto previo';
      c.startSpeech();
      const recognition = (c as any).recognition;
      recognition.onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'primer dato' }], { isFinal: true }),
          Object.assign([{ transcript: 'segundo' }], { isFinal: false }),
        ],
      });
      expect(c.transcript).toBe('Texto previo primer dato  segundo');
      recognition.onresult({
        resultIndex: 1,
        results: [
          Object.assign([{ transcript: 'primer dato' }], { isFinal: true }),
          Object.assign([{ transcript: 'segundo dato' }], { isFinal: true }),
        ],
      });
      expect(c.transcript).toContain('primer dato segundo dato');
      expect(c.transcript.match(/primer dato/g)).toHaveLength(1);
      c.stopSpeech();
      expect(c.recording()).toBe(false);
    } finally {
      (window as any).SpeechRecognition = original;
    }
  });
  it('uploads a 3D capture through the existing attachment flow before closing the viewer', async () => {
    const { c } = setup();
    await c.load();
    c.expanded.set(true);
    const file = new File(['image'], 'Infografia.png', { type: 'image/png' });
    let finish!: (value: boolean) => void;
    const upload = vi
      .spyOn(c, 'upload')
      .mockImplementation(() => new Promise<boolean>((resolve) => (finish = resolve)));
    const pending = c.attach3DCapture(file);
    expect(upload).toHaveBeenCalledWith(file);
    expect(c.attaching3D()).toBe(true);
    expect(c.expanded()).toBe(true);
    finish(true);
    await pending;
    expect(c.attaching3D()).toBe(false);
    expect(c.expanded()).toBe(false);
    expect(c.activeTab).toBe('consultation');
    expect(c.notice()).toContain('Archivos adjuntos');
  });
  it('keeps the 3D viewer open when its upload fails', async () => {
    const { c } = setup();
    await c.load();
    c.expanded.set(true);
    vi.spyOn(c, 'upload').mockResolvedValue(false);
    await c.attach3DCapture(new File(['image'], 'Infografia.png', { type: 'image/png' }));
    expect(c.expanded()).toBe(true);
    expect(c.attaching3D()).toBe(false);
  });
  it('allows subscribers to interpret a summary with zero credits', async () => {
    const { fixture, c, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const billing = TestBed.inject(BillingService);
    vi.spyOn(billing, 'state').mockReturnValue({ aiCredits: 0 } as any);
    c.transcript = 'Paciente refiere mejoría del dolor';
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.ai-button') as HTMLButtonElement;
    expect(button.textContent).toContain('Interpretar resumen clínico');
    expect(button.disabled).toBe(false);
    await c.extract();
    expect(api.post.mock.calls.some(([url]) => url === API_URLS.GENERATEMEDICALSUMMARY)).toBe(true);
    expect(c.proposal()).toBeTruthy();
    const clinical = fixture.nativeElement.querySelector('#followup-clinical') as HTMLElement;
    expect(clinical.querySelector('details')).toBeNull();
    expect(clinical.querySelector('.vitals-grid')).toBeTruthy();
    expect(clinical.textContent).not.toContain('Nota clínica compartida');
    expect(fixture.nativeElement.querySelector('.consultation-tabs').textContent).toContain(
      'Somatometría',
    );
  });
  it('falls back to the original image while the thumbnail is unavailable without making API calls', async () => {
    const { fixture, c, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    c.attachments.set([
      {
        id: 'image',
        name: 'Captura.png',
        type: 'image',
        url: 'https://example.test/original.png',
        smallUrl: 'https://example.test/thumbnails/original_small.png',
      },
    ]);
    fixture.detectChanges();
    const count = api.post.mock.calls.length;
    const image = fixture.nativeElement.querySelector('.attachment-card img') as HTMLImageElement;
    expect(image.src).toContain('/thumbnails/');
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(image.src).toBe('https://example.test/original.png');
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.attachment-card img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.attachment-icon')).toBeTruthy();
    expect(api.post.mock.calls.length).toBe(count);
    expect(c.attachments()[0].url).toBe('https://example.test/original.png');
  });
  it('returns uploaded prescriptions to the same draft without losing SOAP fields', async () => {
    const { c, prescriptions, closed } = setup('DENT');
    await c.load();
    c.core.chiefComplaint = 'Capturado';
    c.openPrescription();
    expect(prescriptions.open).toHaveBeenCalledWith({
      patientId: 'patient-a',
      attachToConsultation: true,
      followUpId: c.requestId,
    });
    closed.next({
      attachment: {
        name: 'Rx.pdf',
        url: 'signed',
        type: 'document',
        progress: 100,
        uploading: false,
      },
    });
    expect(c.attachments()[0].name).toBe('Rx.pdf');
    expect(c.core.chiefComplaint).toBe('Capturado');
  });
  it('separates consultation tools and specialty assessment without losing edited fields', async () => {
    const { fixture, c, api } = setup('TRAUM');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(c.activeTab).toBe('consultation');
    expect(el.querySelector('#followup-consultation')?.hasAttribute('hidden')).toBe(false);
    expect(el.querySelector('#followup-consultation .summary-section')).toBeTruthy();
    expect(el.querySelector('#followup-consultation .attachments-section')).toBeTruthy();
    expect(el.querySelector('#followup-consultation app-anatomical-map')).toBeTruthy();
    expect(el.querySelector('#followup-specialty')?.textContent).toContain(
      'Exploración musculoesquelética',
    );
    expect(el.querySelector('#followup-specialty')?.textContent).toContain(
      'Valoración prequirúrgica y plan',
    );
    expect(el.textContent).not.toContain('Identificación de la historia inicial');
    expect(el.textContent).not.toContain('Interrogatorio por aparatos y sistemas');
    const consultation = el.querySelector('#followup-consultation')!;
    const clinical = el.querySelector('#followup-clinical')!;
    expect(consultation.textContent).toContain('Subjetivo');
    expect(consultation.textContent).toContain('Plan y pronóstico');
    expect(clinical.textContent).toContain('Objetivo · somatometría y signos vitales');
    expect(clinical.textContent).not.toContain('Subjetivo');
    expect(clinical.textContent).not.toContain('Plan y pronóstico');
    expect(el.textContent).not.toContain('Análisis y diagnóstico');
    const callsBeforeTabs = api.post.mock.calls.length;
    c.medicalSummary = 'Resumen conservado';
    c.core.chiefComplaint = 'Dolor';
    c.specialtyData.rangeOfMotion = 'Limitado';
    const buttons = el.querySelectorAll<HTMLButtonElement>('.consultation-tabs button');
    buttons[2].click();
    fixture.detectChanges();
    expect(c.activeTab).toBe('specialty');
    expect(el.querySelector('#followup-consultation')?.hasAttribute('hidden')).toBe(true);
    buttons[1].click();
    fixture.detectChanges();
    buttons[0].click();
    fixture.detectChanges();
    expect(api.post.mock.calls).toHaveLength(callsBeforeTabs);
    expect(c.medicalSummary).toBe('Resumen conservado');
    expect(c.core.chiefComplaint).toBe('Dolor');
    expect(c.specialtyData.rangeOfMotion).toBe('Limitado');
    await c.save();
    const write = api.post.mock.calls.find(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP)![1];
    expect(write.medicalSummary).toBe('Resumen conservado');
    expect(write.clinicalCore.chiefComplaint).toBe('Dolor');
    expect(write.specialtyData.rangeOfMotion).toBe('Limitado');
  });
  it('shows previous history beside critical alerts as read-only information', async () => {
    const { fixture, c } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    c.patient = {
      ...c.patient,
      clinicalCoreDraft: {
        familyHistory: 'Antecedente familiar de prueba',
        priorTreatments: 'Tratamiento previo',
      },
    };
    c.core.familyHistory = 'Dato de la consulta actual';
    fixture.detectChanges();
    const context = fixture.nativeElement.querySelector('app-followup-context') as HTMLElement;
    expect(context.textContent).toContain('Antecedente familiar de prueba');
    expect(context.textContent).toContain('Tratamiento previo');
    expect(context.textContent).not.toContain('Dato de la consulta actual');
    expect(context.querySelector('input,textarea,select')).toBeNull();
    expect(context.querySelectorAll('.history-grid > .history-card').length).toBe(2);
  });

  it('saves all tabs before opening server review and never finalizes without confirmation', async () => {
    const { c, api } = setup('TRAUM');
    await c.load();
    c.core.chiefComplaint = 'Motivo';
    c.specialtyData.rangeOfMotion = 'Limitado';
    c.medicalSummary = 'Resumen';
    const workflow = { followUpId: '', review: vi.fn(async () => {}), error: () => '' };
    await c.saveAndReview(workflow as any);
    expect(workflow.review).toHaveBeenCalledOnce();
    expect(workflow.followUpId).toBe(c.savedFollowUpId());
    const write = api.post.mock.calls.find(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP)![1];
    expect(write.clinicalCore.chiefComplaint).toBe('Motivo');
    expect(write.specialtyData.rangeOfMotion).toBe('Limitado');
    expect(write.medicalSummary).toBe('Resumen');
    expect(api.post.mock.calls.some(([url]) => url === API_URLS.FINALIZE_CLINICAL_NOTE)).toBe(
      false,
    );
  });
  it('does not open a stale saved version when saving the consultation fails', async () => {
    const { c, api } = setup();
    await c.load();
    c.savedFollowUpId.set('old');
    c.medicalSummary = 'Resumen médico';
    api.post.mockRejectedValue(new Error('Sin conexión'));
    const workflow = { followUpId: 'old', review: vi.fn(), error: () => '' };
    await c.saveAndReview(workflow as any);
    expect(workflow.review).not.toHaveBeenCalled();
    expect(c.reviewing()).toBe(false);
    expect(c.error()).toBe('Sin conexión');
  });
});

describe('Automatic structured dictation mapping', () => {
  it('fills the summary, consultation, prognosis, vitals and specialty tabs as soon as AI responds, without saving', async () => {
    const { fixture, c, api } = setup('TRAUM');
    fixture.detectChanges();
    await fixture.whenStable();
    const data = {
      specialtyCode: 'TRAUM',
      summaryText:
        'Paciente con dolor de rodilla de tres días. Se indica reposo relativo. Pronóstico funcional reservado.',
      clinicalCore: {
        chiefComplaint: 'Dolor de rodilla derecha',
        evolution: 'Tres días de evolución',
        treatment: 'Reposo relativo y control en siete días',
        prognosisLife: 'Bueno',
        prognosisFunction: 'Reservado',
        vitals: { weight: 72, heightCm: 171, systolic: 120, diastolic: 80 },
      },
      specialtyData: {
        rangeOfMotion: 'Flexión limitada por dolor',
        painEva: 6,
        distalNeurovascular: 'Pulsos distales presentes',
      },
    };
    const original = api.post.getMockImplementation()!;
    api.post.mockImplementation(async (url, payload) =>
      url === API_URLS.GENERATEMEDICALSUMMARY ? { data } : original(url, payload),
    );
    c.core.chiefComplaint = 'Sin definir';
    c.transcript = 'Dictado de la consulta';
    await c.extract();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(c.medicalSummary).toBe(data.summaryText);
    expect(c.core).toMatchObject(data.clinicalCore);
    expect(c.specialtyData).toMatchObject(data.specialtyData);
    const root = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(
        root.querySelectorAll<HTMLTextAreaElement>('#followup-consultation textarea'),
      ).some((el) => el.value === data.clinicalCore.treatment),
    ).toBe(true);
    expect(
      Array.from(root.querySelectorAll<HTMLSelectElement>('#followup-consultation select')).some(
        (el) => el.value === 'Reservado',
      ),
    ).toBe(true);
    expect(
      Array.from(root.querySelectorAll<HTMLInputElement>('#followup-clinical input')).some(
        (el) => el.value === '72',
      ),
    ).toBe(true);
    expect(
      Array.from(root.querySelectorAll<HTMLTextAreaElement>('#followup-specialty textarea')).some(
        (el) => el.value === 'Flexión limitada por dolor',
      ),
    ).toBe(true);
    expect(
      api.post.mock.calls.filter(([url]) => url === API_URLS.SAVEPATIENTFOLLOWUP),
    ).toHaveLength(0);
  });
  it('preserves clinician text while completing other fields and allows explicit replacement after review', async () => {
    const { c, api } = setup('PSI');
    await c.load();
    c.core.chiefComplaint = 'Motivo capturado manualmente';
    c.transcript = 'Dictado de evolución';
    await c.extract();
    expect(c.medicalSummary).toBe('Resumen');
    expect(c.core.chiefComplaint).toBe('Motivo capturado manualmente');
    expect(c.specialtyData.mood).toBe('Capturado');
    expect(c.proposal()).toBeTruthy();
    c.replaceWithAi = true;
    c.applyProposal();
    expect(c.core.chiefComplaint).toBe('Del dictado');
    expect(c.proposal()).toBeNull();
  });
  it('does not apply a different specialty or an empty generated summary', async () => {
    const { c, api } = setup('TRAUM');
    await c.load();
    const original = api.post.getMockImplementation()!;
    let data: any = {
      specialtyCode: 'PED',
      summaryText: 'Resumen de otra especialidad',
      clinicalCore: { treatment: 'No aplicar' },
    };
    api.post.mockImplementation(async (url, payload) =>
      url === API_URLS.GENERATEMEDICALSUMMARY ? { data } : original(url, payload),
    );
    c.transcript = 'Dictado';
    await c.extract();
    expect(c.medicalSummary).toBe('');
    expect(c.core.treatment).toBe('');
    expect(c.error()).toContain('especialidad');
    data = { summaryText: '', clinicalCore: { treatment: 'No aplicar' } };
    await c.extract();
    expect(c.core.treatment).toBe('');
    expect(c.error()).toContain('resumen clínico válido');
  });
});

describe('Consultation layout and persistent actions', () => {
  it('prioritizes the summary and dictation and keeps a single save action accessible across tabs', async () => {
    const { fixture, c } = setup('TRAUM');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const consultation = root.querySelector('#followup-consultation')!;
    expect(consultation.firstElementChild?.classList.contains('summary-section')).toBe(true);
    expect(
      root
        .querySelector('.followup-tools')
        ?.firstElementChild?.classList.contains('dictation-card'),
    ).toBe(true);
    expect(root.querySelector('.followup-tools .model-card')).toBeTruthy();
    const actions = root.querySelector('[aria-label="Acciones de la consulta"]')!;
    expect(actions.querySelectorAll('.floating-save')).toHaveLength(1);
    expect(actions.textContent).toContain('Guardar consulta');
    expect(actions.textContent).toContain('Expedir receta');
    expect(actions.textContent).toContain('Dictar nota');
    const tabs = root.querySelectorAll<HTMLButtonElement>('.consultation-tabs button');
    tabs[1].click();
    fixture.detectChanges();
    expect(root.querySelector('.followup-floating .floating-save')).toBeTruthy();
    tabs[2].click();
    fixture.detectChanges();
    expect(root.querySelector('.followup-floating .floating-save')).toBeTruthy();
    const save = vi.spyOn(c, 'saveAndReview').mockImplementation(async () => {});
    (root.querySelector('.followup-floating .floating-save') as HTMLButtonElement).click();
    expect(save).toHaveBeenCalledWith(expect.anything());
    const history = root.querySelector('details.history-disclosure') as HTMLDetailsElement;
    expect(history.open).toBe(false);
    expect(root.querySelector('.history-card.critical')?.textContent).toContain('Alergias');
  });
});
