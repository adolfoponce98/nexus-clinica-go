export const PERMISSION_MODULES: Record<string, string> = {
  home: 'Inicio',
  calendar: 'Calendario y citas',
  patients: 'Pacientes',
  records: 'Expedientes clínicos',
  followUps: 'Seguimientos clínicos',
  prescriptions: 'Recetas',
  consultorios: 'Consultorios',
  services: 'Servicios',
  plans: 'Planes',
  finances: 'Finanzas y cobros',
  reports: 'Reportes y exportaciones',
  employees: 'Empleados',
  config: 'Configuración profesional',
  devices: 'Dispositivos conectados',
  nexusI: 'Herramientas de IA',
  usersSystem: 'Usuarios del sistema',
  staff: 'Personal y tabuladores',
  nursing: 'Enfermería y signos vitales',
};
export type PermissionAction = { read: boolean; write: boolean; delete: boolean };
export function normalizePermissions(raw: any = {}): Record<string, PermissionAction> {
  return Object.fromEntries(
    Object.keys(PERMISSION_MODULES).map((key) => {
      const v = (raw || {})[key] || {};
      return [key, { read: v.read === true, write: v.write === true, delete: v.delete === true }];
    }),
  );
}
export function routePermission(
  path: string,
): { module: string; action: 'read' | 'write' | 'delete' } | null {
  path = path.split(/[?#]/)[0];
  const segment = path.replace(/^\//, '').split('/')[0];
  const map: Record<string, string> = {
    home: 'home',
    dashboard: 'home',
    calendario: 'calendar',
    notificaciones: 'calendar',
    citas: 'calendar',
    'pacientes-atendidos': 'calendar',
    pacientes: 'patients',
    expediente: 'records',
    seguimiento: 'followUps',
    recetas: 'nexusI',
    consultorios: 'consultorios',
    sucursales: 'consultorios',
    services: 'services',
    planes: 'plans',
    employes: 'employees',
    profile: 'config',
    dispositivos: 'devices',
    reportes: 'reports',
    usuarios_sistema: 'usersSystem',
    pagos: 'finances',
    gastos: 'finances',
    alumnas: 'patients',
    staff: 'staff',
  };
  const module = map[segment];
  if (path === '/expediente/nuevo') return { module: 'patients', action: 'write' };
  if (!module) return null;
  return {
    module:
      segment === 'expediente' && (path.includes('nuevaRevision') || path.includes('/detail/'))
        ? 'followUps'
        : module,
    action: /\/(nuevo|nuevaRevision)(\/|$)/.test(path) ? 'write' : 'read',
  };
}
