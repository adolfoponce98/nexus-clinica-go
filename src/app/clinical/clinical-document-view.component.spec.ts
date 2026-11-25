import { TestBed } from '@angular/core/testing';
import { ClinicalDocumentViewComponent } from './clinical-document-view.component';
describe('Clinical document reading view', () => {
  it('renders clinical content, specialty tables and signatures without form controls', () => {
    const fixture = TestBed.createComponent(ClinicalDocumentViewComponent);
    fixture.componentInstance.note = {
      state: 'DRAFT',
      specialtyCode: 'TRAUM',
      specialtySchemaVersion: 1,
      numeroDeConsulta: 'EXP-C-001',
      createdAt: '2026-11-22T10:00:00Z',
      header: {
        patient: { fullName: 'Paciente de prueba', age: 0 },
        author: { fullName: 'Doctora de prueba' },
        office: { name: 'Consultorio de prueba' },
      },
      clinicalCore: {
        chiefComplaint: 'Dolor de prueba',
        vitals: { temperature: 36.5 },
        diagnoses: [{ code: 'Z00', description: 'Diagnóstico de prueba' }],
        specialDocument: {
          reason: 'Motivo del documento',
          patientSignature: 'data:image/png;base64,AAAA',
        },
      },
      specialtyData: {
        painEva: 0,
        rangeOfMotion: 'Movilidad conservada',
        bodyMarks: [
          {
            view: 'Anterior',
            zone: 'Rodilla',
            kind: 'Dolor',
            x: 10,
            y: 20,
            notes: 'Descripción del hallazgo',
          },
        ],
      },
      medicalSummary: 'Resumen clínico de prueba',
    };
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(
      el.querySelector('input,select,textarea,app-specialty-fields,app-signature-pad'),
    ).toBeNull();
    expect(el.textContent).toContain('Dolor de prueba');
    expect(el.textContent).toContain('Movilidad conservada');
    expect(el.textContent).toContain('Resumen clínico de prueba');
    expect(el.textContent).toContain('Descripción del hallazgo');
    expect(el.querySelector('table')?.textContent).toContain('Rodilla');
    expect(el.querySelector('img')?.alt).toBe('Firma del paciente');
    expect(el.textContent).toContain('Pendiente de firma');
  });
  it('preserves false and zero values and identifies missing specialty fields', () => {
    const fixture = TestBed.createComponent(ClinicalDocumentViewComponent),
      c = fixture.componentInstance;
    c.note = {
      specialtyCode: 'TRAUM',
      specialtySchemaVersion: 1,
      specialtyData: { painEva: 0 },
      clinicalCore: { vitals: {} },
    };
    fixture.detectChanges();
    expect(c.present(false)).toBe(true);
    expect(c.present(0)).toBe(true);
    expect(c.present({ nested: [] })).toBe(false);
    expect(c.specialtySections.length).toBeGreaterThan(1);
    expect(
      c.specialtySections.some((group) =>
        group.fields.some((field: any) => field.key === 'painEva'),
      ),
    ).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No registrado');
  });
});
