import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-clinical-read-value',
  standalone: true,
  template: `@if (!hasValue(value)) {
      <p>No registrado</p>
    } @else if (field?.columns && isArray(value)) {
      <div class="read-table">
        <table>
          <thead>
            <tr>
              @for (col of field.columns; track col.key) {
                <th>{{ col.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of value; track $index) {
              <tr>
                @for (col of field.columns; track col.key) {
                  <td>{{ format(row[col.key]) }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (isImage()) {
      <img class="read-image" [src]="value" [alt]="field?.label || 'Imagen clínica'" />
    } @else if (isArray(value)) {
      <ul>
        @for (item of value; track $index) {
          <li>
            @if (field?.type === 'scores') {
              <strong>Reactivo {{ $index + 1 }}:</strong>
            }
            {{ format(item) }}
          </li>
        }
      </ul>
    } @else {
      <p>{{ format(value) }}</p>
    }`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      p,
      ul {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-size: 12px;
        line-height: 1.85;
        color: var(--text-main, #334155);
      }
      ul {
        padding-left: 18px;
      }
      .read-table {
        overflow: auto;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        text-align: left;
      }
      th {
        background: #3b82f608;
        color: var(--text-muted, #64748b);
        font-weight: 650;
      }
      th,
      td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        min-width: 90px;
      }
      tr:last-child td {
        border-bottom: 0;
      }
      .read-image {
        display: block;
        max-width: 100%;
        max-height: 240px;
        object-fit: contain;
        border-radius: 12px;
      }
    `,
  ],
})
export class ClinicalReadValueComponent {
  @Input() value: any;
  @Input() field: any;
  isArray = Array.isArray;
  hasValue(value: any): boolean {
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim()))
      return false;
    if (Array.isArray(value)) return value.some((item) => this.hasValue(item));
    if (typeof value === 'object') return Object.values(value).some((item) => this.hasValue(item));
    return true;
  }
  isImage() {
    return (
      typeof this.value === 'string' &&
      /Photo|Signature|Image/.test(this.field?.key || '') &&
      /^(https?:|data:image\/)/.test(this.value)
    );
  }
  format(value: any): string {
    if (value === null || value === undefined || value === '') return 'No registrado';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (Array.isArray(value)) return value.map((v) => this.format(v)).join(' · ');
    if (typeof value === 'object')
      return Object.entries(value)
        .map(([k, v]) => k.replace(/([a-z])([A-Z])/g, '$1 $2') + ': ' + this.format(v))
        .join(' · ');
    return String(value);
  }
}
