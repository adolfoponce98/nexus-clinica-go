export const HEREDITARY_OPTIONS = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'asthma', label: 'Asma' },
  { key: 'hypertension', label: 'Hipertensión' },
  { key: 'cancer', label: 'Cáncer' },
  { key: 'heartDisease', label: 'Cardiopatía' },
  { key: 'mentalIllness', label: 'Enfermedad Mental' },
  { key: 'allergies', label: 'Alergias' },
  { key: 'endocrine', label: 'Endocrinas' },
  { key: 'liverDisease', label: 'Hepatopatía' },
];
export const PATHOLOGICAL_OPTIONS = [
  { key: 'surgery', label: 'Cirugía' },
  { key: 'hospitalization', label: 'Hospitalización' },
  { key: 'trauma', label: 'Trauma' },
  { key: 'allergy', label: 'Alergia' },
  { key: 'transfusion', label: 'Transfusión' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'endocrine', label: 'Endocrinas' },
  { key: 'hypertension', label: 'Hipertensión' },
  { key: 'heartDisease', label: 'Cardiopatía' },
  { key: 'cancer', label: 'Cáncer' },
];
export const NON_PATHOLOGICAL_OPTIONS = [
  { key: 'smoking', label: 'Tabaquismo' },
  { key: 'alcoholism', label: 'Alcoholismo' },
  { key: 'toxicomania', label: 'Toxicomanías' },
  { key: 'immunizations', label: 'Inmunizaciones' },
  { key: 'ivsa', label: 'IVSA' },
];
export interface IntakeField {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  pattern?: string;
  maxLength?: number;
}
export const PERSONAL_FIELDS: IntakeField[] = [
  { key: 'firstName', label: 'Nombre(s)', required: true },
  { key: 'paternalSurname', label: 'Apellido paterno', required: true },
  { key: 'maternalSurname', label: 'Apellido materno' },
  { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true },
  {
    key: 'gender',
    label: 'Sexo',
    type: 'select',
    required: true,
    options: ['Masculino', 'Femenino', 'Otro'],
  },
  { key: 'curp', label: 'CURP (opcional)', maxLength: 18, pattern: '[A-Za-z0-9]{18}' },
  {
    key: 'cellphone',
    label: 'Celular (10 dígitos)',
    type: 'tel',
    pattern: '[0-9]{10}',
    maxLength: 10,
  },
  {
    key: 'homePhone',
    label: 'Teléfono de casa (10 dígitos)',
    type: 'tel',
    pattern: '[0-9]{10}',
    maxLength: 10,
  },
  { key: 'email', label: 'Correo electrónico', type: 'email' },
  {
    key: 'maritalStatus',
    label: 'Estado civil',
    type: 'select',
    options: ['Soltero(a)', 'Casado(a)', 'Divorciado(a)', 'Viudo(a)', 'Unión libre'],
  },
  {
    key: 'educationLevel',
    label: 'Escolaridad',
    type: 'select',
    options: ['Primaria', 'Secundaria', 'Bachillerato', 'Licenciatura', 'Posgrado', 'Ninguna'],
  },
  { key: 'religion', label: 'Religión' },
  { key: 'occupation', label: 'Ocupación' },
  { key: 'additionalNote', label: 'Observaciones generales', type: 'textarea' },
];
export const ADDRESS_FIELDS: IntakeField[] = [
  { key: 'streetAndNumber', label: 'Calle y número', required: true },
  { key: 'neighborhood', label: 'Colonia' },
  { key: 'municipality', label: 'Municipio / alcaldía' },
  { key: 'state', label: 'Estado' },
  { key: 'country', label: 'País' },
];
