import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { officeBookingSlots } from './office-hours';
import { localDateKey } from '../appointment-history/appointment-history.utils';
@Component({
  selector: 'app-booking-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-date-picker.component.html',
})
export class BookingDatePickerComponent {
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
    if (!this.allowed(date)) return;
    this.dateChange.emit(date);
    this.opened = false;
  }
}
