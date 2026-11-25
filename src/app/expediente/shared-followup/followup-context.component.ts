import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  LucideAngularModule,
  ShieldAlert,
  History,
  FileText,
  HeartPulse,
  Stethoscope,
  ChevronDown,
} from 'lucide-angular';
@Component({
  selector: 'app-followup-context',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './followup-context.component.html',
  styleUrl: './followup-context.component.css',
})
export class FollowupContextComponent {
  @Input() allergies = '';
  @Input() criticalHistory = '';
  @Input() history: any = {};
  @Input() active = 'consultation';
  @Output() activeChange = new EventEmitter<string>();
  readonly icons = { ShieldAlert, History, ChevronDown };
  readonly tabs = [
    {
      id: 'consultation',
      label: 'Consulta',
      hint: 'Resumen, indicaciones y archivos',
      icon: FileText,
    },
    {
      id: 'clinical',
      label: 'Somatometría',
      hint: 'Somatometría y signos vitales',
      icon: HeartPulse,
    },
    {
      id: 'specialty',
      label: 'Valoración de especialidad',
      hint: 'Exploración y procedimientos',
      icon: Stethoscope,
    },
  ];
  get historyEntries() {
    return this.fields
      .map((field) => ({ ...field, value: String(this.history?.[field.key] || '').trim() }))
      .filter(
        (field) => field.value && !['-', 'No registrado', 'Sin registrar'].includes(field.value),
      );
  }
  readonly fields = [
    { key: 'familyHistory', label: 'Heredofamiliares' },
    { key: 'pathologicalHistory', label: 'Patológicos' },
    { key: 'nonPathologicalHistory', label: 'No patológicos' },
    { key: 'priorTreatments', label: 'Tratamientos previos' },
    { key: 'generalAppearance', label: 'Habitus exterior registrado' },
  ];
}
