import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { permissionGuard } from '../app.routes';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { OfficeSyncService } from './office-sync.service';
describe('Progressive entry into Home and Calendar', () => {
  function setup() {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => (finish = resolve)),
      sync = { ensureOfficeContext: vi.fn(() => pending) },
      permissions = { routeAllowed: vi.fn(() => true), firstRoute: () => '/home' },
      router = { createUrlTree: vi.fn((commands: any) => ({ commands })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => true } },
        { provide: PermissionService, useValue: permissions },
        { provide: OfficeSyncService, useValue: sync },
        { provide: Router, useValue: router },
      ],
    });
    return { sync, permissions, finish };
  }
  for (const url of ['/home', '/calendario'])
    it(
      'enters ' + url + ' before office hydration without bypassing route permission checks',
      async () => {
        const { sync, permissions } = setup();
        const result = await TestBed.runInInjectionContext(() =>
          permissionGuard({} as any, { url } as any),
        );
        expect(result).toBe(true);
        expect(permissions.routeAllowed).toHaveBeenCalledWith(url);
        expect(sync.ensureOfficeContext).not.toHaveBeenCalled();
      },
    );
  it('preserves office hydration for other modules', async () => {
    const { sync, finish } = setup();
    const pending = TestBed.runInInjectionContext(() =>
      permissionGuard({} as any, { url: '/pacientes' } as any),
    );
    expect(sync.ensureOfficeContext).toHaveBeenCalledOnce();
    finish();
    expect(await pending).toBe(true);
  });
  it('redirects users without read permission before starting any office load', async () => {
    const { permissions, sync } = setup();
    permissions.routeAllowed.mockReturnValue(false);
    const result = await TestBed.runInInjectionContext(() =>
      permissionGuard({} as any, { url: '/calendario' } as any),
    );
    expect(result).toEqual({ commands: ['/home'] });
    expect(sync.ensureOfficeContext).not.toHaveBeenCalled();
  });
});
