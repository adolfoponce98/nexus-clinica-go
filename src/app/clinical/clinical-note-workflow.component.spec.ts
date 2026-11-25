import { ClinicalNotePdfService } from './clinical-note-pdf.service';
import { TestBed } from '@angular/core/testing';
import { ClinicalNoteWorkflowComponent } from './clinical-note-workflow.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
describe('Clinical saved-version signing', () => {
  it('signs only the reviewed server revision and keeps the draft when validation fails', async () => {
    const api = {
      branchId: () => 'office',
      post: vi
        .fn()
        .mockResolvedValueOnce({
          followUp: {
            state: 'DRAFT',
            revision: 7,
            numeroDeConsulta: 'EXP-C-001',
            medicalSummary: 'Resumen médico',
          },
        })
        .mockRejectedValueOnce(new Error('El borrador cambió')),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ClinicApiService, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new ClinicalNoteWorkflowComponent());
    component.patientId = 'patient';
    component.expedienteId = 'record';
    component.followUpId = 'note';
    await component.review();
    component.acknowledged = true;
    await component.finalize();
    expect(api.post.mock.calls[1]).toEqual([
      API_URLS.FINALIZE_CLINICAL_NOTE,
      {
        idConsultorio: 'office',
        idPatient: 'patient',
        expedienteId: 'record',
        followUpId: 'note',
        expectedRevision: 7,
        signatureAcknowledged: true,
      },
    ]);
    expect(component.note().state).toBe('DRAFT');
    expect(component.error()).toBe('El borrador cambió');
    expect(component.busy()).toBe(false);
  });
  it('exports the authorized server version through the designed PDF renderer', async () => {
    const note = {
      state: 'LOCKED',
      numeroDeConsulta: 'EXP-C-001',
      medicalSummary: 'Versión firmada',
    };
    const api = {
      branchId: () => 'office',
      post: vi.fn().mockResolvedValue({ note, draft: false, integrityHash: 'hash-original' }),
    };
    const pdf = { generate: vi.fn().mockRejectedValue(new Error('Firma no disponible')) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ClinicApiService, useValue: api },
        { provide: ClinicalNotePdfService, useValue: pdf },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new ClinicalNoteWorkflowComponent());
    component.patientId = 'patient';
    component.expedienteId = 'record';
    component.followUpId = 'note';
    await component.exportPDF();
    expect(api.post).toHaveBeenCalledWith(API_URLS.EXPORT_CLINICAL_DOCUMENT, {
      idConsultorio: 'office',
      idPatient: 'patient',
      expedienteId: 'record',
      followUpId: 'note',
      format: 'PDF',
    });
    expect(pdf.generate).toHaveBeenCalledWith(note, {
      draft: false,
      integrityHash: 'hash-original',
    });
    expect(component.busy()).toBe(false);
    expect(component.error()).toBe('Firma no disponible');
  });
});
