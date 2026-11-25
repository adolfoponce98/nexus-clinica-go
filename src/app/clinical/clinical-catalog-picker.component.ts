import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
@Component({
  selector: 'app-clinical-catalog-picker',
  standalone: true,
  imports: [FormsModule],
  template: `<div class="space-y-2">
    <div class="flex gap-2">
      <input
        [(ngModel)]="query"
        [ngModelOptions]="{ standalone: true }"
        [disabled]="disabled || busy()"
        [attr.aria-label]="'Buscar ' + kind"
        [placeholder]="'Código o descripción ' + kind"
        class="flex-1 min-w-0 border rounded-xl p-3 text-xs"
        style="background:var(--bg-primary)"
        (keydown.enter)="$event.preventDefault(); search()"
      /><button
        type="button"
        (click)="search()"
        [disabled]="disabled || busy() || query.trim().length < 2"
        class="text-blue-500 text-xs"
      >
        {{ busy() ? 'Buscando…' : 'Buscar' }}
      </button>
    </div>
    @if (error()) {
      <p role="status" class="text-amber-500 text-xs">{{ error() }}</p>
    }
    <div class="max-h-60 overflow-y-auto space-y-1">
      @for (entry of entries(); track entry.code) {
        <button
          type="button"
          (click)="selected.emit(entry); entries.set([]); query = ''"
          [disabled]="disabled"
          class="text-left border rounded-xl p-3 w-full text-xs hover:border-blue-500"
        >
          {{ entry.code }} · {{ entry.description }}
          <span class="opacity-60">{{ entry.version }}</span>
        </button>
      }
    </div>
  </div>`,
})
export class ClinicalCatalogPickerComponent {
  @Input() kind = 'CIE10';
  @Input() disabled = false;
  @Output() selected = new EventEmitter<any>();
  private api = inject(ClinicApiService);
  query = '';
  entries = signal<any[]>([]);
  busy = signal(false);
  error = signal('');
  async search() {
    if (this.query.trim().length < 2 || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.post(API_URLS.CLINICAL_CATALOG_SEARCH, {
        kind: this.kind,
        query: this.query,
      });
      this.entries.set(result.entries);
      if (!result.entries.length)
        this.error.set('No hay coincidencias en la versión oficial cargada.');
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
}
