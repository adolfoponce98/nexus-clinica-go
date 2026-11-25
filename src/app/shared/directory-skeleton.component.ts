import { Component, Input } from '@angular/core';
import { LucideAngularModule, LoaderCircle } from 'lucide-angular';
@Component({
  selector: 'app-directory-skeleton',
  standalone: true,
  imports: [LucideAngularModule],
  template: `<section
    class="directory-loader"
    role="status"
    aria-live="polite"
    [attr.aria-label]="label"
    aria-busy="true"
  >
    <div class="loader-heading">
      <span><lucide-icon [img]="loader" [size]="22" class="spin" /></span>
      <div>
        <h3>{{ label }}</h3>
        <p>Estamos preparando la información de tu consultorio…</p>
      </div>
    </div>
    <div
      class="skeleton-grid"
      [class.service-rows]="kind === 'services' || kind === 'patients'"
      [class.office-cards]="kind === 'offices'"
      aria-hidden="true"
    >
      @for (item of [1, 2, 3, 4]; track item) {
        <article class="skeleton-card">
          <div class="skeleton-top">
            <i></i>
            <div><span></span><span></span></div>
            <b></b>
          </div>
          <div class="skeleton-lines"><span></span><span></span></div>
          <footer><span></span><em></em></footer>
        </article>
      }
    </div>
  </section>`,
  styleUrl: './directory-skeleton.component.css',
})
export class DirectorySkeletonComponent {
  @Input() label = 'Cargando información…';
  @Input() kind: 'employees' | 'services' | 'patients' | 'offices' = 'employees';
  readonly loader = LoaderCircle;
}
