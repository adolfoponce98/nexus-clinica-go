import {
  ageYears,
  bmi,
  resolveFollowupSpecialty,
  clinicalDate,
  gestation,
  energyRequirements,
  scaleScore,
  emptySpecialty,
  mergeExtracted,
  normalizeSpecialty,
  legacySpecialtyData,
  decodeContextId,
  encodeContextId,
} from './followup-utils';
import { lmsValue, lmsZ, percentile, interpolateLms } from './growth-reference';
import { SPECIALTY_SCHEMAS } from './specialty-schemas';
describe('Shared and specialty follow-up data', () => {
  it('has all nine requested specialties and existing ophthalmology without shared-key collisions', () => {
    expect(Object.keys(SPECIALTY_SCHEMAS)).toHaveLength(10);
    for (const code of [
      'GEN',
      'GINE',
      'PED',
      'TRAUM',
      'DER',
      'DENT',
      'NUT',
      'PSI',
      'FIS',
      'OFTA',
    ]) {
      const schema = SPECIALTY_SCHEMAS[code],
        keys = [...schema.groups.flatMap((g: any) => g.fields), ...schema.extraFields].map(
          (f: any) => f.key,
        );
      expect(new Set(keys).size).toBe(keys.length);
      expect(Object.keys(emptySpecialty(code))).toEqual(keys);
    }
  });
  it('keeps absent measurements, checklists and scale responses unknown instead of making medical assumptions', () => {
    expect(emptySpecialty('PED').bilateralEdema).toBeNull();
    expect(emptySpecialty('TRAUM').painEva).toBeNull();
    expect(emptySpecialty('PSI').phq9).toEqual(Array(9).fill(null));
  });
  it('fills blank fields and score answers without overwriting clinician entries unless explicitly selected', () => {
    const current = {
      chiefComplaint: 'Capturado',
      vitals: { weight: 65, heightCm: null },
      phq9: [0, null, null, null, null, null, null, null, null],
    };
    const patch = {
      chiefComplaint: 'Dictado',
      vitals: { weight: 70, heightCm: 170 },
      phq9: [2, 1, null, null, null, null, null, null, null],
    };
    const merged = mergeExtracted(current, patch);
    expect(merged.chiefComplaint).toBe('Capturado');
    expect(merged.vitals).toEqual({ weight: 65, heightCm: 170 });
    expect(merged.phq9.slice(0, 2)).toEqual([0, 1]);
    expect(mergeExtracted(current, patch, true).chiefComplaint).toBe('Dictado');
    expect(current.vitals.heightCm).toBeNull();
  });
  it('calculates pregnancy dates and rejects future or implausible FUM', () => {
    expect(gestation('2026-01-01', new Date('2026-01-15T12:00:00Z'))).toEqual({
      weeks: 2,
      days: 0,
      dueDate: '2026-10-08',
    });
    expect(gestation('2027-01-01', new Date('2026-01-15T12:00:00Z'))).toBeNull();
  });
  it('calculates BMI and adult energy requirements without applying adult equations to children', () => {
    expect(bmi(70, 175)).toBe(22.86);
    const d = {
      energyEquation: 'Mifflin-St Jeor',
      equationSex: 'Masculino',
      activityFactor: 1.2,
      targetCalories: 2000,
      proteinPercent: 20,
      carbohydratePercent: 50,
      fatPercent: 30,
    };
    const n = energyRequirements(d, { weight: 70, heightCm: 175 }, 30)!;
    expect(n.basal).toBe(1649);
    expect(n.proteinGrams).toBe(100);
    expect(n.carbohydrateGrams).toBe(250);
    expect(n.fatGrams).toBe(67);
    expect(energyRequirements(d, { weight: 30, heightCm: 130 }, 10)).toBeNull();
  });
  it('scores only completed PHQ/GAD responses and preserves a legitimate zero', () => {
    expect(scaleScore([0, 0, 0, 0, 0, 0, 0], 7)).toBe(0);
    expect(scaleScore([1, 1, 1, 1, 1, 1, 1], 7)).toBe(7);
    expect(scaleScore([null, 0, 0, 0, 0, 0, 0], 7)).toBeNull();
  });
  it('uses WHO LMS medians, interpolates only within supported ages and extends z outside three SD', () => {
    const row: [number, number, number, number] = [0, 0.3809, 3.2322, 0.14171];
    expect(lmsZ(row, 3.2322)).toBeCloseTo(0, 8);
    expect(percentile(0)).toBeCloseTo(50, 5);
    expect(lmsZ(row, lmsValue(row, 2))).toBeCloseTo(2, 7);
    const plus4 = lmsValue(row, 3) + (lmsValue(row, 3) - lmsValue(row, 2));
    expect(lmsZ(row, plus4)).toBeCloseTo(4, 7);
    expect(interpolateLms([row, [1, 0.3, 3.3, 0.14]], 2)).toBeNull();
    expect(interpolateLms([row, [1, 0.3, 3.3, 0.14]], 0.5)?.[2]).toBeCloseTo(3.2661, 4);
  });
  it('uses the clinic calendar day and rejects invalid dates', () => {
    expect(clinicalDate(new Date('2026-11-21T01:00:00Z'))).toBe('2026-11-20');
    expect(ageYears('2000-11-21', new Date('2026-11-21T01:00:00Z'))).toBe(25);
    expect(ageYears('2026-02-31')).toBeNull();
    expect(gestation('2026-02-31')).toBeNull();
  });
  it('uses the updated clinical identity specialty and falls back to session for other specialties', () => {
    expect(resolveFollowupSpecialty({ especialidades: ['GEN'] }, { specialty: 'Nutrición' })).toBe(
      'NUT',
    );
    expect(
      resolveFollowupSpecialty({ especialidades: ['TRAUM'] }, { specialty: 'Otra especialidad' }),
    ).toBe('TRAUM');
    expect(
      resolveFollowupSpecialty({ especialidades: ['DENT'] }, { specialty: 'Medicina General' }),
    ).toBe('GEN');
  });
  it('preserves legacy dental and trauma descriptions and encrypted route IDs', () => {
    expect(
      legacySpecialtyData({
        especialidad: 'odontologia',
        physicalExamination: { gingivalAndPeriodontalState: 'Hallazgo' },
      }).gingivalState,
    ).toBe('Hallazgo');
    expect(
      legacySpecialtyData({
        especialidad: 'traumatologia',
        physicalExamination: { rangeOfMotion: 'ROM' },
      }).rangeOfMotion,
    ).toBe('ROM');
    expect(normalizeSpecialty('Oftamología')).toBe('OFTA');
    expect(decodeContextId(encodeContextId('patient-id'))).toBe('patient-id');
    expect(decodeContextId('patient-id')).toBe('patient-id');
    expect(ageYears('2000-11-20', new Date('2026-11-19T12:00:00Z'))).toBe(25);
  });
});
