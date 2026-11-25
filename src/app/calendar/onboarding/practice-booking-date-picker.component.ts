import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingDatePickerComponent } from '../../scheduling/booking-date-picker.component';
@Component({
  selector: 'app-practice-booking-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../../scheduling/booking-date-picker.component.html',
})
export class PracticeBookingDatePickerComponent extends BookingDatePickerComponent {
  override month = new Date(2030, 5, 1);
  override allowed(date: string) {
    return (
      /^2030-06-\d{2}$/.test(date) && Number(date.slice(-2)) >= 1 && Number(date.slice(-2)) <= 30
    );
  }
}
