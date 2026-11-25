import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-calendar-skeleton',
  standalone: true,
  template: `<section
    class="calendar-skeleton"
    role="status"
    aria-busy="true"
    aria-label="Cargando calendario"
  >
    <span class="sr-only">Cargando consultorio y citas del calendario…</span>
    <div class="calendar-loading-caption"><i></i>Preparando tu agenda…</div>
    <div
      class="calendar-placeholders"
      [class.time-view]="view !== 'month'"
      [class.day-view]="view === 'day'"
      aria-hidden="true"
    >
      @for (day of view === 'day' ? [1] : [1, 2, 3, 4, 5, 6, 7]; track day) {
        <div class="column-label"><span></span></div>
      }
      @for (cell of cells; track cell) {
        <div class="calendar-placeholder">
          <b></b>
          @if (cell % 3 === 0) {
            <span></span><em></em>
          }
        </div>
      }
    </div>
  </section>`,
  styleUrl: './calendar-skeleton.component.css',
})
export class CalendarSkeletonComponent {
  @Input() view: 'month' | 'week' | 'day' = 'month';
  get cells() {
    return Array.from({ length: this.view === 'day' ? 8 : 35 }, (_, i) => i);
  }
}
