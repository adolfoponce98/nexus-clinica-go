import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { CalendarOnboardingComponent } from './calendar-onboarding.component';
import { PracticeBookingDatePickerComponent } from './practice-booking-date-picker.component';
@Component({
  selector: 'app-calendar-practice-dialogs',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PracticeBookingDatePickerComponent],
  templateUrl: './calendar-practice-dialogs.component.html',
  styles: [
    `
      :host {
        display: block;
      }
      .simulation-stage {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 2px 0 12px;
      }
      .practice-confirmation {
        position: absolute;
        inset: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: #000b;
        backdrop-filter: blur(5px);
      }
      .appointment-booking-dialog {
        max-height: none;
        overflow: visible;
      }
      .detail-card {
        max-height: none;
      }
      button[role='option'] {
        background: transparent;
        border: 0;
      }
      button[role='option']:focus-visible {
        outline: 2px solid #60a5fa;
        outline-offset: -2px;
      }
    `,
  ],
})
export class CalendarPracticeDialogsComponent {
  @Input({ required: true }) p!: CalendarOnboardingComponent;
  get icons() {
    return this.p.icons;
  }
  get isAdvancedModal() {
    return this.p.view === 'month';
  }
  get patientForm() {
    return this.p.form;
  }
  get targetDate() {
    return '2030-06-' + String(this.p.date).padStart(2, '0');
  }
  set targetDate(value: string) {
    if (/^2030-06-\d{2}$/.test(value)) this.p.date = Number(value.slice(-2));
  }
  get targetHour() {
    return this.p.time;
  }
  get selectedModalHour() {
    return this.p.time;
  }
  get selectedDurationMinutes() {
    return this.p.duration;
  }
  set selectedDurationMinutes(value: number) {
    this.p.duration = Number(value);
  }
  get reasonUnknown() {
    return this.p.reasonUnknown;
  }
  get bookingOffice() {
    return undefined;
  }
  readonly isSaving = false;
  readonly isCancelling = false;
  bookingTimeError = () => '';
  cancelSuccessMessage = () => null;
  set showAppointmentModal(value: boolean) {
    if (!value) this.p.stage = 'calendar';
  }
  set showCancelConfirmModal(value: boolean) {
    this.p.stage = value ? 'cancel' : 'detail';
  }
  showPatientDropdown = false;
  showServiceDropdown = false;
  patientQuery = '';
  serviceQuery = '';
  private normalized(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  get filteredPatients() {
    const q = this.normalized(this.patientQuery);
    return this.p.patients
      .filter((v) => this.normalized(v.name + ' ' + v.phone + ' ' + v.email).includes(q))
      .map((v) => ({ id: v.id, nombre: v.name, telefono: v.phone, correo: v.email }));
  }
  get filteredServices() {
    const q = this.normalized(this.serviceQuery);
    return this.p.services
      .filter((v) => this.normalized(v.name).includes(q))
      .map((v) => ({ id: v.id, nombre: v.name, precioFinal: v.price }));
  }
  get filteredAvailableTimeSlots() {
    return this.p.slots
      .filter((v) => v.available)
      .map((v) => ({ ...v, label: this.formatTime(v.time) }));
  }
  formatTime(time: string) {
    const [h, m] = time.split(':').map(Number);
    return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  closeSuggestions() {
    this.showPatientDropdown = false;
    this.showServiceDropdown = false;
  }
  onPatientFocus() {
    this.patientQuery = '';
    this.showPatientDropdown = true;
    this.showServiceDropdown = false;
    this.p.patientSuggestions = true;
    this.p.bookingGuide = this.p.form.name.trim() ? 'patient-choice' : 'name';
  }
  onPatientInput(event: Event) {
    this.patientQuery = (event.target as HTMLInputElement).value;
    this.p.form.name = this.patientQuery;
    this.p.patientId = '';
    this.showPatientDropdown = true;
    this.p.patientSuggestions = this.filteredPatients.length > 0;
    this.p.bookingGuide = this.p.form.name.trim() ? 'patient-choice' : 'name';
  }
  selectPatient(patient: any) {
    const item = this.p.patients.find((v) => v.id === patient.id);
    if (item) this.p.selectPatient(item);
    this.showPatientDropdown = false;
  }
  onServiceFocus() {
    this.serviceQuery = '';
    this.showPatientDropdown = false;
    this.showServiceDropdown = !this.reasonUnknown;
    this.p.bookingGuide = 'reason';
  }
  onReasonInput(event: Event) {
    if (this.reasonUnknown) return;
    this.serviceQuery = (event.target as HTMLInputElement).value;
    this.p.form.reason = this.serviceQuery;
    this.p.serviceId = '';
    this.showServiceDropdown = true;
    this.p.serviceSuggestions = this.filteredServices.length > 0;
    this.p.bookingGuide = this.p.form.reason.trim() ? 'reason-choice' : 'reason';
  }
  selectServiceReason(service: any) {
    const item = this.p.services.find((v) => v.id === service.id);
    if (item) this.p.selectService(item);
    this.showServiceDropdown = false;
  }
  private previousReason = '';
  private previousService = '';
  toggleUnknownReason(value: boolean) {
    if (value) {
      this.previousReason = this.p.form.reason;
      this.previousService = this.p.serviceId;
      this.p.form.reason = 'Sin definir';
      this.p.serviceId = '';
    } else {
      this.p.form.reason = this.previousReason;
      this.p.serviceId = this.previousService;
    }
    this.p.reasonUnknown = value;
    this.showServiceDropdown = false;
    this.p.afterReason();
  }
  generateTimeSlots() {
    this.p.changeDuration();
    if (this.p.form.name.trim() && this.p.form.reason.trim()) this.p.afterReason();
  }
  selectModalHour(time: string) {
    this.showPatientDropdown = false;
    this.showServiceDropdown = false;
    this.p.selectTime(time);
    if (this.p.form.name.trim() && this.p.form.reason.trim())
      this.p.bookingGuide = this.p.time ? 'save' : 'time';
  }
  canBookSlot(_date: string, time: string) {
    return this.p.available(this.p.date, time, this.p.duration);
  }
  canSaveBookingTime() {
    return this.p.valid;
  }
  saveAppointment() {
    this.p.save();
  }
  selectedAppointment() {
    const a = this.p.appointment;
    return a
      ? {
          ...a,
          patientName: a.name,
          date: this.targetDate,
          endTime: this.p.endTime,
          durationLabel: a.duration === 60 ? '1 hr' : a.duration + ' min',
        }
      : null;
  }
  closeAppointmentDetailModal() {
    this.p.stage = 'saved';
  }
  promptCancelAppointment() {
    this.p.stage = 'cancel';
  }
  executeCancelAppointment() {
    this.p.cancel();
  }
  reassignAppointment() {
    this.p.stage = 'booking';
  }
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  cost: number | null = null;
  paid: number | null = 0;
  get appointment() {
    const a = this.selectedAppointment();
    return {
      ...a,
      amountPaid: this.savedPaid,
      finalCost: this.savedCost,
      quotedCost: this.p.services.find((s) => s.id === this.p.serviceId)?.price,
    };
  }
  private savedCost: number | null = null;
  private savedPaid = 0;
  begin() {
    this.cost = this.savedCost ?? this.appointment.quotedCost ?? null;
    this.paid = this.savedPaid;
    this.editing.set(true);
    this.error.set('');
    this.success.set(false);
  }
  save() {
    if (
      ![this.cost, this.paid].every(
        (v) =>
          v !== null &&
          Number.isFinite(Number(v)) &&
          Number(v) >= 0 &&
          Number(v) <= 100000000 &&
          Math.abs(Number(v) * 100 - Math.round(Number(v) * 100)) < 0.00001,
      )
    ) {
      this.error.set('Indica ambos montos válidos con hasta dos decimales.');
      return;
    }
    this.savedCost = Number(this.cost);
    this.savedPaid = Number(this.paid);
    this.editing.set(false);
    this.success.set(true);
  }
}
