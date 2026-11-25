import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { PermissionDirective } from './permission.directive';
import { patientSummary } from '../patient/patient-summary';
@Component({
  standalone: true,
  imports: [PermissionDirective],
  template: `<input placeholder="Buscar" /><input appPermission="patients:write" /><button
      appPermission="patients:write"
      (click)="writes = writes + 1"
    >
      Guardar</button
    ><button appPermission="patients:delete" (click)="deletes = deletes + 1">Eliminar</button>`,
})
class Controls {
  writes = 0;
  deletes = 0;
}
describe('Employee capabilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('allows reading and searching, disables editing/deleting and reacts when permissions change', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession({
      email: 'employee@test.com',
      idDoctor: 'doctor@test.com',
      typeUser: 2,
      permissions: { patients: { read: true } },
      sessionToken: 'test',
    });
    const fixture = TestBed.createComponent(Controls);
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input'),
      buttons = fixture.nativeElement.querySelectorAll('button');
    expect(inputs[0].disabled).toBe(false);
    expect(inputs[1].disabled).toBe(true);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.writes).toBe(0);
    auth.saveSession({
      ...auth.getSession(),
      permissions: { patients: { read: true, write: true } },
    });
    fixture.detectChanges();
    expect(inputs[1].disabled).toBe(false);
    buttons[0].click();
    expect(fixture.componentInstance.writes).toBe(1);
    expect(buttons[1].disabled).toBe(true);
  });
  it('blocks direct routes and uses an authorized landing page', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession({
      email: 'employee@test.com',
      idDoctor: 'doctor@test.com',
      permissions: { patients: { read: true }, devices: { read: true } },
    });
    const permissions = TestBed.inject(PermissionService);
    expect(permissions.routeAllowed('/employes')).toBe(false);
    expect(permissions.routeAllowed('/pacientes')).toBe(true);
    expect(permissions.routeAllowed('/expediente/nuevo?idConsultorio=a')).toBe(false);
    expect(permissions.routeAllowed('/profile')).toBe(false);
    expect(permissions.routeAllowed('/dispositivos')).toBe(true);
    expect(permissions.firstRoute()).toBe('/pacientes');
  });
  it('requires explicit reading even when write or delete flags are present', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession({
      email: 'employee@test.com',
      idDoctor: 'doctor@test.com',
      permissions: {
        patients: { read: false, write: true, delete: true },
        devices: { read: true },
      },
    });
    const permissions = TestBed.inject(PermissionService);
    expect(permissions.can('patients')).toBe(false);
    expect(permissions.can('patients', 'write')).toBe(false);
    expect(permissions.can('patients', 'delete')).toBe(false);
    expect(permissions.routeAllowed('/pacientes')).toBe(false);
    expect(permissions.firstRoute()).toBe('/dispositivos');
    expect(permissions.routeAllowed('/profile')).toBe(false);
  });
  it('uses clinical notes for consultation counts, treats blank or dash contacts as missing, and invents no visit date', () => {
    const first = patientSummary({
      idPaciente: 'p1',
      contadorDeVisitas: 1,
      fichaDeIdentificacion: { nombreCompleto: 'Ana', telefono: ' - ', correo: '' },
    });
    expect(first.numeroVisitas).toBe(0);
    expect(first.esPrimeraVez).toBe(true);
    expect(first.ultimaVisita).toBe('');
    expect(first.telefono).toBe('Sin teléfono');
    expect(first.correo).toBe('Sin correo');
    const note = {
      expedienteId: 'p1',
      followUpId: 'one',
      createdAt: '2026-11-01T12:00:00Z',
      consultationReason: 'Rodilla',
    };
    const next = patientSummary({ 'follow-ups': [note, note] });
    expect(next.numeroVisitas).toBe(1);
    expect(next.esPrimeraVez).toBe(false);
    expect(next.ultimoMotivo).toBe('Rodilla');
  });
  it('lets an assistant enter Nexus IA without prescribing permissions and hides it for a receptionist', () => {
    const auth = TestBed.inject(AuthService),
      permissions = TestBed.inject(PermissionService);
    auth.saveSession({
      email: 'assistant@test.com',
      idDoctor: 'doctor@test.com',
      typeUser: 3,
      clinicalRole: 'administrative',
      permissions: { nexusI: { read: true, write: true } },
    });
    expect(permissions.routeAllowed('/recetas')).toBe(true);
    expect(permissions.firstRoute()).toBe('/recetas');
    expect(permissions.can('prescriptions')).toBe(false);
    auth.saveSession({
      ...auth.getSession(),
      permissions: { calendar: { read: true }, patients: { read: true } },
    });
    expect(permissions.routeAllowed('/recetas')).toBe(false);
    expect(permissions.firstRoute()).toBe('/calendario');
  });
});
