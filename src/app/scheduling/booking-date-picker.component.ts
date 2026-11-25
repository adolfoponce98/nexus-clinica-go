import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import {
  LucideAngularModule,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { officeBookingSlots } from './office-hours';
import { parseLocalDate, localDateKey } from '../appointment-history/appointment-history.utils';
let pickerSequence = 0;
@Component({
  selector: 'app-booking-date-picker',
  standalone: true,
  imports: [CommonModule, OverlayModule, A11yModule, LucideAngularModule],
  templateUrl: './booking-date-picker.component.html',
  styleUrl: './booking-date-picker.component.css',
})
export class BookingDatePickerComponent {
  readonly panelId = 'booking-date-panel-' + ++pickerSequence;
  readonly icons = { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X };
  readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];
  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
  toggle() {
    if (this.disabled) return;
    if (this.opened) {
      this.close();
      return;
    }
    const selected = parseLocalDate(this.date) || new Date();
    this.month = new Date(selected.getFullYear(), selected.getMonth(), 1);
    this.opened = true;
  }
  close() {
    this.opened = false;
    this.trigger?.nativeElement.focus();
  }
  overlayKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }
  get dateLabel() {
    const selected = parseLocalDate(this.date);
    return selected
      ? selected.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Selecciona una fecha';
  }
  @Input() date = '';
  @Input() office: any;
  @Input() duration = 60;
  @Input() disabled = false;
  @Output() dateChange = new EventEmitter<string>();
  opened = false;
  month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  monthLabel() {
    return this.month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }
  shift(n: number) {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() + n, 1);
  }
  cells() {
    const y = this.month.getFullYear(),
      m = this.month.getMonth(),
      out: any[] = Array((this.month.getDay() + 6) % 7).fill(null);
    for (let n = 1; n <= new Date(y, m + 1, 0).getDate(); n++)
      out.push({ number: n, date: localDateKey(new Date(y, m, n)) });
    return out;
  }
  allowed(date: string) {
    return (
      date >= localDateKey() &&
      officeBookingSlots(this.office, date, this.duration).some(
        (t: string) => new Date(date + 'T' + t).getTime() > Date.now(),
      )
    );
  }
  choose(date: string) {
    if (this.disabled || !this.allowed(date)) return;
    this.dateChange.emit(date);
    this.close();
  }
}
