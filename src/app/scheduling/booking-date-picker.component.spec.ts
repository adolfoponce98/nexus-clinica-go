import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BookingDatePickerComponent } from './booking-date-picker.component';
import { localDateKey } from '../appointment-history/appointment-history.utils';
describe('Floating booking date picker', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [BookingDatePickerComponent] });
    const fixture = TestBed.createComponent(BookingDatePickerComponent);
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const date = localDateKey(future);
    fixture.componentRef.setInput('date', date);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('.date-trigger') as HTMLButtonElement;
    const overlays = TestBed.inject(OverlayContainer).getContainerElement();
    return { fixture, component: fixture.componentInstance, trigger, overlays, date };
  }
  it('renders the calendar outside the field, without inserting a panel into the form flow', () => {
    const { fixture, trigger, overlays } = setup();
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.date-popover')).toBeNull();
    expect(overlays.querySelector('.cdk-overlay-pane .date-popover')).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    fixture.destroy();
  });
  it('selects an allowed day and restores focus to the trigger', () => {
    const { fixture, component, trigger, overlays, date } = setup();
    const chosen = vi.fn();
    component.dateChange.subscribe(chosen);
    trigger.click();
    fixture.detectChanges();
    const button = overlays.querySelector(`[aria-label^="${date} "]`) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();
    expect(chosen).toHaveBeenCalledWith(date);
    expect(overlays.querySelector('.date-popover')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });
  it('closes on an outside click or Escape without changing the selected day', () => {
    const { fixture, component, trigger, overlays } = setup();
    const chosen = vi.fn();
    component.dateChange.subscribe(chosen);
    trigger.click();
    fixture.detectChanges();
    (overlays.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.opened).toBe(false);
    trigger.click();
    fixture.detectChanges();
    const close = overlays.querySelector(
      '[aria-label="Cerrar selector de fecha"]',
    ) as HTMLButtonElement;
    close.focus();
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(component.opened).toBe(false);
    expect(chosen).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('preserves unavailable-day restrictions and cannot open when disabled', () => {
    const { fixture, component, trigger } = setup();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const chosen = vi.fn();
    component.dateChange.subscribe(chosen);
    component.choose(localDateKey(yesterday));
    expect(chosen).not.toHaveBeenCalled();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    trigger.click();
    fixture.detectChanges();
    expect(component.opened).toBe(false);
    fixture.destroy();
  });
});
