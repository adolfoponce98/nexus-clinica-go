import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-clinical-content-skeleton',
  standalone: true,
  template: `<section
    class="clinical-loader"
    role="status"
    aria-live="polite"
    aria-busy="true"
    [attr.aria-label]="label"
  >
    <div class="loading-caption">
      <i></i><span>{{ label }}</span>
    </div>
    @if (kind === 'templates') {
      <div class="gallery-skeleton" aria-hidden="true">
        <div class="template-placeholders">
          @for (item of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track item) {
            <article class="template-placeholder">
              <div class="mini-page"><i></i><b></b><span></span><span></span><em></em></div>
              <span></span><span></span>
            </article>
          }
        </div>
        <aside class="preview-placeholder">
          <div class="placeholder-heading">
            <i></i>
            <div><span></span><span></span></div>
          </div>
          <div class="paper-placeholder">
            <header>
              <i></i>
              <div><b></b><span></span></div>
            </header>
            <span></span><span></span>
            <div class="paper-lines">
              @for (line of [1, 2, 3, 4, 5, 6]; track line) {
                <span></span>
              }
            </div>
            <footer><b></b><i></i></footer>
          </div>
          <em></em>
        </aside>
      </div>
    } @else {
      <div class="asset-placeholder" [class.signature]="kind === 'signature'" aria-hidden="true">
        <div class="asset-preview"><i></i><span></span><span></span></div>
        <div class="asset-details">
          <b></b><span></span><span></span><span></span>
          <div><em></em><em></em></div>
          <span class="short"></span>
        </div>
      </div>
    }
  </section>`,
  styleUrl: './clinical-content-skeleton.component.css',
})
export class ClinicalContentSkeletonComponent {
  @Input() kind: 'signature' | 'logo' | 'templates' = 'signature';
  @Input() label = 'Cargando información…';
}
