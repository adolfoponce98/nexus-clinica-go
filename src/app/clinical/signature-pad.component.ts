import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
@Component({
  selector: 'app-signature-pad',
  standalone: true,
  template: `<div class="space-y-2">
    <p class="text-xs">{{ label }} · firma digitalizada</p>
    <canvas
      #pad
      width="600"
      height="180"
      (pointerdown)="down($event)"
      (pointermove)="move($event)"
      (pointerup)="up()"
      (pointercancel)="up()"
      class="w-full h-36 bg-white border border-slate-300 rounded-xl touch-none"
      aria-label="Área para dibujar firma"
    ></canvas
    ><button type="button" (click)="clear()" [disabled]="disabled" class="text-xs text-blue-500">
      Borrar y repetir firma
    </button>
    @if (value) {
      <img [src]="value" alt="Firma digitalizada registrada" class="h-16 bg-white rounded-lg" />
    }
  </div>`,
})
export class SignaturePadComponent {
  @Input() value = '';
  @Input() disabled = false;
  @Input() label = 'Firma';
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('pad') pad!: ElementRef<HTMLCanvasElement>;
  private drawing = false;
  private strokeInk = false;
  private point(e: PointerEvent) {
    const c = this.pad.nativeElement,
      r = c.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * c.width) / r.width,
      ((e.clientY - r.top) * c.height) / r.height,
    ];
  }
  down(e: PointerEvent) {
    if (this.disabled) return;
    this.drawing = true;
    this.strokeInk = false;
    this.pad.nativeElement.setPointerCapture(e.pointerId);
    const c = this.pad.nativeElement.getContext('2d')!,
      [x, y] = this.point(e);
    c.strokeStyle = '#14283f';
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y);
  }
  move(e: PointerEvent) {
    if (!this.drawing) return;
    const c = this.pad.nativeElement.getContext('2d')!,
      [x, y] = this.point(e);
    c.lineTo(x, y);
    c.stroke();
    this.strokeInk = true;
  }
  up() {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.strokeInk) this.valueChange.emit(this.pad.nativeElement.toDataURL('image/png'));
  }
  clear() {
    if (this.disabled) return;
    const c = this.pad.nativeElement;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    this.valueChange.emit('');
  }
}
