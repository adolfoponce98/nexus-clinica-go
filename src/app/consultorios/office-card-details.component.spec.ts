import { TestBed } from '@angular/core/testing';
import { OfficeCardDetailsComponent } from './office-card-details.component';
describe('Office WhatsApp summary', () => {
  it('shows the configured lead time and reminder zone rather than the calendar zone', () => {
    TestBed.configureTestingModule({ imports: [OfficeCardDetailsComponent] });
    const fixture = TestBed.createComponent(OfficeCardDetailsComponent);
    fixture.componentRef.setInput('office', {
      name: 'Consultorio Norte',
      appointmentReminders: { daysBefore: 3, timeZone: 'America/Tijuana' },
    });
    fixture.detectChanges();
    const summary = fixture.nativeElement.querySelector('.reminder-summary') as HTMLElement;
    expect(summary.textContent).toContain('3 días antes');
    expect(summary.textContent).toContain('8:00 a. m.');
    expect(summary.textContent).toContain('Tijuana');
    expect(summary.textContent).toContain('America/Tijuana');
  });
  it('shows the effective defaults for an office without reminder configuration', () => {
    const component = new OfficeCardDetailsComponent();
    component.office = { name: 'Centro' };
    expect(component.reminderSettings).toEqual({
      days: 1,
      zone: 'America/Mexico_City',
      zoneLabel: 'Ciudad de México',
      default: true,
    });
  });
});
