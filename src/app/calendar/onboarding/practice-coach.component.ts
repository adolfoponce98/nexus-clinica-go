import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
@Component({
  selector: 'app-practice-coach',
  standalone: true,
  template: `@if (visible()) {
    <div
      class="coach-highlight"
      [style.left.px]="highlight().x"
      [style.top.px]="highlight().y"
      [style.width.px]="highlight().w"
      [style.height.px]="highlight().h"
      aria-hidden="true"
    ></div>
    <svg class="coach-arrow" aria-hidden="true">
      <defs>
        <marker
          id="practice-arrowhead"
          markerWidth="9"
          markerHeight="9"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8" />
        </marker>
      </defs>
      <path [attr.d]="arrow()" marker-end="url(#practice-arrowhead)" />
    </svg>
    <section
      #card
      class="coach-card"
      [style.left.px]="position().x"
      [style.top.px]="position().y"
      role="status"
      aria-live="polite"
    >
      <span class="coach-eyebrow">DA CLIC AQUÍ · GUÍA DE PRÁCTICA</span>
      <h4>{{ title }}</h4>
      <p>{{ description }}</p>
      @if (nextLabel) {
        <button type="button" (click)="continued.emit()" [disabled]="!canContinue">
          {{ nextLabel }} <span aria-hidden="true">→</span>
        </button>
      }
    </section>
  }`,
  styleUrl: './practice-coach.component.css',
})
export class PracticeCoachComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() target = '';
  @Input() fallback = '';
  @Input() title = '';
  @Input() description = '';
  @Input() nextLabel = '';
  @Input() canContinue = true;
  @Output() continued = new EventEmitter<void>();
  @ViewChild('card') card?: ElementRef<HTMLElement>;
  private host = inject(ElementRef<HTMLElement>);
  private root?: HTMLElement;
  private observer?: MutationObserver;
  private resize?: ResizeObserver;
  private frame = 0;
  private destroyed = false;
  private scrollNeeded = true;
  visible = signal(false);
  highlight = signal({ x: 0, y: 0, w: 0, h: 0 });
  position = signal({ x: 0, y: 0 });
  arrow = signal('');
  private changed = () => this.schedule();
  ngOnChanges(changes: any) {
    if (changes.target || changes.title) this.scrollNeeded = true;
    this.schedule();
  }
  ngAfterViewInit() {
    this.root = this.host.nativeElement.closest('app-calendar-onboarding') || undefined;
    const body = this.root?.querySelector('.practice-body');
    if (body) {
      this.observer = new MutationObserver(this.changed);
      this.observer.observe(body, { childList: true, subtree: true });
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resize = new ResizeObserver(this.changed);
      if (this.root) this.resize.observe(this.root);
    }
    window.addEventListener('resize', this.changed);
    document.addEventListener('scroll', this.changed, true);
    this.schedule();
  }
  private schedule() {
    if (this.destroyed || !this.root) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.update();
      this.frame = requestAnimationFrame(() => this.update());
    });
  }
  private update() {
    if (this.destroyed) return;
    const node = this.target
      ? this.root?.querySelector<HTMLElement>(this.target) ||
        this.root?.querySelector<HTMLElement>(this.fallback || this.target)
      : null;
    if (!node || !node.getClientRects().length) {
      this.visible.set(false);
      return;
    }
    if (this.scrollNeeded) {
      node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      this.scrollNeeded = false;
    }
    const r = node.getBoundingClientRect(),
      width = innerWidth,
      height = innerHeight;
    if (r.bottom < 0 || r.top > height) {
      this.visible.set(false);
      return;
    }
    this.visible.set(true);
    this.highlight.set({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 });
    const w = Math.min(305, width - 24),
      h = this.card?.nativeElement.offsetHeight || 180;
    let x: number,
      y: number,
      side = 'right';
    if (r.right + 26 + w < width - 12) {
      x = r.right + 26;
      y = r.top + r.height / 2 - h / 2;
    } else if (r.left - 26 - w >= 12) {
      side = 'left';
      x = r.left - 26 - w;
      y = r.top + r.height / 2 - h / 2;
    } else {
      side = r.top > h + 38 ? 'above' : 'below';
      x = r.left + r.width / 2 - w / 2;
      y = side === 'above' ? r.top - h - 30 : r.bottom + 30;
    }
    x = Math.max(12, Math.min(x, width - w - 12));
    y = Math.max(12, Math.min(y, height - h - 12));
    this.position.set({ x, y });
    let sx = x,
      sy = y + h / 2,
      tx = r.right + 5,
      ty = r.top + r.height / 2;
    if (side === 'left') {
      sx = x + w;
      tx = r.left - 5;
    } else if (side === 'above' || side === 'below') {
      sx = Math.max(x + 18, Math.min(r.left + r.width / 2, x + w - 18));
      sy = side === 'above' ? y + h : y;
      tx = Math.max(r.left + 4, Math.min(sx, r.right - 4));
      ty = side === 'above' ? r.top - 5 : r.bottom + 5;
    }
    this.arrow.set('M ' + sx + ' ' + sy + ' L ' + tx + ' ' + ty);
  }
  ngOnDestroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.resize?.disconnect();
    window.removeEventListener('resize', this.changed);
    document.removeEventListener('scroll', this.changed, true);
  }
}
