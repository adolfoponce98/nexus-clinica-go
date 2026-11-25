/** Read both current registration blocks and legacy patient records without changing stored data. */
export function patientDetailFields(patient: any) {
  const ficha = patient.fichaDeIdentificacion || {};
  const general = patient.generalIdentificationData || {};
  const core = patient.clinicalCoreDraft || {};
  const legacy = patient.antecedentes || {};
  const text = (value: any): string => {
    if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
    if (value === null || value === undefined || typeof value === 'object') return '';
    const result = String(value).trim();
    return result === '-' ? '' : result;
  };
  const first = (...values: any[]) => values.map(text).find(Boolean) || '';
  const join = (...values: any[]) => values.map(text).filter(Boolean).join('. ');
  const selections = (block: any, labels: Record<string, string>) =>
    Object.entries(labels)
      .filter(([key]) => block?.selections?.[key] === true)
      .map(([, label]) => label)
      .join(', ');
  const pathological = patient.pathologicalBackground || {};
  const habits = patient.nonPathologicalBackground || {};
  const family = patient.hereditaryFamilyBackground || {};
  return {
    pathologicalHistory:
      first(
        core.pathologicalHistory,
        join(
          selections(pathological, {
            surgery: 'Cirugías',
            hospitalization: 'Hospitalizaciones',
            trauma: 'Traumatismos',
            allergy: 'Alergias',
            transfusion: 'Transfusiones',
            diabetes: 'Diabetes',
            endocrine: 'Enfermedades endocrinas',
            hypertension: 'Hipertensión',
            heartDisease: 'Cardiopatías',
            cancer: 'Cáncer',
          }),
          pathological.otherConditions,
        ),
        join(
          text(ficha.alergias) ? 'Alergias: ' + text(ficha.alergias) : '',
          legacy.antecedentesTraumaticos,
          legacy.enfermedadesCronicas,
        ),
      ) || 'No registrado',
    familyHistory:
      first(
        core.familyHistory,
        join(
          selections(family, {
            diabetes: 'Diabetes',
            asthma: 'Asma',
            hypertension: 'Hipertensión',
            cancer: 'Cáncer',
            heartDisease: 'Cardiopatías',
            mentalIllness: 'Enfermedades mentales',
            allergies: 'Alergias',
            endocrine: 'Enfermedades endocrinas',
            liverDisease: 'Enfermedades hepáticas',
          }),
          family.otherDiseases,
        ),
      ) || 'No registrado',
    occupation: first(ficha.ocupacion, general.occupation, general.ocupacion) || 'No registrado',
    sport:
      first(
        ficha.actividadDeportiva,
        general.physicalActivity,
        habits.physicalActivity,
        patient.physicalActivity,
      ) || 'No registrado',
    lifestyle:
      first(
        core.nonPathologicalHistory,
        join(
          selections(habits, {
            smoking: 'Tabaquismo',
            alcoholism: 'Consumo de alcohol',
            toxicomania: 'Toxicomanías',
            immunizations: 'Inmunizaciones',
            ivsa: 'Vida sexual activa',
          }),
          habits.otherHabits,
        ),
        legacy.habitos,
        patient.habitos,
      ) || 'No registrado',
    address:
      first(
        join(ficha.calleNumero, ficha.coloniaCiudad),
        join(
          general.streetAndNumber,
          general.neighborhood,
          general.municipality,
          general.state,
          general.country,
        ),
        ficha.domicilio,
      ) || 'Sin dirección',
  };
}
