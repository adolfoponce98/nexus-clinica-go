import { TestBed } from '@angular/core/testing';
import { PatientIdentificationComponent } from './patient-identification.component';
import { PermissionService } from '../../auth/permission.service';
import { AppointmentContextService } from '../../appointments/appointment-context.service';
function setup(clinical = true) {
  TestBed.configureTestingModule({
    imports: [PatientIdentificationComponent],
    providers: [
      {
        provide: PermissionService,
        useValue: { can: (module: string) => (module === 'records' ? clinical : true) },
      },
      { provide: AppointmentContextService, useValue: { identificationPrefill: () => null } },
    ],
  });
  const fixture = TestBed.createComponent(PatientIdentificationComponent);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance };
}
function personal(c: PatientIdentificationComponent) {
  c.patientForm.patchValue({
    firstName: 'Paciente',
    paternalSurname: 'Prueba',
    birthDate: '1990-01-01',
    gender: 'Femenino',
    streetAndNumber: 'Domicilio de prueba',
  });
}
describe('Personal identification without duplicated clinical history', () => {
  it('keeps measurements exclusively in the fifth tab and removes the duplicated clinical form', () => {
    const { fixture, c } = setup();
    expect(c.sectionCount).toBe(5);
    expect(fixture.nativeElement.querySelector('app-clinical-core')).toBeNull();
    expect(fixture.nativeElement.querySelector('#vital-weight')).toBeNull();
    c.activeSubTab.set(4);
    fixture.detectChanges();
    c.nextSubTab();
    fixture.detectChanges();
    expect(c.activeSubTab()).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('input[type=number]').length).toBe(7);
    expect(fixture.nativeElement.textContent).not.toContain('Identificación con catálogos DGIS');
    expect(fixture.nativeElement.textContent).not.toContain('Medicamentos y procedimientos');
  });
  it('preserves original answers and measurements across tabs and sends the existing history as the clinical draft', () => {
    const { fixture, c } = setup();
    personal(c);
    c.patientForm.patchValue({
      familyBackground: { diabetes: true },
      familyBackgroundDetails: 'Madre',
      pathologicalBackground: { allergy: true },
      allergyDetails: 'Reacción de prueba',
      priorTreatments: 'Tratamiento previo informado',
      nonPathologicalBackground: { immunizations: true },
      housing: 'Vivienda de prueba',
      vitals: { weight: 70, heightCm: 175 },
    });
    c.activeSubTab.set(5);
    fixture.detectChanges();
    c.prevSubTab();
    fixture.detectChanges();
    const saved = vi.fn();
    c.savePatientData.subscribe(saved);
    c.onSubmit();
    const value = saved.mock.calls[0][0];
    expect(value.familyBackground.diabetes).toBe(true);
    expect(value.clinicalCore.familyHistory).toContain('Diabetes');
    expect(value.clinicalCore.familyHistory).toContain('Madre');
    expect(value.clinicalCore.pathologicalHistory).toContain('Reacción de prueba');
    expect(value.clinicalCore.nonPathologicalHistory).toContain('Vivienda de prueba');
    expect(value.clinicalCore.vitals).toEqual({ weight: 70, heightCm: 175, bmi: 22.86 });
    expect(value.clinicalCore.vitals.temperature).toBeUndefined();
  });
  it('does not invent negative clinical history from unchecked boxes', () => {
    const { c } = setup();
    personal(c);
    const saved = vi.fn();
    c.savePatientData.subscribe(saved);
    c.onSubmit();
    expect(saved.mock.calls[0][0].clinicalCore.familyHistory).toBe('');
    expect(saved.mock.calls[0][0].clinicalCore.vitals).toEqual({});
  });
  it('keeps administrative registration limited to personal identification', () => {
    const { c } = setup(false);
    personal(c);
    expect(c.sectionCount).toBe(1);
    c.nextSubTab();
    expect(c.activeSubTab()).toBe(1);
    const saved = vi.fn();
    c.savePatientData.subscribe(saved);
    c.onSubmit();
    expect(saved.mock.calls[0][0].clinicalCore).toBeUndefined();
  });
});

describe('Patient registration validation and Mexico selectors', () => {
  it('saves with only the three fields marked required and leaves all optional sections empty', () => {
    const { c } = setup();
    c.patientForm.patchValue({
      firstName: 'Ana',
      paternalSurname: 'Prueba',
      birthDate: '1990-01-01',
    });
    const saved = vi.fn();
    c.savePatientData.subscribe(saved);
    c.onSubmit();
    expect(saved).toHaveBeenCalledTimes(1);
    expect(saved.mock.calls[0][0].gender).toBe('');
    expect(saved.mock.calls[0][0].streetAndNumber).toBe('');
    expect(saved.mock.calls[0][0].clinicalCore.vitals).toEqual({});
  });
  it('lists the actual missing fields in a dialog and can navigate to a measurement error', () => {
    const { c, fixture } = setup();
    const dialog = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    c.patientForm.patchValue({ firstName: '   ', vitals: { weight: 900 } });
    c.onSubmit();
    expect(c.issues().map((v) => v.key)).toEqual([
      'firstName',
      'paternalSurname',
      'birthDate',
      'vitals.weight',
    ]);
    expect(dialog.showModal).toHaveBeenCalled();
    c.goToIssue(c.issues()[3]);
    expect(c.activeSubTab()).toBe(5);
    expect(dialog.close).toHaveBeenCalled();
  });
  it('validates optional contact data only when provided, without demanding the other optional fields', () => {
    const { c, fixture } = setup();
    fixture.nativeElement.querySelector('dialog').showModal = vi.fn();
    c.patientForm.patchValue({
      firstName: 'Ana',
      paternalSurname: 'Prueba',
      birthDate: '1990-01-01',
      email: 'bad',
      homePhone: '123',
    });
    c.onSubmit();
    expect(c.issues().map((v) => v.key)).toEqual(['homePhone', 'email']);
    expect(c.issues().some((v) => v.label === 'Sexo')).toBe(false);
  });
  it('offers only Mexico and 32 distinct states after choosing it', () => {
    const { c, fixture } = setup();
    expect(c.states.length).toBe(32);
    expect(new Set(c.states).size).toBe(32);
    const country = fixture.nativeElement.querySelector('#patient-country');
    expect([...country.options].map((o: any) => o.value).filter(Boolean)).toEqual(['México']);
    const state = fixture.nativeElement.querySelector('#patient-state');
    expect(state.disabled).toBe(true);
    c.patientForm.get('country')!.setValue('México');
    fixture.detectChanges();
    expect(state.disabled).toBe(false);
    expect([...state.options].map((o: any) => o.value).filter(Boolean)).toHaveLength(32);
  });
  it('rejects invalid and future birth dates and updates age from the visible date control', () => {
    const { c } = setup();
    const date = c.patientForm.get('birthDate')!;
    date.setValue('2026-02-31');
    expect(date.invalid).toBe(true);
    date.setValue('2999-01-01');
    expect(date.invalid).toBe(true);
    date.setValue('1990-01-01');
    expect(date.valid).toBe(true);
    expect(Number(c.patientForm.get('age')!.value)).toBeGreaterThan(20);
    date.setValue('');
    expect(c.patientForm.get('age')!.value).toBe('');
  });
  it('offers Mexico occupation and religion selectors with an explicit Otros option and saves their labels', () => {
    const { c, fixture } = setup();
    personal(c);
    for (const [key, selected] of [
      ['occupation', 'Médico(a)'],
      ['religion', 'Sin religión'],
    ]) {
      const select = fixture.nativeElement.querySelector('#patient-' + key) as HTMLSelectElement;
      expect(select.tagName).toBe('SELECT');
      expect(Array.from(select.options).some((option) => option.value === 'Otros')).toBe(true);
      select.value = selected;
      select.dispatchEvent(new Event('change'));
    }
    const saved = vi.fn();
    c.savePatientData.subscribe(saved);
    c.onSubmit();
    expect(saved.mock.calls[0][0].occupation).toBe('Médico(a)');
    expect(saved.mock.calls[0][0].religion).toBe('Sin religión');
  });
  it('restricts both telephone fields to ten digits and keeps missing or incomplete numbers correctly validated', () => {
    const { c, fixture } = setup();
    for (const key of ['cellphone', 'homePhone']) {
      const input = fixture.nativeElement.querySelector('#patient-' + key) as HTMLInputElement;
      expect(input.maxLength).toBe(10);
      expect(input.inputMode).toBe('numeric');
      input.value = '331234567890ab';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('3312345678');
      expect(c.patientForm.get(key)!.value).toBe('3312345678');
      c.patientForm.get(key)!.setValue('123');
      expect(c.patientForm.get(key)!.invalid).toBe(true);
      c.patientForm.get(key)!.setValue('');
      expect(c.patientForm.get(key)!.valid).toBe(true);
    }
  });
  it('pastes formatted phone numbers as ten digits', () => {
    const { c, fixture } = setup();
    const input = fixture.nativeElement.querySelector('#patient-cellphone') as HTMLInputElement;
    const preventDefault = vi.fn();
    c.pastePhone('cellphone', {
      target: input,
      clipboardData: { getData: () => '(33) 1234-5678' },
      preventDefault,
    } as any);
    expect(preventDefault).toHaveBeenCalled();
    expect(c.patientForm.get('cellphone')!.value).toBe('3312345678');
  });
});
