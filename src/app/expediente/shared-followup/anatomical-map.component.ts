import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-anatomical-map',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './anatomical-map.component.html',
  styleUrls: ['./followup-ui.css', './specialty-widgets.css'],
})
export class AnatomicalMapComponent implements OnChanges {
  @Input() marks: any[] = [];
  @Input() dermatology = false;
  @Input() disabled = false;
  @Output() marksChange = new EventEmitter<any[]>();
  view = 'Anterior';
  kind = 'Dolor';
  zone = '';
  get kinds() {
    return this.dermatology
      ? ['Mácula', 'Pápula', 'Placa', 'Nódulo', 'Vesícula', 'Pústula', 'Úlcera', 'Escama', 'Otra']
      : ['Dolor', 'Fractura', 'Inflamación', 'Herida', 'Lesión', 'Irradiación'];
  }
  ngOnChanges() {
    if (!this.kinds.includes(this.kind)) this.kind = this.kinds[0];
  }
  mark(event: MouseEvent) {
    if (this.disabled) return;
    const svg = event.currentTarget as SVGSVGElement;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    this.marksChange.emit([
      ...this.marks,
      {
        view: this.view,
        kind: this.kind,
        zone: this.zone.trim(),
        x: Math.round((p.x / 320) * 1000) / 10,
        y: Math.round((p.y / 520) * 1000) / 10,
        notes: '',
      },
    ]);
  }
  remove(index: number) {
    if (!this.disabled) this.marksChange.emit(this.marks.filter((_, i) => i !== index));
  }
}
