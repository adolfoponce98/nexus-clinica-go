import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { PERMISSION_MODULES, normalizePermissions, routePermission } from './permissions';
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);
  can(module: string, action: 'read' | 'write' | 'delete' = 'read'): boolean {
    this.auth.sessionRevision();
    const session = this.auth.getSession();
    if (!session) return false;
    if (!session.idDoctor && ![2, 3].includes(Number(session.typeUser ?? session.role)))
      return true;
    if (
      ['records', 'followUps', 'prescriptions'].includes(module) &&
      session.clinicalRole !== 'physician'
    )
      return false;
    const normalized = normalizePermissions(session.permissions);
    if (
      module === 'nexusI' &&
      session.clinicalRole === 'physician' &&
      normalized['prescriptions'].read &&
      normalized['prescriptions'][action]
    )
      return true;
    const permission = normalized[module];
    return permission?.read === true && permission[action] === true;
  }
  firstRoute(): string {
    for (const [path, module] of [
      ['/home', 'home'],
      ['/calendario', 'calendar'],
      ['/pacientes', 'patients'],
      ['/consultorios', 'consultorios'],
      ['/services', 'services'],
      ['/employes', 'employees'],
      ['/profile', 'config'],
      ['/dispositivos', 'devices'],
      ['/recetas', 'nexusI'],
      ['/reportes/patients', 'reports'],
      ['/planes', 'plans'],
      ['/seguimiento', 'followUps'],
    ])
      if (this.can(module)) return path;
    return '/sin-acceso';
  }
  routeAllowed(path: string): boolean {
    const rule = routePermission(path);
    return !rule || this.can(rule.module, rule.action);
  }
}
