import {
  defaultEmployeePermissions,
  EMPLOYEE_PROFILES,
  CLINICAL_PERMISSION_MODULES,
} from './employee-permission-presets';
import { PERMISSION_MODULES } from '../auth/permissions';
describe('Employee profile presets', () => {
  it('offers exactly receptionist, medical assistant and administrator', () => {
    expect(EMPLOYEE_PROFILES.map((p) => p.value)).toEqual([
      'RECEPCIONISTA',
      'AYUDANTE',
      'ADMINISTRADOR',
    ]);
  });
  it('receptionist can access only calendar and patients by default', () => {
    const p = defaultEmployeePermissions('RECEPCIONISTA');
    expect(Object.keys(p).filter((key) => p[key].read)).toEqual(['calendar', 'patients']);
    expect(p['calendar']).toEqual({ read: true, write: true, delete: false });
    expect(p['patients'].delete).toBe(false);
  });
  it('assistant defaults include Nexus IA but do not open other menus', () => {
    const p = defaultEmployeePermissions('AYUDANTE');
    expect(Object.keys(p).filter((key) => p[key].read)).toEqual([
      'calendar',
      'patients',
      'consultorios',
      'services',
      'nexusI',
    ]);
    expect(Object.values(p).some((v) => v.delete)).toBe(false);
  });
  it('administrator has all administrative actions while clinical identity remains separate', () => {
    const p = defaultEmployeePermissions('ADMINISTRADOR');
    for (const key of Object.keys(PERMISSION_MODULES))
      expect(p[key]).toEqual(
        CLINICAL_PERMISSION_MODULES.includes(key)
          ? { read: false, write: false, delete: false }
          : { read: true, write: true, delete: true },
      );
  });
});
