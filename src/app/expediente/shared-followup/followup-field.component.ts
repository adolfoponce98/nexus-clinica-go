import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FollowupInputComponent } from './followup-input.component';
import { LucideAngularModule, Plus, Trash2 } from 'lucide-angular';
@Component({
  selector: 'app-followup-field',
  standalone: true,
  imports: [FollowupInputComponent, LucideAngularModule],
  template: `@if (field.type === 'table') {
      <div class="repeatable">
        @if (field.key === 'vaccines') {
          <p class="muted">
            Selecciona una vacuna para registrar una dosis. Una dosis capturada no implica que el
            esquema esté completo.
          </p>
          <div class="vaccine-options">
            @for (v of field.columns[0].options; track v) {
              <button type="button" class="secondary" (click)="add(v)" [disabled]="disabled">
                {{ v }} · +
              </button>
            }
          </div>
        }
        <div class="section-title">
          <h4>{{ field.label }}</h4>
          <small>{{ (value || []).length }} registros</small>
        </div>
        @for (row of value || []; track row; let i = $index) {
          <div class="repeat-row">
            <div class="row-heading">
              <strong>Registro {{ i + 1 }}</strong
              ><button
                type="button"
                class="icon-button danger-text"
                (click)="remove(i)"
                [disabled]="disabled"
                [attr.aria-label]="'Quitar registro ' + (i + 1)"
              >
                <lucide-icon [img]="trash" class="w-4 h-4" />
              </button>
            </div>
            <div class="fields-grid">
              @for (col of field.columns; track col.key) {
                <app-followup-input
                  [field]="col"
                  [value]="row[col.key]"
                  (valueChange)="row[col.key] = $event; valueChange.emit(value)"
                  [disabled]="disabled"
                />
              }
            </div>
          </div>
        } @empty {
          <p class="muted">Sin registros capturados.</p>
        }
        <button
          type="button"
          class="secondary"
          (click)="add()"
          [disabled]="disabled || (value || []).length >= 300"
        >
          <lucide-icon [img]="plus" class="w-4 h-4" />Añadir registro
        </button>
      </div>
    } @else {
      <app-followup-input
        [field]="field"
        [value]="value"
        (valueChange)="valueChange.emit($event)"
        [disabled]="disabled"
      />
    }`,
  styleUrl: './followup-ui.css',
})
export class FollowupFieldComponent {
  @Input({ required: true }) field: any;
  @Input() value: any;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();
  plus = Plus;
  trash = Trash2;
  add(vaccine?: string) {
    if (this.disabled) return;
    const row = Object.fromEntries(
      this.field.columns.map((c: any) => [
        c.key,
        c.type === 'number' || c.type === 'checkbox' ? null : '',
      ]),
    );
    if (vaccine) row['vaccine'] = vaccine;
    this.valueChange.emit([...(this.value || []), row]);
  }
  remove(i: number) {
    if (!this.disabled) this.valueChange.emit(this.value.filter((_: any, n: number) => n !== i));
  }
}
