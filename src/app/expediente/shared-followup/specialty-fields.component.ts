import { LucideAngularModule, Stethoscope } from 'lucide-angular';
import { followupSpecialtyIcons } from './followup-icons';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SPECIALTY_SCHEMAS } from './specialty-schemas';
import { FollowupFieldComponent } from './followup-field.component';
import { AnatomicalMapComponent } from './anatomical-map.component';
import { FollowupOdontogramComponent } from './odontogram.component';
import { PediatricGrowthComponent } from './pediatric-growth.component';
import { gestation, energyRequirements, ageYears, scaleScore } from './followup-utils';
@Component({
  selector: 'app-specialty-fields',
  standalone: true,
  imports: [
    LucideAngularModule,
    CommonModule,
    FormsModule,
    FollowupFieldComponent,
    AnatomicalMapComponent,
    FollowupOdontogramComponent,
    PediatricGrowthComponent,
  ],
  templateUrl: './specialty-fields.component.html',
  styleUrls: ['./followup-ui.css', './specialty-widgets.css'],
})
export class SpecialtyFieldsComponent {
  get specialtyIcon() {
    return followupSpecialtyIcons[this.code] || Stethoscope;
  }
  @Input() mode: 'all' | 'fields' | 'map' = 'all';
  @Input() code = 'GEN';
  @Input() value: any = {};
  @Input() core: any = {};
  @Input() patient: any = {};
  @Input() attachments: any[] = [];
  @Input() disabled = false;
  @Input() at = '';
  @Input() privateNotes = '';
  @Input() canSeePrivate = false;
  @Input() privateNotesAvailable = true;
  @Input() privateNotesBusy = false;
  @Output() retryPrivateNotes = new EventEmitter<void>();
  @Output() privateNotesChange = new EventEmitter<string>();
  @Output() changed = new EventEmitter<void>();
  get groups() {
    return this.schema.groups.filter(
      (group: any) => group.title !== 'Interrogatorio por aparatos y sistemas',
    );
  }
  get schema() {
    return SPECIALTY_SCHEMAS[this.code] || SPECIALTY_SCHEMAS['GEN'];
  }
  get birthDate() {
    return String(
      this.patient?.fichaDeIdentificacion?.fechaNacimiento ||
        this.patient?.header?.patient?.birthDate ||
        '',
    ).slice(0, 10);
  }
  get pregnancy() {
    return gestation(this.value.lastMenstruation, this.at ? new Date(this.at) : new Date());
  }
  get nutrition() {
    return energyRequirements(
      this.value,
      this.core.vitals,
      ageYears(this.birthDate, this.at ? new Date(this.at) : new Date()),
    );
  }
  get photos() {
    return [
      ...new Map<string, any>(
        this.attachments.filter((f) => f.type === 'image' && f.url).map((f) => [f.url, f]),
      ).values(),
    ];
  }
  get risk() {
    return (
      ['suicideRisk', 'selfHarmRisk', 'thirdPartyRisk'].some((k) =>
        ['Moderado', 'Alto'].includes(this.value[k]),
      ) || (this.value.phq9?.[8] ?? 0) > 0
    );
  }
  score = scaleScore;
  phqItems = [
    'Interés y disfrute',
    'Estado de ánimo depresivo',
    'Sueño',
    'Energía',
    'Alimentación y apetito',
    'Autovaloración',
    'Concentración',
    'Actividad y lentitud psicomotora',
    'Pensamientos de muerte o autolesión',
  ];
  gadItems = [
    'Nerviosismo',
    'Control de la preocupación',
    'Preocupación por diversos asuntos',
    'Relajación',
    'Inquietud',
    'Irritabilidad',
    'Temor anticipatorio',
  ];
  get macroTotal() {
    return (
      Number(this.value.proteinPercent || 0) +
      Number(this.value.carbohydratePercent || 0) +
      Number(this.value.fatPercent || 0)
    );
  }
}
