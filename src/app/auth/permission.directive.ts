import { Directive, ElementRef, Renderer2, effect, inject, input, OnDestroy } from '@angular/core';
import { PermissionService } from './permission.service';
@Directive({ selector: '[appPermission]', standalone: true })
export class PermissionDirective implements OnDestroy {
  readonly permission = input.required<string>({ alias: 'appPermission' });
  readonly requestedDisabled = input(false, { alias: 'appPermissionDisabled' });
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly permissions = inject(PermissionService);
  private denied = false;
  private readonly block = (event: Event) => {
    if (this.denied) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  constructor() {
    for (const event of ['click', 'input', 'change', 'submit'])
      this.element.nativeElement.addEventListener(event, this.block, true);
    effect(() => {
      const [module, action = 'write'] = this.permission().split(':');
      this.denied = !this.permissions.can(module, action as 'read' | 'write' | 'delete');
      const disabled = this.denied || this.requestedDisabled();
      this.renderer.setProperty(this.element.nativeElement, 'disabled', disabled);
      this.renderer.setAttribute(this.element.nativeElement, 'aria-disabled', String(disabled));
      if (this.denied) this.renderer.addClass(this.element.nativeElement, 'permission-denied');
      else this.renderer.removeClass(this.element.nativeElement, 'permission-denied');
    });
  }
  ngOnDestroy() {
    for (const event of ['click', 'input', 'change', 'submit'])
      this.element.nativeElement.removeEventListener(event, this.block, true);
  }
}
