import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Clock, Utensils, CalendarDays } from 'lucide-angular';
import { defaultOfficeHours, timeMinutes } from './office-hours';
@Component({
  selector: 'app-office-hours-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `<section class="hours-editor">
    <header>
      <span class="hours-icon"><lucide-icon [img]="icons.Clock" [size]="21" /></span>
      <div>
        <h3>Horario de atención</h3>
        <p>Un solo horario para todos los días seleccionados.</p>
      </div>
    </header>
    <div class="time-grid">
      <label
        >Apertura<input
          type="time"
          [(ngModel)]="opening"
          (ngModelChange)="emit()"
          [disabled]="disabled"
          aria-label="Hora de apertura" /></label
      ><label
        >Cierre<input
          type="time"
          [(ngModel)]="closing"
          (ngModelChange)="emit()"
          [disabled]="disabled"
          aria-label="Hora de cierre"
      /></label>
    </div>
    <div class="days-title">
      <lucide-icon [img]="icons.CalendarDays" [size]="16" /><strong>Días de atención</strong>
    </div>
    <div class="weekdays">
      @for (day of days; track day.id) {
        <label [class.selected]="selected.includes(day.id)"
          ><input
            type="checkbox"
            [checked]="selected.includes(day.id)"
            (change)="toggle(day.id, $any($event.target).checked)"
            [disabled]="disabled"
          /><span>{{ day.name }}</span></label
        >
      }
    </div>
    <label class="lunch-toggle"
      ><lucide-icon [img]="icons.Utensils" [size]="18" /><span
        ><strong>Horario de comida</strong
        ><small>Bloquea este periodo para no recibir citas.</small></span
      ><input type="checkbox" [(ngModel)]="hasLunch" (ngModelChange)="emit()" [disabled]="disabled"
    /></label>
    @if (hasLunch) {
      <div class="time-grid lunch">
        <label
          >Inicio de comida<input
            type="time"
            [(ngModel)]="lunchStart"
            (ngModelChange)="emit()"
            [disabled]="disabled"
            aria-label="Inicio de comida" /></label
        ><label
          >Fin de comida<input
            type="time"
            [(ngModel)]="lunchEnd"
            (ngModelChange)="emit()"
            [disabled]="disabled"
            aria-label="Fin de comida"
        /></label>
      </div>
    }
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (varied) {
      <p class="legacy-note">
        El horario guardado tiene diferencias entre días. Al modificar esta sección se aplicará el
        horario general a los días que marques.
      </p>
    }
    <p class="hours-summary">
      {{ selected.length }} días seleccionados · {{ opening }} a {{ closing
      }}{{ hasLunch ? ' · Comida: ' + lunchStart + ' a ' + lunchEnd : '' }}
    </p>
  </section>`,
  styles: [
    `
      .hours-editor {
        padding: var(--office-panel-padding, 24px);
        border: 1px solid var(--border-color);
        border-radius: 22px;
        background: var(--bg-secondary);
        color: var(--text-main);
      }
      header {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 20px;
      }
      .hours-icon {
        display: grid;
        place-items: center;
        width: 43px;
        height: 43px;
        border-radius: 14px;
        background: #3b82f612;
        color: #60a5fa;
      }
      h3 {
        font-weight: 800;
        font-size: 14px;
      }
      p,
      small {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.6;
      }
      .time-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .time-grid label {
        font-size: 10px;
        font-weight: 750;
        color: var(--text-muted);
      }
      input[type='time'] {
        display: block;
        width: 100%;
        padding: 13px;
        border-radius: 13px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-main);
        font-size: 13px;
        margin-top: 8px;
      }
      .days-title {
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 11px;
        margin: 22px 0 12px;
        color: var(--text-muted);
      }
      .weekdays {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
      }
      .weekdays label {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 10px 13px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        font-size: 11px;
        cursor: pointer;
        background: var(--bg-primary);
      }
      .weekdays .selected {
        background: #3b82f612;
        border-color: #3b82f655;
        color: var(--accent-color, #3b82f6);
      }
      input[type='checkbox'] {
        accent-color: #3b82f6;
        width: 14px;
        height: 14px;
      }
      .lunch-toggle {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 17px 0;
        margin-top: 16px;
        border-top: 1px solid var(--border-color);
        font-size: 12px;
        cursor: pointer;
      }
      .lunch-toggle > span {
        flex: 1;
      }
      .lunch-toggle small {
        display: block;
        font-size: 10px;
        margin-top: 4px;
      }
      .lunch-toggle > lucide-icon {
        color: #60a5fa;
      }
      .hours-summary {
        margin-top: 18px;
        padding: 12px;
        border-radius: 12px;
        background: #3b82f608;
        font-size: 10px;
      }
      .error {
        color: #ef6868;
        margin-top: 12px;
      }
      .legacy-note {
        padding: 12px;
        background: #f59e0b0c;
        color: #d99826;
        border-radius: 12px;
      }
      input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      @media (max-width: 500px) {
        .hours-editor {
          padding: var(--office-panel-padding, 20px);
        }
      }
    `,
  ],
})
export class OfficeHoursEditorComponent implements OnChanges {
  @Input() value: any;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();
  readonly icons = { Clock, Utensils, CalendarDays };
  readonly days = [
    { id: 1, name: 'Lun' },
    { id: 2, name: 'Mar' },
    { id: 3, name: 'Mié' },
    { id: 4, name: 'Jue' },
    { id: 5, name: 'Vie' },
    { id: 6, name: 'Sáb' },
    { id: 0, name: 'Dom' },
  ];
  selected: number[] = [];
  opening = '07:00';
  closing = '22:00';
  hasLunch = false;
  lunchStart = '14:00';
  lunchEnd = '15:00';
  varied = false;
  private last = '';
  ngOnChanges() {
    const value = this.value || defaultOfficeHours(),
      serialized = JSON.stringify(value);
    if (serialized === this.last) return;
    this.last = serialized;
    const opened = value.days.filter((day: any) => !day.closed);
    this.selected = opened.map((day: any) => day.day);
    const sample = opened[0]?.periods || [{ start: '07:00', end: '22:00' }];
    this.opening = sample[0]?.start || '07:00';
    this.closing = sample.at(-1)?.end || '22:00';
    this.hasLunch = sample.length > 1;
    if (this.hasLunch) {
      this.lunchStart = sample[0].end;
      this.lunchEnd = sample[1].start;
    }
    this.varied = opened.some((day: any) => JSON.stringify(day.periods) !== JSON.stringify(sample));
  }
  get error() {
    const a = timeMinutes(this.opening),
      b = this.closing === '24:00' ? 1440 : timeMinutes(this.closing);
    if (!this.selected.length) return 'Selecciona al menos un día de atención.';
    if (a === null || b === null || a >= b) return 'La apertura debe ser anterior al cierre.';
    if (this.hasLunch) {
      const x = timeMinutes(this.lunchStart),
        y = timeMinutes(this.lunchEnd);
      if (x === null || y === null || a >= x || x >= y || y >= b)
        return 'La comida debe iniciar y terminar dentro del horario de atención.';
    }
    return '';
  }
  toggle(day: number, checked: boolean) {
    this.selected = checked
      ? [...new Set([...this.selected, day])]
      : this.selected.filter((id) => id !== day);
    this.emit();
  }
  emit() {
    if (this.disabled) return;
    const periods = this.hasLunch
      ? [
          { start: this.opening, end: this.lunchStart },
          { start: this.lunchEnd, end: this.closing },
        ]
      : [{ start: this.opening, end: this.closing }];
    const value = {
      version: 1,
      timeZone: 'America/Mexico_City',
      days: Array.from({ length: 7 }, (_, day) => ({
        day,
        closed: !this.selected.includes(day),
        periods: this.selected.includes(day) ? structuredClone(periods) : [],
      })),
    };
    this.varied = false;
    this.last = JSON.stringify(value);
    this.valueChange.emit(value);
  }
}
