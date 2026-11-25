import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
describe('Preferred employee office', () => {
  let auth: AuthService;
  const offices = [
    { idConsultorio: 'a', name: 'Norte' },
    { idConsultorio: 'b', name: 'Sur' },
  ];
  const employee = {
    email: 'ana@test.com',
    idDoctor: 'owner@test.com',
    idConsultorio: 'b',
    allowedOfficeIds: ['a', 'b'],
    typeUser: 2,
    sessionToken: 'access',
  };
  beforeEach(() => {
    localStorage.clear();
    auth = TestBed.inject(AuthService);
    auth.saveSession(employee);
  });
  it('selects the first assigned office instead of using the login-code office as a preference', () => {
    auth.initializeEmployeeOffice();
    expect(auth.getSucursal().idConsultorio).toBe('a');
    auth.saveAllBranches(offices);
    expect(auth.getSucursal()).toEqual(offices[0]);
  });
  it('preserves an explicit choice across refreshes, logout and another login on the same device', () => {
    auth.initializeEmployeeOffice();
    auth.saveAllBranches(offices);
    auth.saveSucursal(offices[1]);
    auth.saveAllBranches(offices);
    expect(auth.getSucursal()).toEqual(offices[1]);
    auth.clearSession();
    auth.saveSession(employee);
    auth.initializeEmployeeOffice();
    auth.saveAllBranches(offices);
    expect(auth.getSucursal()).toEqual(offices[1]);
  });
  it('falls back to the first authorized office when access to the chosen office is removed', () => {
    auth.saveSucursal(offices[1]);
    auth.clearSession();
    auth.saveSession({ ...employee, allowedOfficeIds: ['a'] });
    auth.initializeEmployeeOffice();
    auth.saveAllBranches([offices[0]]);
    expect(auth.getSucursal()).toEqual(offices[0]);
  });
  it('keeps selections separate for each employee and doctor', () => {
    auth.saveSucursal(offices[1]);
    auth.clearSession();
    auth.saveSession({ ...employee, email: 'otra@test.com' });
    auth.initializeEmployeeOffice();
    expect(auth.getSucursal().idConsultorio).toBe('a');
    auth.clearSession();
    auth.saveSession({ ...employee, idDoctor: 'another-owner@test.com' });
    auth.initializeEmployeeOffice();
    expect(auth.getSucursal().idConsultorio).toBe('a');
  });
  it('hydrates updated office details without publishing a repeated branch-change event', () => {
    auth.initializeEmployeeOffice();
    const events: string[] = [];
    const sub = auth.branchChanged$.subscribe((id) => events.push(id));
    auth.saveAllBranches(offices);
    expect(events).toEqual([]);
    expect(auth.getSucursal().name).toBe('Norte');
    auth.saveSucursal(offices[1]);
    expect(events).toEqual(['b']);
    sub.unsubscribe();
  });
});
