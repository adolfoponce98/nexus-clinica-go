import { LucideAngularModule, MessageSquare, HeartPulse, Pill } from 'lucide-angular';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FollowupInputComponent } from './followup-input.component';
import { bmi } from './followup-utils';
@Component({
  selector: 'app-followup-soap',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, FollowupInputComponent],
  templateUrl: './followup-soap.component.html',
  styleUrls: ['./followup-ui.css', './followup-soap-layout.css'],
  host: { '[class.consultation-soap]': "section === 'consultation'" },
})
export class FollowupSoapComponent {
  readonly icons = { MessageSquare, HeartPulse, Pill };
  @Input({ required: true }) data: any;
  @Input() section: 'consultation' | 'vitals' = 'vitals';
  @Input() disabled = false;
  @Input() optionalVitals = false;
  @Output() changed = new EventEmitter<void>();
  bmi = bmi;
  common = [
    { key: 'chiefComplaint', label: 'Motivo de consulta', type: 'textarea' },
    { key: 'evolution', label: 'Evolución desde la última consulta', type: 'textarea' },
  ];
  vitals = [
    { key: 'weight', label: 'Peso · kg', type: 'number', min: 0.2, max: 700 },
    { key: 'heightCm', label: 'Talla · cm', type: 'number', min: 20, max: 260 },
    { key: 'systolic', label: 'Tensión sistólica · mmHg', type: 'number', min: 20, max: 350 },
    { key: 'diastolic', label: 'Tensión diastólica · mmHg', type: 'number', min: 10, max: 250 },
    { key: 'heartRate', label: 'Frecuencia cardiaca · lpm', type: 'number', min: 10, max: 300 },
    {
      key: 'respiratoryRate',
      label: 'Frecuencia respiratoria · rpm',
      type: 'number',
      min: 1,
      max: 120,
    },
    { key: 'temperature', label: 'Temperatura · °C', type: 'number', min: 25, max: 45 },
    {
      key: 'oxygenSaturation',
      label: 'Saturación de oxígeno · %',
      type: 'number',
      min: 0,
      max: 100,
    },
  ];
  prognosis = [
    {
      key: 'prognosisLife',
      label: 'Pronóstico para la vida',
      type: 'select',
      options: ['Bueno', 'Reservado', 'Malo'],
    },
    {
      key: 'prognosisFunction',
      label: 'Pronóstico para la función',
      type: 'select',
      options: ['Bueno', 'Reservado', 'Malo'],
    },
  ];
}
