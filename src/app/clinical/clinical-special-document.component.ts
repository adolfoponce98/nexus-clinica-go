import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SignaturePadComponent } from './signature-pad.component';
@Component({
  selector: 'app-clinical-special-document',
  standalone: true,
  imports: [FormsModule, SignaturePadComponent],
  template: `<section class="space-y-3">
    <p class="text-xs">
      El establecimiento, paciente, fecha, médico y firma profesional se incorporarán al cierre.
      Revisa el documento completo antes de firmar.
    </p>
    @for (field of fields[kind] || []; track field.key) {
      <label class="block text-xs"
        >{{ field.label }} *<textarea
          [(ngModel)]="data[field.key]"
          (ngModelChange)="emit()"
          [ngModelOptions]="{ standalone: true }"
          [disabled]="disabled"
          class="block border rounded-xl p-3 w-full mt-1"
          style="background:var(--bg-primary);border-color:var(--border-color)"
        ></textarea>
      </label>
    }
    @if (kind === 'consent' || kind === 'voluntaryDischarge') {
      <app-signature-pad
        label="Paciente o representante legal"
        [(value)]="data.patientSignature"
        (valueChange)="emit()"
        [disabled]="disabled"
      /><app-signature-pad
        label="Primer testigo"
        [(value)]="data.witnessOneSignature"
        (valueChange)="emit()"
        [disabled]="disabled"
      /><app-signature-pad
        label="Segundo testigo"
        [(value)]="data.witnessTwoSignature"
        (valueChange)="emit()"
        [disabled]="disabled"
      />
    }
  </section>`,
})
export class ClinicalSpecialDocumentComponent implements OnChanges {
  @Input() kind = '';
  @Input() value: any;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();
  data: any = {};
  fields: any = {
    interconsultation: [
      { key: 'reason', label: 'Motivo de solicitud' },
      { key: 'presumptiveDiagnosis', label: 'Diagnóstico presuntivo' },
      { key: 'diagnosticCriteria', label: 'Respuesta: criterios diagnósticos' },
      { key: 'studyPlan', label: 'Respuesta: plan de estudios' },
      { key: 'suggestedTreatment', label: 'Respuesta: sugerencias diagnósticas y tratamiento' },
    ],
    referral: [
      { key: 'receivingEstablishment', label: 'Establecimiento receptor' },
      { key: 'reason', label: 'Motivo de envío' },
      { key: 'clinicalSummary', label: 'Resumen clínico' },
      { key: 'diagnosticImpression', label: 'Impresión diagnóstica' },
      { key: 'previousTreatment', label: 'Terapéutica empleada o indicar que no la hubo' },
    ],
    consent: [
      { key: 'title', label: 'Título del consentimiento' },
      { key: 'place', label: 'Lugar' },
      { key: 'authorizedAct', label: 'Acto autorizado' },
      { key: 'risks', label: 'Riesgos explicados' },
      { key: 'benefits', label: 'Beneficios explicados' },
      { key: 'contingencyAuthorization', label: 'Autorización para atender contingencias' },
      { key: 'patientOrRepresentative', label: 'Nombre del paciente o representante legal' },
      { key: 'relationship', label: 'Carácter del firmante: paciente o parentesco/representación' },
      { key: 'witnessOne', label: 'Nombre del primer testigo' },
      { key: 'witnessTwo', label: 'Nombre del segundo testigo' },
    ],
    voluntaryDischarge: [
      { key: 'requestedBy', label: 'Nombre de quien solicita el egreso' },
      { key: 'relationship', label: 'Relación con el paciente' },
      { key: 'reason', label: 'Motivo del egreso voluntario' },
      { key: 'clinicalSummary', label: 'Resumen clínico y medidas recomendadas' },
      { key: 'risksExplained', label: 'Consecuencias y riesgos explicados' },
      { key: 'witnessOne', label: 'Nombre del primer testigo' },
      { key: 'witnessTwo', label: 'Nombre del segundo testigo' },
    ],
    authorityNotice: [
      { key: 'receivingAuthority', label: 'Autoridad o Ministerio Público receptor' },
      { key: 'reason', label: 'Motivo de la notificación' },
      { key: 'clinicalSummary', label: 'Resumen clínico y hallazgos relevantes' },
      { key: 'placeOfEvents', label: 'Lugar de los hechos referidos' },
      { key: 'reportedBy', label: 'Persona que proporciona la información' },
    ],
  };
  ngOnChanges() {
    this.data = structuredClone(this.value || {});
  }
  emit() {
    this.valueChange.emit(structuredClone(this.data));
  }
}
