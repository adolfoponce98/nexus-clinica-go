export interface Specialty {
  code: string;
  name: string;
}

export const SPECIALTIES_CATALOG: Specialty[] = [
  { code: 'GEN', name: 'Medicina General' },
  { code: 'PED', name: 'Pediatría' },
  { code: 'CAR', name: 'Cardiología' },
  { code: 'DER', name: 'Dermatología' },
  { code: 'GINE', name: 'Ginecología y Obstetricia' },
  { code: 'TRAUM', name: 'Traumatología y Ortopedia' },
    { code: 'DENT', name: 'Dentista' },
];

// Objeto de mapeo rápido para traducciones O(1)
export const SPECIALTY_MAP: Record<string, string> = SPECIALTIES_CATALOG.reduce(
  (acc, curr) => ({ ...acc, [curr.code]: curr.name }),
  {}
);

// Función auxiliar para traducir en el TS si lo necesitas
export function getSpecialtyName(code: string): string {
  return SPECIALTY_MAP[code] || 'Especialidad Desconocida';
}
