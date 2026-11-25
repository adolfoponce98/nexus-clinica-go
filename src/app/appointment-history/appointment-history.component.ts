import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import { AppointmentHistoryService } from './appointment-history.service';
import {
  appointmentStatus,
  DateRange,
  HistoryAppointment,
  isAttended,
  isValidRange,
  localDateKey,
  parseLocalDate,
  PeriodMode,
  rangeForDate,
  rangeLength,
  shiftDate,
  sortAppointments,
} from './appointment-history.utils';

@Component({
  selector: 'app-appointment-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './appointment-history.component.html',
})
export class AppointmentHistoryComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly history = inject(AppointmentHistoryService);
  private readonly subscriptions = new Subscription();
  private request?: AbortController;
  private requestNumber = 0;
  readonly icons = { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Search, RefreshCw };
  readonly statusLabel = appointmentStatus;
  readonly patientsOnly = signal(false);
  readonly mode = signal<PeriodMode>('day');
  readonly anchor = signal(localDateKey());
  readonly customStart = signal(localDateKey());
  readonly customEnd = signal(localDateKey());
  readonly range = signal<DateRange>(rangeForDate(localDateKey(), 'day'));
  readonly appointments = signal<HistoryAppointment[]>([]);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly validationError = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 20;
  readonly title = computed(() =>
    this.patientsOnly() ? 'Últimos pacientes atendidos' : 'Agenda de citas',
  );
  readonly rangeLabel = computed(() => {
    const range = this.range();
    return range.startDate === range.endDate
      ? this.formatDate(range.startDate)
      : `${this.formatDate(range.startDate)} — ${this.formatDate(range.endDate)}`;
  });
  readonly filtered = computed(() => {
    const range = this.range(),
      term = this.search().trim().toLocaleLowerCase('es');
    return sortAppointments(
      this.appointments().filter(
        (item) =>
          item.date >= range.startDate &&
          item.date <= range.endDate &&
          (!this.patientsOnly() || isAttended(item)) &&
          (!term ||
            `${item.patientName} ${item.reason} ${item.phone}`
              .toLocaleLowerCase('es')
              .includes(term)),
      ),
      this.patientsOnly(),
    );
  });
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );
  readonly visiblePage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  readonly groups = computed(() => {
    const start = (this.visiblePage() - 1) * this.pageSize;
    const groups = new Map<string, HistoryAppointment[]>();
    for (const item of this.filtered().slice(start, start + this.pageSize)) {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date)!.push(item);
    }
    return [...groups].map(([date, appointments]) => ({ date, appointments }));
  });

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.data.subscribe((data) => {
        this.patientsOnly.set(data['view'] === 'patients');
        this.goToToday();
      }),
    );
    this.subscriptions.add(
      this.auth.appointmentsUpdated$.subscribe(() => {
        void this.load();
      }),
    );
    this.subscriptions.add(
      this.auth.branchChanged$.subscribe(() => {
        void this.load();
      }),
    );
    this.subscriptions.add(
      this.auth.appointmentsUpdated$.subscribe(() => {
        void this.load();
      }),
    );
  }

  ngOnDestroy(): void {
    this.requestNumber++;
    this.request?.abort();
    this.subscriptions.unsubscribe();
  }

  formatDate(value: string): string {
    return (
      parseLocalDate(value)?.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) || value
    );
  }

  setMode(mode: PeriodMode): void {
    this.mode.set(mode);
    this.validationError.set('');
    if (mode === 'custom') {
      this.customStart.set(this.range().startDate);
      this.customEnd.set(this.range().endDate);
      return;
    }
    this.applyRange(rangeForDate(this.anchor(), mode));
  }

  setAnchor(value: string): void {
    if (!parseLocalDate(value)) {
      this.validationError.set('Selecciona una fecha válida.');
      return;
    }
    this.anchor.set(value);
    this.applyRange(rangeForDate(value, this.mode() === 'week' ? 'week' : 'day'));
  }

  applyCustom(): void {
    const range = { startDate: this.customStart(), endDate: this.customEnd() };
    if (!isValidRange(range)) {
      this.validationError.set(
        'Indica ambas fechas, con el inicio antes o igual al fin y un máximo de 366 días.',
      );
      return;
    }
    this.anchor.set(range.startDate);
    this.applyRange(range);
  }

  step(direction: number): void {
    if (this.mode() === 'custom') {
      const current = this.range(),
        days = rangeLength(current) * direction;
      const next = {
        startDate: shiftDate(current.startDate, days),
        endDate: shiftDate(current.endDate, days),
      };
      this.customStart.set(next.startDate);
      this.customEnd.set(next.endDate);
      this.anchor.set(next.startDate);
      this.applyRange(next);
    } else
      this.setAnchor(shiftDate(this.anchor(), this.mode() === 'week' ? 7 * direction : direction));
  }

  goToToday(): void {
    this.mode.set('day');
    this.anchor.set(localDateKey());
    this.applyRange(rangeForDate(this.anchor(), 'day'));
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }
  changePage(value: number): void {
    if (value >= 1 && value <= this.totalPages()) this.currentPage.set(value);
  }

  private applyRange(range: DateRange): void {
    this.validationError.set('');
    this.range.set(range);
    this.currentPage.set(1);
    void this.load();
  }

  async load(): Promise<void> {
    const number = ++this.requestNumber;
    this.request?.abort();
    const request = (this.request = new AbortController());
    const range = this.range();
    this.appointments.set(this.history.cached(range));
    this.error.set('');
    this.loading.set(true);
    try {
      const appointments = await this.history.load(range, request.signal);
      if (number === this.requestNumber) this.appointments.set(appointments);
    } catch (error) {
      if (number === this.requestNumber && !request.signal.aborted) {
        this.error.set(
          'No se pudo completar la consulta. Se muestran los registros locales disponibles; la lista puede estar incompleta. Usa Actualizar para reintentar.',
        );
      }
    } finally {
      if (number === this.requestNumber) this.loading.set(false);
    }
  }
}
