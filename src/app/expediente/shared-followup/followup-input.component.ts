import { LucideAngularModule } from 'lucide-angular';
import { followupFieldIcon } from './followup-icons';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-followup-input',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `<label class="field"
    ><span class="field-label"
      ><lucide-icon [img]="icon" [size]="15" aria-hidden="true" />{{ field.label }}</span
    >
    @if (field.type === 'textarea') {
      <textarea
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled"
        [ngModelOptions]="{ standalone: true }"
        rows="3"
        maxlength="10000"
      ></textarea>
    } @else if (field.type === 'select') {
      <select
        [ngModel]="value ?? ''"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled"
        [ngModelOptions]="{ standalone: true }"
      >
        <option value="">Sin registrar</option>
        @for (option of field.options; track option) {
          <option [value]="option">{{ option }}</option>
        }
      </select>
    } @else if (field.type === 'checkbox') {
      <select
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled"
        [ngModelOptions]="{ standalone: true }"
      >
        <option [ngValue]="null">Sin registrar</option>
        <option [ngValue]="true">Sí</option>
        <option [ngValue]="false">No</option>
      </select>
    } @else {
      <input
        [type]="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled"
        [ngModelOptions]="{ standalone: true }"
        [min]="field.min ?? null"
        [max]="field.max ?? null"
        step="any"
        maxlength="10000"
      />
    }
  </label>`,
  styleUrls: ['./followup-ui.css', './followup-input.component.css'],
})
export class FollowupInputComponent {
  get icon() {
    return followupFieldIcon(this.field);
  }
  @Input({ required: true }) field: any;
  @Input() value: any;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();
}
