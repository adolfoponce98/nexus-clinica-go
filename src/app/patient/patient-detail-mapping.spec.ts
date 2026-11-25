import { patientDetailFields } from './patient-detail-mapping';

describe('patient detail mapping', () => {
  it('reads the same recorded history as the consultation header and the original identification data', () => {
    const result = patientDetailFields({
      fichaDeIdentificacion: { nombreCompleto: 'Paciente', domicilio: 'Calle 1' },
      generalIdentificationData: {
        occupation: 'Docente',
        streetAndNumber: 'Calle 1',
        municipality: 'Zapopan',
        state: 'Jalisco',
      },
      clinicalCoreDraft: {
        pathologicalHistory: 'Diabetes. Cirugía previa',
        nonPathologicalHistory: 'No fuma. Actividad física: caminar',
        familyHistory: 'Hipertensión materna',
      },
    });
    expect(result.pathologicalHistory).toBe('Diabetes. Cirugía previa');
    expect(result.familyHistory).toBe('Hipertensión materna');
    expect(result.lifestyle).toContain('Actividad física: caminar');
    expect(result.occupation).toBe('Docente');
    expect(result.address).toBe('Calle 1. Zapopan. Jalisco');
  });
  it('supports selected registration backgrounds when no clinical core was stored', () => {
    const result = patientDetailFields({
      pathologicalBackground: {
        selections: { diabetes: true, surgery: false },
        otherConditions: 'Asma',
      },
      nonPathologicalBackground: {
        selections: { smoking: true, alcoholism: false },
        otherHabits: '-',
      },
      generalIdentificationData: { occupation: '-' },
    });
    expect(result.pathologicalHistory).toBe('Diabetes. Asma');
    expect(result.lifestyle).toBe('Tabaquismo');
    expect(result.occupation).toBe('No registrado');
  });
  it('keeps legacy values and accepts allergies stored as text or an array without inventing absence', () => {
    expect(
      patientDetailFields({
        fichaDeIdentificacion: {
          alergias: 'Penicilina',
          ocupacion: 'Médico',
          actividadDeportiva: 'Natación',
        },
        antecedentes: { habitos: 'No fuma' },
      }),
    ).toMatchObject({
      pathologicalHistory: 'Alergias: Penicilina',
      occupation: 'Médico',
      lifestyle: 'No fuma',
      sport: 'Natación',
    });
    expect(
      patientDetailFields({ fichaDeIdentificacion: { alergias: ['Polen'] } }).pathologicalHistory,
    ).toBe('Alergias: Polen');
    expect(patientDetailFields({}).pathologicalHistory).toBe('No registrado');
  });
});
