import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-section-skeleton',
  standalone: true,
  template: `<section
    class="section-skeleton"
    [class.metric]="kind === 'metric'"
    [class.chart]="kind === 'chart'"
    [class.list]="kind === 'list'"
    role="status"
    [attr.aria-label]="label"
    aria-busy="true"
  >
    <span class="sr-only">{{ label }}</span>
    <div class="skeleton-heading" aria-hidden="true">
      <i></i>
      <div><span></span><span></span></div>
    </div>
    @if (kind === 'metric') {
      <div class="metric-value" aria-hidden="true"><b></b><span></span></div>
    } @else if (kind === 'chart') {
      <div class="chart-bars" aria-hidden="true">
        @for (height of [35, 55, 43, 75, 63, 88, 72, 95]; track $index) {
          <i [style.height.%]="height"></i>
        }
      </div>
    } @else {
      <div class="skeleton-rows" aria-hidden="true">
        @for (row of [1, 2, 3, 4]; track row) {
          <div><i></i><span></span><b></b></div>
        }
      </div>
    }
  </section>`,
  styleUrl: './section-skeleton.component.css',
})
export class SectionSkeletonComponent {
  @Input() kind: 'metric' | 'chart' | 'list' = 'list';
  @Input() label = 'Cargando información…';
}
