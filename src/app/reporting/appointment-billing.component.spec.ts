import { TestBed } from '@angular/core/testing';
import { AppointmentBillingComponent } from './appointment-billing.component';
import { ClinicApiService } from './clinic-api.service';
describe('Appointment cost and payment', () => {
  let component: AppointmentBillingComponent, api: any;
  beforeEach(() => {
    api = {
      branchId: () => 'office',
      post: vi.fn(async () => ({
        appointment: { date: '2026-11-17', time: '09:00', finalCost: 800, amountPaid: 200 },
      })),
      mergeAppointment: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ClinicApiService, useValue: api }] });
    component = TestBed.runInInjectionContext(() => new AppointmentBillingComponent());
    component.appointment = { date: '2026-11-17', time: '09:00', quotedCost: 500, amountPaid: 0 };
  });
  it('does not turn a catalog quote or assigned final cost into a payment', async () => {
    component.begin();
    expect(component.cost).toBe(500);
    expect(component.paid).toBe(0);
    component.cost = 800;
    component.paid = 200;
    await component.save();
    expect(api.post.mock.calls[0][1]).toMatchObject({
      operation: 'billing',
      finalCost: 800,
      amountPaid: 200,
    });
    expect(api.mergeAppointment).toHaveBeenCalledOnce();
  });
  it('keeps the editor open on error and rejects invalid monetary amounts before contacting the server', async () => {
    component.begin();
    component.cost = -1;
    await component.save();
    expect(api.post).not.toHaveBeenCalled();
    component.cost = 100;
    component.paid = 1.001;
    await component.save();
    expect(api.post).not.toHaveBeenCalled();
    component.paid = 0;
    api.post.mockRejectedValue(new Error('offline'));
    await component.save();
    expect(component.editing()).toBe(true);
    expect(component.error()).toBe('offline');
  });
});
