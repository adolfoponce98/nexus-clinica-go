import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CreationAccessService } from './creation-access.service';
import { PlanLimitDialogComponent } from './plan-limit-dialog.component';
import { BillingService } from './billing.service';
describe('Creation limits with an actionable plan dialog', () => {
  it('explains blocked creation once and leaves allowed creation untouched', () => {
    const closed = new Subject<void>(),
      ref = { afterClosed: () => closed };
    const dialogs = { open: vi.fn(() => ref) },
      billing = { canCreate: vi.fn(() => false) };
    TestBed.configureTestingModule({
      providers: [
        { provide: BillingService, useValue: billing },
        { provide: MatDialog, useValue: dialogs },
      ],
    });
    const access = TestBed.inject(CreationAccessService);
    expect(access.allow('patients')).toBe(false);
    expect(access.allow('patients')).toBe(false);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
    expect(dialogs.open.mock.calls[0]).toEqual([
      PlanLimitDialogComponent,
      expect.objectContaining({ data: { module: 'patients' } }),
    ]);
    closed.next();
    expect(access.allow('offices')).toBe(false);
    expect(dialogs.open).toHaveBeenCalledTimes(2);
    billing.canCreate.mockReturnValue(true);
    expect(access.allow('patients')).toBe(true);
    expect(dialogs.open).toHaveBeenCalledTimes(2);
  });
  it('shows the FREE count and navigates to plans only through its action', () => {
    const billing = {
        state: () => ({ usage: { patients: 5, offices: 1 } }),
        error: () => '',
        active: () => false,
      },
      ref = { close: vi.fn() },
      router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: BillingService, useValue: billing },
        { provide: MAT_DIALOG_DATA, useValue: { module: 'patients' } },
        { provide: MatDialogRef, useValue: ref },
        { provide: Router, useValue: router },
      ],
    });
    const fixture = TestBed.createComponent(PlanLimitDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('límite de tu capa gratuita');
    expect(fixture.componentInstance.used).toBe(5);
    expect(fixture.componentInstance.limit).toBe(5);
    expect(router.navigate).not.toHaveBeenCalled();
    fixture.componentInstance.viewPlans();
    expect(ref.close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/planes']);
  });
  it('does not describe an unavailable entitlement lookup as an exhausted free plan', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: BillingService,
          useValue: { state: () => null, error: () => '', active: () => false },
        },
        { provide: MAT_DIALOG_DATA, useValue: { module: 'offices' } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(PlanLimitDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos verificar tu plan');
    expect(fixture.nativeElement.textContent).not.toContain('límite de tu capa gratuita');
  });
  for (const [module, label, cap] of [
    ['employees', 'empleados', 1],
    ['services', 'servicios', 3],
  ] as const) {
    it('describes the correct ' + module + ' quota', () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: BillingService,
            useValue: {
              state: () => ({ usage: { employees: 1, services: 3 } }),
              error: () => '',
              active: () => false,
            },
          },
          { provide: MAT_DIALOG_DATA, useValue: { module } },
          { provide: MatDialogRef, useValue: { close: vi.fn() } },
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(PlanLimitDialogComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.limit).toBe(cap);
      expect(fixture.nativeElement.textContent).toContain(label);
      expect(fixture.nativeElement.textContent).toContain('límite de tu capa gratuita');
    });
  }
});
