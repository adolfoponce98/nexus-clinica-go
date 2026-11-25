import { PracticeCoachComponent } from './practice-coach.component';
import { CalendarPracticeDialogsComponent } from './calendar-practice-dialogs.component';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import {
  LucideAngularModule,
  CalendarDays,
  Clock,
  User,
  Users,
  Search,
  Stethoscope,
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Trash2,
  RotateCcw,
  PartyPopper,
} from 'lucide-angular';
type CalendarView = 'month' | 'week' | 'day';
type Stage = 'intro' | 'calendar' | 'booking' | 'saved' | 'detail' | 'cancel' | 'finished';
interface PracticeAppointment {
  date: number;
  time: string;
  duration: number;
  name: string;
  phone: string;
  email: string;
  reason: string;
  patientId: string;
  serviceId: string;
  status: number;
}
@Component({
  selector: 'app-calendar-onboarding',
  standalone: true,
  imports: [
    PracticeCoachComponent,
    CalendarPracticeDialogsComponent,
    CommonModule,
    FormsModule,
    A11yModule,
    LucideAngularModule,
  ],
  templateUrl: './calendar-onboarding.component.html',
  styleUrls: ['./calendar-onboarding.component.css', './calendar-practice-forms.css'],
})
export class CalendarOnboardingComponent {
  @Input() initialView: CalendarView = 'month';
  @Output() dismissed = new EventEmitter<boolean>();
  readonly icons = {
    CalendarDays,
    Clock,
    User,
    Users,
    Search,
    Stethoscope,
    Phone,
    Mail,
    Building2,
    ShieldCheck,
    GraduationCap,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    X,
    Trash2,
    RotateCcw,
    PartyPopper,
  };
  @ViewChild(CalendarPracticeDialogsComponent) private dialogs?: CalendarPracticeDialogsComponent;
  @ViewChild('practiceBody') private body?: ElementRef<HTMLDivElement>;
  private currentStage: Stage = 'intro';
  get stage() {
    return this.currentStage;
  }
  set stage(value: Stage) {
    this.currentStage = value;
    if (this.body) this.body.nativeElement.scrollTop = 0;
  }
  bookingGuide:
    | 'name'
    | 'patient-choice'
    | 'phone'
    | 'email'
    | 'reason'
    | 'reason-choice'
    | 'time'
    | 'save' = 'name';
  patientSuggestions = false;
  serviceSuggestions = false;
  view: CalendarView = 'month';
  date = 17;
  time = '';
  duration = 60;
  picker: 'patient' | 'service' | null = null;
  query = '';
  patientId = '';
  serviceId = '';
  reasonUnknown = false;
  form = { name: '', phone: '', email: '', reason: '' };
  appointment: PracticeAppointment | null = null;
  readonly views: { id: CalendarView; label: string }[] = [
    { id: 'month', label: 'Mes' },
    { id: 'week', label: 'Semana' },
    { id: 'day', label: 'Día' },
  ];
  readonly weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  readonly days = Array.from({ length: 42 }, (_, i) => (i >= 6 && i < 36 ? i - 5 : 0));
  get week() {
    const day = this.appointment?.date ?? this.date;
    const offset = (new Date(2030, 5, day).getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => day - offset + i);
  }
  readonly hours = Array.from({ length: 9 }, (_, i) => (i + 9).toString().padStart(2, '0') + ':00');
  readonly patients = [
    {
      id: 'demo-ana',
      name: 'Ana Paciente Demo',
      phone: '000 000 0001',
      email: 'ana@example.invalid',
    },
    {
      id: 'demo-carlos',
      name: 'Carlos Paciente Demo',
      phone: '000 000 0002',
      email: 'carlos@example.invalid',
    },
    {
      id: 'demo-lucia',
      name: 'Lucía Paciente Demo',
      phone: '000 000 0003',
      email: 'lucia@example.invalid',
    },
  ];
  readonly services = [
    { id: 'demo-general', name: 'Consulta de valoración', price: 500 },
    { id: 'demo-followup', name: 'Consulta de seguimiento', price: 350 },
    { id: 'demo-review', name: 'Revisión de estudios', price: 400 },
  ];
  get coach() {
    const base = {
      target: '',
      fallback: '',
      title: '',
      description: '',
      nextLabel: '',
      canContinue: true,
    };
    if (this.stage === 'calendar')
      return {
        ...base,
        target: '[data-coach="calendar-slot"]',
        title: this.view === 'month' ? 'Selecciona un día' : 'Selecciona un horario libre',
        description:
          this.view === 'month'
            ? 'Da clic aquí, o en otro día de la agenda de ejemplo, para comenzar a registrar la cita.'
            : 'Da clic en este espacio libre para abrir el diálogo con la hora seleccionada.',
      };
    if (this.stage === 'saved')
      return {
        ...base,
        target: '[data-coach="appointment"]',
        title: 'Consulta la cita que creaste',
        description: 'Da clic aquí para ver los detalles de tu cita de prueba.',
      };
    if (this.stage === 'detail')
      return {
        ...base,
        target: '[data-coach="cancel"]',
        title: 'Ahora practica la cancelación',
        description:
          'Revisa los datos y da clic en «Cancelar Cita». Aún tendrás que confirmar la decisión.',
      };
    if (this.stage === 'cancel')
      return {
        ...base,
        target: '[data-coach="confirm-cancel"]',
        title: 'Confirma la cancelación',
        description:
          'Da clic aquí para cancelar únicamente esta cita ficticia y liberar su horario de prueba.',
      };
    if (this.stage !== 'booking') return base;
    const steps: any = {
      name: {
        target: '[data-coach="patient-name"]',
        title: '1. Nombre del paciente',
        description:
          'Da clic aquí y escribe un nombre ficticio. También puedes elegir un paciente en las sugerencias.',
      },
      'patient-choice': {
        target: this.patientSuggestions
          ? '[data-coach="patient-option"]'
          : '[data-coach="patient-name"]',
        fallback: '[data-coach="patient-name"]',
        title: 'Elige un paciente o conserva tu nombre',
        description:
          'Si eliges una sugerencia, teléfono y correo se autollenan. Si es un paciente nuevo, sigue con el nombre que escribiste.',
        nextLabel: 'Usar nombre escrito',
        canContinue: !!this.form.name.trim(),
      },
      phone: {
        target: '[data-coach="phone"]',
        title: '2. Teléfono de contacto',
        description:
          'Escribe un teléfono ficticio para practicar el contacto del paciente. Si no lo tienes, puedes continuar sin capturarlo.',
        nextLabel: this.form.phone.trim() ? 'Continuar' : 'Omitir teléfono',
      },
      email: {
        target: '[data-coach="email"]',
        title: '3. Correo electrónico · opcional',
        description:
          'Puedes escribir un correo de ejemplo o saltar este dato. No se enviará ningún mensaje.',
        nextLabel: this.form.email.trim() ? 'Continuar' : 'Omitir correo',
      },
      reason: {
        target: '[data-coach="reason"]',
        title: '4. Motivo de consulta',
        description:
          'Da clic aquí. Escribe el motivo o elige una recomendación del catálogo ficticio. También puedes usar «No lo sé aún».',
      },
      'reason-choice': {
        target: this.serviceSuggestions ? '[data-coach="service-option"]' : '[data-coach="reason"]',
        fallback: '[data-coach="reason"]',
        title: 'Selecciona o conserva el motivo',
        description:
          'Elige una sugerencia del catálogo, o continúa con el motivo que escribiste manualmente.',
        nextLabel: 'Usar motivo escrito',
        canContinue: !!this.form.reason.trim(),
      },
      time: {
        target: '[data-coach="time-slot"]',
        title: '5. Selecciona un horario',
        description:
          'Da clic en uno de los horarios libres. El horario elegido se pintará de azul.',
      },
      save: {
        target: '[data-coach="save"]',
        title: 'Guarda la cita de prueba',
        description:
          this.view === 'month'
            ? 'Da clic aquí para guardar la cita con el nombre, motivo y horario seleccionados.'
            : 'La hora ya quedó seleccionada en el calendario. Da clic aquí para guardar la cita de prueba.',
      },
    };
    return { ...base, ...steps[this.bookingGuide] };
  }
  continueGuide() {
    if (this.stage !== 'booking') return;
    this.dialogs?.closeSuggestions();
    if (this.bookingGuide === 'name' || this.bookingGuide === 'patient-choice') {
      if (!this.form.name.trim()) return;
      this.patientId = '';
      this.bookingGuide = 'phone';
    } else if (this.bookingGuide === 'phone') this.bookingGuide = 'email';
    else if (this.bookingGuide === 'email') this.bookingGuide = 'reason';
    else if (this.bookingGuide === 'reason' || this.bookingGuide === 'reason-choice')
      this.afterReason();
  }
  focusContact(step: 'phone' | 'email') {
    this.dialogs?.closeSuggestions();
    if (this.form.name.trim()) this.bookingGuide = step;
  }
  afterReason() {
    this.dialogs?.closeSuggestions();
    if (!this.form.name.trim()) {
      this.bookingGuide = 'name';
      return;
    }
    if (!this.form.reason.trim()) {
      this.bookingGuide = 'reason';
      return;
    }
    this.bookingGuide = this.view === 'month' && !this.time ? 'time' : 'save';
  }
  get step() {
    return this.stage === 'intro'
      ? 0
      : ['calendar', 'booking'].includes(this.stage)
        ? 1
        : this.stage === 'saved'
          ? 2
          : ['detail', 'cancel'].includes(this.stage)
            ? 3
            : 4;
  }
  get filteredPatients() {
    const q = this.searchText(this.query);
    return this.patients.filter((p) =>
      this.searchText([p.name, p.phone, p.email].join(' ')).includes(q),
    );
  }
  get filteredServices() {
    const q = this.searchText(this.query);
    return this.services.filter((s) => this.searchText(s.name).includes(q));
  }
  private searchText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  get slots() {
    return Array.from({ length: 18 }, (_, i) => {
      const min = 540 + i * 30;
      const time = this.clock(min);
      return { time, available: this.available(this.date, time, this.duration) };
    });
  }
  private minutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  private clock(minutes: number) {
    return (
      Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      (minutes % 60).toString().padStart(2, '0')
    );
  }
  available(day: number, time: string, duration = 60) {
    const start = this.minutes(time),
      end = start + Number(duration);
    const a = this.appointment;
    const occupied =
      !!a &&
      a.status !== 2 &&
      a.date === day &&
      start < this.minutes(a.time) + a.duration &&
      end > this.minutes(a.time);
    return (
      day >= 1 && day <= 30 && end <= 1080 && !(day === 17 && start < 660 && end > 600) && !occupied
    );
  }
  get valid() {
    return (
      !!this.form.name.trim() &&
      !!this.form.reason.trim() &&
      !!this.time &&
      this.available(this.date, this.time, this.duration)
    );
  }
  get endTime() {
    return this.time ? this.clock(this.minutes(this.time) + Number(this.duration)) : '';
  }
  dateLabel(day = this.date) {
    return new Date(2030, 5, day).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
  begin() {
    this.view = this.initialView;
    this.stage = 'calendar';
  }
  selectSlot(day: number, time = '') {
    if (this.stage !== 'calendar' || !day || (time && !this.available(day, time, 60))) return;
    this.date = day;
    this.time = time;
    this.duration = 60;
    this.bookingGuide = 'name';
    this.stage = 'booking';
  }
  selectTime(time: string) {
    if (this.available(this.date, time, this.duration)) this.time = this.time === time ? '' : time;
  }
  changeDuration() {
    if (this.time && !this.available(this.date, this.time, this.duration)) this.time = '';
  }
  openPicker(type: 'patient' | 'service') {
    this.query = '';
    this.picker = type;
  }
  selectPatient(p: (typeof this.patients)[number]) {
    this.patientId = p.id;
    this.form = { ...this.form, name: p.name, phone: p.phone, email: p.email };
    this.picker = null;
    this.bookingGuide = 'reason';
  }
  selectService(s: (typeof this.services)[number]) {
    this.serviceId = s.id;
    this.reasonUnknown = false;
    this.form.reason = s.name;
    this.picker = null;
    this.afterReason();
  }
  toggleUnknown() {
    this.serviceId = '';
    this.form.reason = this.reasonUnknown ? 'Sin definir' : '';
  }
  save() {
    if (this.stage !== 'booking' || !this.valid) return;
    this.appointment = {
      date: this.date,
      time: this.time,
      duration: Number(this.duration),
      ...this.form,
      name: this.form.name.trim(),
      reason: this.form.reason.trim(),
      patientId: this.patientId,
      serviceId: this.serviceId,
      status: 0,
    };
    this.stage = 'saved';
  }
  openDetail() {
    if (this.appointment && this.stage === 'saved') this.stage = 'detail';
  }
  cancel() {
    if (this.stage === 'cancel' && this.appointment) {
      this.appointment = { ...this.appointment, status: 2 };
      this.stage = 'finished';
    }
  }
  reset() {
    this.stage = 'intro';
    this.appointment = null;
    this.form = { name: '', phone: '', email: '', reason: '' };
    this.patientId = '';
    this.serviceId = '';
    this.reasonUnknown = false;
    this.time = '';
    this.picker = null;
    this.date = 17;
    this.duration = 60;
  }
  close() {
    this.dismissed.emit(this.stage === 'finished');
  }
  @HostListener('keydown.escape', ['$event']) escape(event: Event) {
    event.stopPropagation();
    if (this.picker) this.picker = null;
    else if (this.stage === 'booking') this.stage = 'calendar';
    else if (this.stage === 'cancel') this.stage = 'detail';
    else this.close();
  }
}
