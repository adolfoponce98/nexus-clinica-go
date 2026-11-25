import { PERMISSION_MODULES, normalizePermissions } from '../auth/permissions';
export type EmployeeProfile = 'RECEPCIONISTA' | 'AYUDANTE' | 'ADMINISTRADOR';
export const EMPLOYEE_PROFILES = [
  {
    value: 'RECEPCIONISTA' as const,
    label: 'Recepcionista',
    description: 'Calendario y pacientes.',
  },
  {
    value: 'AYUDANTE' as const,
    label: 'Ayudante médico',
    description: 'Calendario, pacientes, consultorios, servicios y Nexus IA.',
  },
  {
    value: 'ADMINISTRADOR' as const,
    label: 'Administrador',
    description: 'Todos los menús administrativos del sistema.',
  },
];
export const CLINICAL_PERMISSION_MODULES = ['records', 'followUps', 'prescriptions', 'nursing'];
export function defaultEmployeePermissions(profile: EmployeeProfile) {
  const enabled =
    profile === 'RECEPCIONISTA'
      ? ['calendar', 'patients']
      : profile === 'AYUDANTE'
        ? ['calendar', 'patients', 'consultorios', 'services', 'nexusI']
        : Object.keys(PERMISSION_MODULES).filter(
            (key) => !CLINICAL_PERMISSION_MODULES.includes(key),
          );
  return normalizePermissions(
    Object.fromEntries(
      enabled.map((key) => [key, { read: true, write: true, delete: profile === 'ADMINISTRADOR' }]),
    ),
  );
}
