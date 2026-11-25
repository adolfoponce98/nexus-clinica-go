import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-clinical-page-skeleton',
  standalone: true,
  template: ` <section
    class="clinical-skeleton"
    role="status"
    aria-live="polite"
    aria-busy="true"
    [attr.aria-label]="label"
    [class.consultation]="kind === 'consultation'"
  >
    <span class="sr-only">{{ label }}</span>
    <div aria-hidden="true">
      <div class="back-placeholder shimmer"></div>
      <div class="skeleton-card page-heading">
        <div class="heading-text">
          <i class="badge shimmer"></i><i class="title shimmer"></i><i class="subtitle shimmer"></i>
        </div>
        <div class="actions"><i class="shimmer"></i><i class="shimmer"></i></div>
      </div>
      <div class="contact-grid">
        @for (item of [1, 2, 3]; track item) {
          <div class="skeleton-card contact">
            <i class="icon shimmer"></i>
            <div><i class="label shimmer"></i><i class="value shimmer"></i></div>
          </div>
        }
      </div>
      <div class="skeleton-card tabs">
        @for (item of [1, 2, 3]; track item) {
          <i class="shimmer"></i>
        }
      </div>
      <div class="content-grid">
        <div class="main-content">
          <div class="skeleton-card content-card">
            <i class="section-title shimmer"></i>
            @if (kind === 'consultation') {
              <div class="summary shimmer"></div>
            } @else {
              @for (row of [1, 2, 3]; track row) {
                <div class="history-row">
                  <i class="icon shimmer"></i>
                  <div><i class="value shimmer"></i><i class="subtitle shimmer"></i></div>
                  <i class="date shimmer"></i>
                </div>
              }
            }
          </div>
          <div class="skeleton-card content-card">
            <i class="section-title shimmer"></i>
            <div class="attachments">
              @for (item of [1, 2, 3]; track item) {
                <i class="shimmer"></i>
              }
            </div>
          </div>
        </div>
        <aside class="skeleton-card side-content">
          <i class="section-title shimmer"></i>
          <div class="visual shimmer"></div>
          <i class="subtitle shimmer"></i><i class="subtitle short shimmer"></i>
        </aside>
      </div>
    </div>
  </section>`,
  styleUrl: './clinical-page-skeleton.component.css',
})
export class ClinicalPageSkeletonComponent {
  @Input() kind: 'record' | 'consultation' = 'record';
  @Input() label = 'Cargando expediente clínico…';
}
