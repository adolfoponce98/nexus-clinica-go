import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-followup-odontogram',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './odontogram.component.html',
  styleUrls: ['./followup-ui.css', './specialty-widgets.css'],
})
export class FollowupOdontogramComponent {
  @Input() value: any[] = [];
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any[]>();
  dentition = 'Adulto';
  selected = '';
  surface = 'Vestibular';
  condition = 'Caries';
  surfaces = ['Vestibular', 'Lingual/Palatino', 'Mesial', 'Distal', 'Oclusal/Incisal'];
  conditions = ['Sano', 'Caries', 'Resina', 'Amalgama', 'Corona', 'Ausencia', 'Endodoncia'];
  get rows() {
    return this.dentition === 'Adulto'
      ? [
          [
            '18',
            '17',
            '16',
            '15',
            '14',
            '13',
            '12',
            '11',
            '21',
            '22',
            '23',
            '24',
            '25',
            '26',
            '27',
            '28',
          ],
          [
            '48',
            '47',
            '46',
            '45',
            '44',
            '43',
            '42',
            '41',
            '31',
            '32',
            '33',
            '34',
            '35',
            '36',
            '37',
            '38',
          ],
        ]
      : [
          ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'],
          ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'],
        ];
  }
  count(tooth: string) {
    return this.value.filter((v) => v.tooth === tooth).length;
  }
  apply() {
    if (!this.disabled && this.selected)
      this.valueChange.emit([
        ...this.value.filter((v) => v.tooth !== this.selected || v.surface !== this.surface),
        { tooth: this.selected, surface: this.surface, condition: this.condition },
      ]);
  }
  remove(index: number) {
    if (!this.disabled) this.valueChange.emit(this.value.filter((_, i) => i !== index));
  }
}
